#!/usr/bin/env bash
# Local production-like acceptance stand (task 42) — used while no real staging exists, and to
# run the indexing checks (`pnpm audit:seo`) that are not applicable on a noindex staging.
#
#   scripts/acceptance/local-stand.sh prepare   # fresh DB: migrate, seed --full, media, search
#   scripts/acceptance/local-stand.sh build     # pnpm build (one `next build` at a time!)
#   scripts/acceptance/local-stand.sh start     # next start -p $STAND_PORT (foreground)
#   scripts/acceptance/local-stand.sh drop      # drop the throwaway database
#
# Then run the acceptance against it:
#   BASE_URL=http://localhost:3100 scripts/acceptance/run-staging.sh
#
# Environment (all optional; test-only values, never real secrets):
#   STAND_DB_NAME     default inex_glass_w8_test (must end with _test)
#   STAND_PORT        default 3100
#   STAND_SITE_ENV    development | staging | production (default production)
#   STAGING_BASIC_AUTH  user:pass — with STAND_SITE_ENV=staging enables the basic auth of proxy.ts
#   MAIL_INTERCEPT_TO   staging mail interception mailbox (default with staging: intercept@inexglass.test)
#
# Mail goes to the local mailpit (docker compose: SMTP :1025, UI/API :8025). JOBS_ENABLED=true so
# the queued mail jobs (manager notification, order status) are actually sent.

set -euo pipefail

readonly ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly DB_NAME="${STAND_DB_NAME:-inex_glass_w8_test}"
readonly PORT="${STAND_PORT:-3100}"
readonly SITE_ENV_VALUE="${STAND_SITE_ENV:-production}"
readonly PG_BASE="postgresql://dev_user:dev_password@localhost:5432"

case "$DB_NAME" in
  *_test) ;;
  *) echo "local-stand: STAND_DB_NAME must end with _test (got $DB_NAME)" >&2; exit 2 ;;
esac

export DATABASE_URL="$PG_BASE/$DB_NAME"
export E2E_DATABASE_URL="$DATABASE_URL"
export PAYLOAD_SECRET="${PAYLOAD_SECRET:-stand-payload-secret-stand-payload-secret-0}"
export FORM_HMAC_SECRET="${FORM_HMAC_SECRET:-stand-form-hmac-secret-stand-form-hmac-00}"
export ORDER_TOKEN_SECRET="${ORDER_TOKEN_SECRET:-stand-order-token-secret-stand-order-tok0}"
export SITE_URL="http://localhost:$PORT"
export SITE_ENV="$SITE_ENV_VALUE"
export JOBS_ENABLED=true
export PAYLOAD_DB_PUSH=false
export SMTP_HOST=localhost
export SMTP_PORT=1025
export SMTP_FROM="Inex Glass <noreply@inexglass.test>"
export UPLOADS_DIR="$ROOT/.data/w8/lead-files"
export MEDIA_DIR="$ROOT/.data/w8/media"
export INDEXNOW_KEY="${INDEXNOW_KEY:-0123456789abcdef0123456789abcdef}"
if [[ "$SITE_ENV_VALUE" == "staging" ]]; then
  export MAIL_INTERCEPT_TO="${MAIL_INTERCEPT_TO:-intercept@inexglass.test}"
fi

cd "$ROOT"

prepare() {
  # Remember whether the types file had uncommitted changes, so only incidental regeneration is reverted.
  local types_clean=0
  git diff --quiet -- src/payload-types.ts 2>/dev/null && types_clean=1
  pnpm exec tsx scripts/test-db.ts reset
  mkdir -p "$UPLOADS_DIR" "$MEDIA_DIR"
  pnpm migrate --force-accept-warning
  pnpm seed --full
  # The server is not running yet: the cache is cleared below instead of revalidated.
  pnpm payload run scripts/attach-generated-media.ts -- --no-revalidate
  pnpm payload run scripts/reindex-search.ts || echo "local-stand: reindex finished (revalidation needs a running server)"
  rm -rf .next/cache/fetch-cache
  # Running Payload regenerates the types file; it is not part of the acceptance.
  if [ "$types_clean" = 1 ]; then git checkout -- src/payload-types.ts 2>/dev/null || true; fi
}

case "${1:-}" in
  prepare) prepare ;;
  build) pnpm build ;;
  start) rm -rf .next/cache/fetch-cache && exec pnpm exec next start -p "$PORT" ;;
  drop) pnpm exec tsx scripts/test-db.ts drop ;;
  *) sed -n '2,20p' "$0"; exit 2 ;;
esac
