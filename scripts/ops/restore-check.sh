#!/usr/bin/env bash
# Restore drill (task 41): proves that a database backup can actually be restored.
# Runbook: docs/deploy.md, «Restore-drill». Run monthly and before every release with a
# contract migration — on the VDS or on any machine with Docker.
#
#   scripts/ops/restore-check.sh <dump-file>
#
# Accepted inputs (detected by content, not by extension):
#   - pg_dump custom format (`pg_dump -Fc`, e.g. scripts/ops/predeploy-dump.sh output);
#   - the same gzip-compressed (Dokploy database backups: `<timestamp>.sql.gz` holding -Fc);
#   - plain SQL, optionally gzip-compressed.
#
# What it does: starts a throwaway `postgres:18` container (`docker run --rm`, data on tmpfs, no
# published port, random password), restores the dump into the database `restore_check`, prints
# row counts of `pages`, `leads` and `payload_migrations` plus the latest migration name, and
# removes the container (also on failure / Ctrl+C). Nothing touches a real database.
#
# Environment:
#   RESTORE_IMAGE       default postgres:18 (must match the prod major version)
#   RESTORE_TMPFS_SIZE  default 2g (tmpfs for the data directory)
#   RESTORE_TIMEOUT     default 60 (seconds to wait for the server to start)
#
# Exit codes: 0 — restored and all checked tables readable; 1 — any failure.

set -euo pipefail

readonly IMAGE="${RESTORE_IMAGE:-postgres:18}"
readonly TMPFS_SIZE="${RESTORE_TMPFS_SIZE:-2g}"
readonly START_TIMEOUT="${RESTORE_TIMEOUT:-60}"
readonly DB_NAME="restore_check"
readonly DB_USER="restore"
# Tables that must exist and be readable after a restore of the Inex Glass database.
readonly CHECK_TABLES=(pages leads payload_migrations)
# "PGDMP" — magic bytes of the pg_dump custom format; 1f8b — gzip.
readonly CUSTOM_MAGIC="PGDMP"
readonly GZIP_MAGIC_HEX="1f8b"

log() { printf '[restore-check] %s\n' "$*" >&2; }
die() { log "ОШИБКА: $*"; exit 1; }

[ "$#" -eq 1 ] || die "использование: $0 <dump-file>"
dump="$1"
if [ ! -f "$dump" ] || [ ! -r "$dump" ]; then die "файл не найден или недоступен: $dump"; fi
[ -s "$dump" ] || die "файл пуст: $dump"
command -v docker > /dev/null || die "docker не найден в PATH"
[[ "$START_TIMEOUT" =~ ^[1-9][0-9]*$ ]] || die "RESTORE_TIMEOUT должен быть целым > 0"

# Stream the (decompressed) dump to stdout.
is_gzip() { [ "$(head -c 2 "$dump" | od -An -tx1 | tr -d ' \n')" = "$GZIP_MAGIC_HEX" ]; }
read_dump() { if is_gzip; then gzip -dc -- "$dump"; else cat -- "$dump"; fi; }

# `|| true`: head closes the pipe early, which makes gzip/cat exit with SIGPIPE under pipefail.
magic="$( (read_dump || true) | head -c 5)"
if [ "$magic" = "$CUSTOM_MAGIC" ]; then format="custom"; else format="plain"; fi
log "файл: $dump ($(wc -c < "$dump" | tr -d ' ') байт, $(is_gzip && echo gzip || echo без сжатия), формат: $format)"

name="inex-restore-check-$$-$(date +%s)"
password="$(od -An -N24 -tx1 /dev/urandom | tr -d ' \n')"
cleanup() { docker rm -f "$name" > /dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM

log "старт временного контейнера $IMAGE ($name)"
# tmpfs on the parent of PGDATA (postgres:18 keeps data in /var/lib/postgresql/18/docker).
# max_locks_per_transaction: the schema has ~600 tables (see docs/deploy.md, Postgres settings).
docker run -d --rm --name "$name" \
  --tmpfs "/var/lib/postgresql:rw,size=${TMPFS_SIZE}" \
  -e POSTGRES_USER="$DB_USER" -e POSTGRES_PASSWORD="$password" -e POSTGRES_DB="$DB_NAME" \
  "$IMAGE" -c max_locks_per_transaction=256 > /dev/null \
  || die "не удалось запустить $IMAGE"

# The official image restarts the server once after init; wait for the final one.
ready=0
for _ in $(seq 1 "$START_TIMEOUT"); do
  if docker exec "$name" pg_isready -q -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" 2> /dev/null; then
    ready=1
    break
  fi
  sleep 1
done
[ "$ready" -eq 1 ] || die "Postgres не поднялся за ${START_TIMEOUT} с"

started="$(date +%s)"
if [ "$format" = "custom" ]; then
  # --no-owner/--no-acl: the prod role does not exist here. --exit-on-error: a partial restore
  # must fail the drill instead of printing warnings nobody reads.
  read_dump | docker exec -i "$name" pg_restore --no-owner --no-acl --exit-on-error \
    -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" \
    || die "pg_restore завершился с ошибкой — бэкап НЕ восстанавливается"
else
  # Plain SQL has no --no-owner switch: drop ownership/privilege statements that reference
  # prod roles absent here (the equivalent of pg_restore --no-owner --no-acl).
  read_dump \
    | sed -E -e '/^ALTER [A-Z ]+ .* OWNER TO /d' -e '/^(GRANT|REVOKE) /d' \
    | docker exec -i "$name" psql -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -U "$DB_USER" \
    -d "$DB_NAME" > /dev/null \
    || die "psql завершился с ошибкой — бэкап НЕ восстанавливается"
fi
log "восстановлено за $(($(date +%s) - started)) с"

query() {
  docker exec "$name" psql -X -tA -v ON_ERROR_STOP=1 -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" -c "$1"
}

failed=0
printf '%-22s %s\n' "таблица" "строк"
for table in "${CHECK_TABLES[@]}"; do
  if count="$(query "SELECT count(*) FROM \"$table\"" 2> /dev/null)"; then
    printf '%-22s %s\n' "$table" "$count"
  else
    printf '%-22s %s\n' "$table" "ОШИБКА (таблицы нет?)"
    failed=1
  fi
done
if latest="$(query "SELECT name FROM payload_migrations ORDER BY created_at DESC, id DESC LIMIT 1" 2> /dev/null)"; then
  printf '%-22s %s\n' "последняя миграция" "${latest:-—}"
fi
tables="$(query "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")"
printf '%-22s %s\n' "таблиц в public" "$tables"

[ "$failed" -eq 0 ] || die "не все проверочные таблицы читаются"
log "OK: бэкап восстанавливается (запишите результат в docs/runbooks/prod-launch-checklist.md)"
