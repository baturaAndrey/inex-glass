#!/usr/bin/env bash
# Pre-deploy pg_dump of the production database (task 41). Runbook: docs/deploy.md, «Бэкапы».
#
# Runs ON THE VDS, streamed over SSH (nothing to install on the server):
#
#   ssh deploy@vds 'bash -s -- <RELEASE_TAG> <PG_SERVICE_NAME>' < scripts/ops/predeploy-dump.sh
#
# Arguments (positional, or the same-named environment variables; positional wins):
#   $1 RELEASE_TAG       release being deployed, e.g. v1.2.0   (part of the file name)
#   $2 PG_SERVICE_NAME   Swarm service name of the Dokploy Postgres (GitHub variable PROD_PG_SERVICE)
# Environment only (or the optional config file, see below):
#   BACKUP_DIR           default /var/backups/inex   (must be writable by the SSH user)
#   KEEP                 default 10                  (pre-*.dump files kept after rotation)
#   MIN_DUMP_BYTES       default 10240               (a smaller dump is treated as broken)
#   S3_RCLONE_REMOTE     optional, e.g. yandex:inex-glass-backups/inex-glass/predeploy
#                        (copy with rclone; `rclone config` done once on the VDS)
#   S3_AWS_URI + S3_ENDPOINT_URL
#                        optional alternative: s3://bucket/inex-glass/predeploy + endpoint for `aws`
#   PREDEPLOY_CONFIG     default ~/.inex-predeploy.env — KEY=VALUE lines sourced if present
#                        (SSH does not forward env vars, so server-side settings live there)
#
# Forced command: the key of GitHub Actions may be restricted in authorized_keys with
#   command="/usr/local/bin/inex-predeploy-dump",no-port-forwarding,no-pty,... ssh-ed25519 …
# (a copy of this script). sshd then ignores the requested command and passes it in
# SSH_ORIGINAL_COMMAND; the script accepts exactly `bash -s -- <tag> <service>` from there (each
# argument optionally in single quotes, as the workflow sends it), so the workflow command stays
# the same in both modes.
#
# Exit codes: 0 — dump written and verified; 2 — Postgres container not found; 1 — anything else.
# Any non-zero code stops the deploy. Credentials are read inside the Postgres container from
# its own environment (POSTGRES_USER / POSTGRES_DB), so no password appears in logs or argv.
# No sudo: the SSH user must be in the `docker` group. Idempotent, non-interactive.

set -euo pipefail
umask 077

readonly EXIT_NO_CONTAINER=2
readonly DUMP_PREFIX="pre-"
readonly DUMP_SUFFIX=".dump"
# Release tags and Swarm service names: conservative charset, no path or shell metacharacters.
readonly TAG_PATTERN='^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'
readonly SERVICE_PATTERN='^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$'
# Each argument bare or wrapped in single quotes (the workflow quotes them); captured without quotes.
readonly FORCED_COMMAND_PATTERN="^bash -s -- ('([A-Za-z0-9._-]+)'|([A-Za-z0-9._-]+)) ('([A-Za-z0-9._-]+)'|([A-Za-z0-9._-]+))$"

log() { printf '[predeploy-dump] %s\n' "$*" >&2; }
die() { log "ОШИБКА: $*"; exit 1; }

# ── Forced-command mode: take the arguments from SSH_ORIGINAL_COMMAND (validated) ─────────────
if [ "$#" -eq 0 ] && [ -n "${SSH_ORIGINAL_COMMAND:-}" ]; then
  [[ "$SSH_ORIGINAL_COMMAND" =~ $FORCED_COMMAND_PATTERN ]] \
    || die "недопустимая команда SSH (ожидается: bash -s -- <tag> <service>)"
  # Groups 2|3 — the tag (quoted|bare), 5|6 — the service; never evaluated by a shell.
  set -- "${BASH_REMATCH[2]}${BASH_REMATCH[3]}" "${BASH_REMATCH[5]}${BASH_REMATCH[6]}"
fi

# ── Optional server-side config (S3 settings, BACKUP_DIR, KEEP) ───────────────────────────────
config_file="${PREDEPLOY_CONFIG:-$HOME/.inex-predeploy.env}"
if [ -f "$config_file" ]; then
  # Refuse a config others can modify: it is sourced as shell code.
  if [ -n "$(find "$config_file" -perm /022 2>/dev/null)" ]; then
    die "$config_file доступен на запись группе/всем — исправьте: chmod 600 $config_file"
  fi
  # shellcheck disable=SC1090
  . "$config_file"
fi

RELEASE_TAG="${1:-${RELEASE_TAG:-}}"
PG_SERVICE_NAME="${2:-${PG_SERVICE_NAME:-}}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/inex}"
KEEP="${KEEP:-10}"
MIN_DUMP_BYTES="${MIN_DUMP_BYTES:-10240}"

[[ "$RELEASE_TAG" =~ $TAG_PATTERN ]] || die "RELEASE_TAG не задан или недопустим: '${RELEASE_TAG}'"
[[ "$PG_SERVICE_NAME" =~ $SERVICE_PATTERN ]] || die "PG_SERVICE_NAME не задан или недопустим: '${PG_SERVICE_NAME}'"
[[ "$KEEP" =~ ^[1-9][0-9]*$ ]] || die "KEEP должен быть целым ≥ 1: '${KEEP}'"
[[ "$MIN_DUMP_BYTES" =~ ^[0-9]+$ ]] || die "MIN_DUMP_BYTES должен быть целым: '${MIN_DUMP_BYTES}'"
command -v docker > /dev/null || die "docker не найден в PATH"

mkdir -p "$BACKUP_DIR" || die "не удалось создать $BACKUP_DIR"
[ -w "$BACKUP_DIR" ] || die "$BACKUP_DIR недоступен на запись пользователю $(id -un)"

# ── One run at a time (two tags pushed back to back) ──────────────────────────────────────────
if command -v flock > /dev/null; then
  exec 9> "$BACKUP_DIR/.predeploy.lock"
  flock -w 600 9 || die "другой pre-deploy дамп выполняется дольше 10 минут"
fi

# ── Postgres container of the Swarm service (first running task) ─────────────────────────────
cid="$(docker ps -q --filter "label=com.docker.swarm.service.name=${PG_SERVICE_NAME}" | head -n1)"
if [ -z "$cid" ]; then
  log "ОШИБКА: не найден запущенный контейнер Swarm-сервиса '${PG_SERVICE_NAME}'"
  log "Проверьте: docker service ls  (имя сервиса Postgres в Dokploy = GitHub variable PROD_PG_SERVICE)"
  exit "$EXIT_NO_CONTAINER"
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
final="${BACKUP_DIR}/${DUMP_PREFIX}${RELEASE_TAG}-${timestamp}${DUMP_SUFFIX}"
partial="${final}.partial"
# A failed or interrupted run must not leave a file that rotation or a restore could pick up.
trap 'rm -f "$partial"' EXIT

log "дамп ${PG_SERVICE_NAME} (контейнер ${cid:0:12}) → ${final}"
# Single quotes: $POSTGRES_USER / $POSTGRES_DB expand INSIDE the container. Custom format (-Fc)
# is compressed and restorable selectively with pg_restore.
docker exec "$cid" sh -c 'exec pg_dump -Fc -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$partial" \
  || die "pg_dump завершился с ошибкой"

size="$(wc -c < "$partial" | tr -d ' ')"
[ "$size" -gt "$MIN_DUMP_BYTES" ] \
  || die "дамп подозрительно мал: ${size} байт (порог ${MIN_DUMP_BYTES}) — БД пустая или pg_dump не сработал"

# The archive must be fully readable by pg_restore of the same server version. `--list` reads
# only the TOC and accepts a dump truncated mid-data; rendering the whole archive as a script
# into /dev/null decompresses every data block, so a truncated or corrupt archive fails here
# ("could not read from input file: end of file"). The size check above stays as a cheap guard
# against an empty database.
docker exec -i "$cid" pg_restore -f /dev/null < "$partial" \
  || die "pg_restore не может прочитать дамп целиком — архив повреждён или обрезан"

mv -f "$partial" "$final"
log "OK: ${final} (${size} байт)"

# ── Rotation: keep the newest KEEP pre-deploy dumps ───────────────────────────────────────────
# File names contain only [A-Za-z0-9._-] (validated tag + UTC timestamp), so ls output is safe.
# shellcheck disable=SC2012
ls -1t "$BACKUP_DIR"/"$DUMP_PREFIX"*"$DUMP_SUFFIX" 2> /dev/null | tail -n +"$((KEEP + 1))" | while read -r old; do
  rm -f -- "$old" && log "ротация: удалён $(basename "$old")"
done

# ── Optional off-site copy (S3 in RU). A missing client is a warning, never a failure. ────────
if [ -n "${S3_RCLONE_REMOTE:-}" ]; then
  if command -v rclone > /dev/null; then
    if rclone copy --no-traverse "$final" "$S3_RCLONE_REMOTE"; then
      log "S3: скопирован в ${S3_RCLONE_REMOTE}"
    else
      log "ПРЕДУПРЕЖДЕНИЕ: копирование в S3 (rclone) не удалось — локальный дамп сохранён"
    fi
  else
    log "ПРЕДУПРЕЖДЕНИЕ: S3_RCLONE_REMOTE задан, но rclone не установлен — копия в S3 пропущена"
  fi
elif [ -n "${S3_AWS_URI:-}" ]; then
  if command -v aws > /dev/null; then
    endpoint_args=()
    [ -n "${S3_ENDPOINT_URL:-}" ] && endpoint_args=(--endpoint-url "$S3_ENDPOINT_URL")
    if aws "${endpoint_args[@]}" s3 cp --only-show-errors "$final" "${S3_AWS_URI%/}/"; then
      log "S3: скопирован в ${S3_AWS_URI}"
    else
      log "ПРЕДУПРЕЖДЕНИЕ: копирование в S3 (aws) не удалось — локальный дамп сохранён"
    fi
  else
    log "ПРЕДУПРЕЖДЕНИЕ: S3_AWS_URI задан, но aws CLI не установлен — копия в S3 пропущена"
  fi
else
  log "ПРЕДУПРЕЖДЕНИЕ: S3 не настроен (S3_RCLONE_REMOTE / S3_AWS_URI) — дамп только на VDS"
fi

# Machine-readable last line for the workflow log / job summary.
printf 'DUMP_PATH=%s\nDUMP_BYTES=%s\n' "$final" "$size"
