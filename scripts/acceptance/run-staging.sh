#!/usr/bin/env bash
# Acceptance run against a deployed stand (task 42, «Порядок работ» п.2): one entry point for the
# quality gates, e2e (all URLs + acceptance specs), audits, Lighthouse and the smoke checks.
#
#   BASE_URL=https://staging.inexglass.ru STAGING_BASIC_AUTH=user:pass \
#     MAILPIT_URL=https://mail.staging.example scripts/acceptance/run-staging.sh
#
#   # local production-like stand (scripts/acceptance/local-stand.sh):
#   BASE_URL=http://localhost:3100 EXPECT_ENV=production MAILPIT_URL=http://localhost:8025 \
#     scripts/acceptance/run-staging.sh
#
# Environment:
#   BASE_URL            required — origin of the stand under test
#   STAGING_BASIC_AUTH  optional user:pass of the staging basic auth (never printed)
#   EXPECT_ENV          staging (default) | production | development — indexing expectations
#   MAILPIT_URL         optional Mailpit HTTP API; without it the mail checks of the acceptance
#                       specs are skipped and marked [ЧЕЛОВЕК] (manual check in the interceptor)
#   ACCEPTANCE_OUT      output dir (default scripts/acceptance/out/<timestamp>)
#   E2E_WORKERS         Playwright workers (default 2)
#   PW_PROJECTS         optional comma-separated Playwright projects (default: all three widths)
#   RUN_BUILD=1         also run `pnpm build` in step (a) (never on a machine serving the stand!)
#   AUDIT_CONTENT_CMS=1 content audit with the Local API (DATABASE_URL must be the stand's DB);
#                       default `--no-cms` (the stand's database is usually not reachable)
#   PERF_RUNS           Lighthouse runs per route (default 3, the median is reported)
#   PERF_LIGHTHOUSE_DOCKER_IMAGE  run Lighthouse in the Linux container (scripts/perf/lighthouse.Dockerfile)
#   PERF_OBJECT_SLUG / PERF_ORDER_TOKEN  data-dependent Lighthouse routes (see scripts/perf/routes.ts);
#                       set PERF_OBJECT_SLUG on staging: the object discovery fetch has no basic auth
#   PERF_ONLY           optional comma-separated Lighthouse route ids
#   SMOKE_BROWSER=1     smoke with --browser (cookie banner / Metrika after consent in Chromium)
#   SKIP_TEST SKIP_LINT SKIP_TYPECHECK SKIP_ALL_URLS SKIP_ACCEPTANCE SKIP_CONTENT SKIP_SEO
#   SKIP_LIGHTHOUSE SKIP_SMOKE   =1 skips that step (reported as SKIP)
#
# Every step logs to its own file in the output dir, records PASS / FAIL / SKIP and the run goes
# on; a summary table is printed at the end. Exit code 1 when any step FAILed, 2 on bad input.
# This script never deploys, tags or writes to the stand beyond what the specs create and clean
# up (TEST leads, throwaway users, fixture orders). Reports that the audits write into
# docs/reports/ are copied to the output dir and the tracked files are restored afterwards.
#
# Works in Git Bash on Windows and on Linux (bash 4+).

set -euo pipefail

readonly ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

log() { printf '[run-staging] %s\n' "$*" >&2; }
die() { log "ОШИБКА: $*"; exit 2; }

# ── Input ──────────────────────────────────────────────────────────────────────────────────────
[ -n "${BASE_URL:-}" ] || die "BASE_URL is required (e.g. https://staging.inexglass.ru)"
[[ "$BASE_URL" =~ ^https?://[^/[:space:]]+/?$ ]] || die "BASE_URL must be an origin: http(s)://host[:port]"
BASE_URL="${BASE_URL%/}"
readonly BASE_URL

readonly EXPECT_ENV="${EXPECT_ENV:-staging}"
case "$EXPECT_ENV" in
  staging | production | development) ;;
  *) die "EXPECT_ENV must be staging | production | development (got $EXPECT_ENV)" ;;
esac

if [ -n "${STAGING_BASIC_AUTH:-}" ] && [[ "$STAGING_BASIC_AUTH" != *:* ]]; then
  die "STAGING_BASIC_AUTH must be user:pass"
fi
if [ "$EXPECT_ENV" = "staging" ] && [ -z "${STAGING_BASIC_AUTH:-}" ]; then
  log "ВНИМАНИЕ: EXPECT_ENV=staging без STAGING_BASIC_AUTH — страницы staging ответят 401"
fi

readonly TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${ACCEPTANCE_OUT:-$ROOT/scripts/acceptance/out/$TIMESTAMP}"
mkdir -p "$OUT"
OUT="$(cd "$OUT" && pwd)"
readonly OUT
readonly WORKERS="${E2E_WORKERS:-2}"

PW_PROJECT_ARGS=()
if [ -n "${PW_PROJECTS:-}" ]; then
  IFS=',' read -r -a projects <<< "$PW_PROJECTS"
  for project in "${projects[@]}"; do PW_PROJECT_ARGS+=("--project=$project"); done
fi

cd "$ROOT"

# ── Step runner ────────────────────────────────────────────────────────────────────────────────
STEP_NAMES=()
STEP_RESULTS=()
STEP_SECONDS=()
FAILED=0

record() {
  STEP_NAMES+=("$1")
  STEP_RESULTS+=("$2")
  STEP_SECONDS+=("$3")
}

# run_step <id> <skip-var> <command...> — runs the command with output in $OUT/<id>.log.
run_step() {
  local id="$1" skip_var="$2"
  shift 2
  if [ "${!skip_var:-}" = "1" ]; then
    log "$id: SKIP ($skip_var=1)"
    record "$id" "SKIP" "-"
    return 0
  fi
  local logfile="$OUT/$id.log" started status
  started=$(date +%s)
  log "$id: запуск → $logfile"
  set +e
  "$@" > "$logfile" 2>&1
  status=$?
  set -e
  local elapsed=$(($(date +%s) - started))
  if [ "$status" -eq 0 ]; then
    log "$id: PASS (${elapsed}s)"
    record "$id" "PASS" "$elapsed"
  else
    log "$id: FAIL (код $status, ${elapsed}s) — см. $logfile"
    record "$id" "FAIL" "$elapsed"
    FAILED=1
  fi
}

# note_step <id> <text> — a step that is not run on this stand (manual / other environment).
note_step() {
  log "$1: $2"
  printf '%s\n' "$2" > "$OUT/$1.log"
  record "$1" "N/A" "-"
}

# Runs a command that rewrites a tracked report, keeps a copy in $OUT and restores the original.
with_report_restore() {
  local report="$1"
  shift
  local backup="$OUT/.backup-$(basename "$report")" status
  [ -f "$report" ] && cp "$report" "$backup"
  set +e
  "$@"
  status=$?
  set -e
  [ -f "$report" ] && cp "$report" "$OUT/$(basename "$report")"
  if [ -f "$backup" ]; then mv "$backup" "$report"; fi
  return "$status"
}

# ── Steps ──────────────────────────────────────────────────────────────────────────────────────
step_quality_build() { pnpm build; }

step_all_urls() {
  E2E_BASE_URL="$BASE_URL" \
    pnpm test:e2e e2e/all-urls.spec.ts --workers="$WORKERS" ${PW_PROJECT_ARGS[@]+"${PW_PROJECT_ARGS[@]}"} \
    --output="$OUT/playwright-all-urls"
}

step_acceptance() {
  E2E_BASE_URL="$BASE_URL" \
    ACCEPTANCE_EXPECT_ENV="$EXPECT_ENV" \
    ACCEPTANCE_SCREENSHOT_DIR="$OUT/screenshots" \
    pnpm test:e2e e2e/acceptance --workers="$WORKERS" ${PW_PROJECT_ARGS[@]+"${PW_PROJECT_ARGS[@]}"} \
    --output="$OUT/playwright-acceptance"
}

step_content() {
  local cms_flag="--no-cms"
  [ "${AUDIT_CONTENT_CMS:-}" = "1" ] && cms_flag=""
  # shellcheck disable=SC2086 # empty flag must vanish
  with_report_restore docs/reports/content-audit.md \
    pnpm audit:content --rendered "--base=$BASE_URL" $cms_flag
}

step_seo() {
  with_report_restore docs/reports/seo-audit.md \
    pnpm audit:seo "--base=$BASE_URL" --expect-env=production
}

step_lighthouse() {
  local status=0
  PERF_BASE_URL="$BASE_URL" \
    PERF_BASIC_AUTH="${STAGING_BASIC_AUTH:-}" \
    PERF_RUNS="${PERF_RUNS:-3}" \
    PERF_LABEL="acceptance-$TIMESTAMP" \
    pnpm perf:lighthouse || status=$?
  cp scripts/perf/out/lighthouse-acceptance-"$TIMESTAMP".{json,md} "$OUT/" 2>/dev/null || true
  # The extra-headers file holds the basic-auth credentials: never leave it behind.
  rm -f scripts/perf/out/extra-headers.json
  return "$status"
}

step_smoke() {
  SMOKE_BASE_URL="$BASE_URL" \
    SMOKE_EXPECT_ENV="$EXPECT_ENV" \
    SMOKE_BASIC_AUTH="${STAGING_BASIC_AUTH:-}" \
    pnpm smoke:prod ${SMOKE_BROWSER:+--browser}
}

log "стенд $BASE_URL, EXPECT_ENV=$EXPECT_ENV, вывод $OUT"
if [ -n "${MAILPIT_URL:-}" ]; then
  export MAILPIT_URL
  log "проверки писем: Mailpit $MAILPIT_URL"
else
  log "MAILPIT_URL не задан: проверки писем помечаются [ЧЕЛОВЕК] (смотреть ящик перехвата вручную)"
fi
# Playwright (playwright.config.ts → httpCredentials) and the audits read the same variable.
[ -n "${STAGING_BASIC_AUTH:-}" ] && export STAGING_BASIC_AUTH

# (a) quality gates of the release commit
run_step "a1-vitest" SKIP_TEST pnpm test
run_step "a2-lint" SKIP_LINT pnpm lint
run_step "a3-typecheck" SKIP_TYPECHECK pnpm typecheck
if [ "${RUN_BUILD:-}" = "1" ]; then
  run_step "a4-build" SKIP_BUILD step_quality_build
else
  note_step "a4-build" "не запускалась (RUN_BUILD=1 включает; сборка образа — в CI)"
fi

# (b) every registry URL; (c) acceptance scenarios
run_step "b-all-urls" SKIP_ALL_URLS step_all_urls
run_step "c-acceptance" SKIP_ACCEPTANCE step_acceptance

# (d) content audit over the rendered pages of the stand
run_step "d-audit-content" SKIP_CONTENT step_content

# (e) SEO audit — only meaningful on an indexable (production-like) build
if [ "$EXPECT_ENV" = "production" ]; then
  run_step "e-audit-seo" SKIP_SEO step_seo
else
  note_step "e-audit-seo" "[ЧЕЛОВЕК] pnpm audit:seo запускается против ЛОКАЛЬНОЙ production-подобной сборки (SITE_ENV=production, тот же снимок БД): STAND_SITE_ENV=production scripts/acceptance/local-stand.sh start, затем BASE_URL=http://localhost:3100 EXPECT_ENV=production $0 — на $EXPECT_ENV индексация закрыта по определению"
fi

# (f) Lighthouse mobile, median of PERF_RUNS
run_step "f-lighthouse" SKIP_LIGHTHOUSE step_lighthouse

# (g) smoke checks (inverted indexing checks outside production)
run_step "g-smoke" SKIP_SMOKE step_smoke

# ── Summary ────────────────────────────────────────────────────────────────────────────────────
{
  printf '# Acceptance run %s\n\nСтенд: %s, EXPECT_ENV=%s, MAILPIT_URL=%s\n\n' \
    "$TIMESTAMP" "$BASE_URL" "$EXPECT_ENV" "${MAILPIT_URL:-—}"
  printf '| Шаг | Результат | Время, с | Лог |\n|---|---|---|---|\n'
  for index in "${!STEP_NAMES[@]}"; do
    printf '| %s | %s | %s | %s.log |\n' \
      "${STEP_NAMES[$index]}" "${STEP_RESULTS[$index]}" "${STEP_SECONDS[$index]}" "${STEP_NAMES[$index]}"
  done
} > "$OUT/summary.md"

printf '\n%-18s %-6s %s\n' "STEP" "RESULT" "SECONDS" >&2
for index in "${!STEP_NAMES[@]}"; do
  printf '%-18s %-6s %s\n' "${STEP_NAMES[$index]}" "${STEP_RESULTS[$index]}" "${STEP_SECONDS[$index]}" >&2
done
log "сводка: $OUT/summary.md"

exit "$FAILED"
