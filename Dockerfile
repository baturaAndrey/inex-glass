# syntax=docker/dockerfile:1.7
#
# Inex Glass — Next.js 16 (standalone) + Payload 3 on Node 24.
#
# Targets:
#   runner — production image (staging and prod run the SAME image; config comes from env).
#   tools  — full node_modules + sources for seed/import scripts (`pnpm seed`, `scripts/*`).
#            Never deployed as a service; run ad hoc with `docker run --rm`.
#
# The build needs no database and no secrets: `src/lib/env.ts` substitutes inert
# placeholders for DATABASE_URL/PAYLOAD_SECRET while NEXT_PHASE=phase-production-build
# and skips production-only checks. Migrations are applied by Payload at runtime
# (`prodMigrations`) on the first `getPayload()` — triggered by the healthcheck.
#
# Runbook: docs/deploy.md

# Pinned by version AND index digest (multi-arch manifest list) for reproducible builds.
# Bump deliberately: `docker buildx imagetools inspect node:24.x.y-slim` → "Digest".
ARG NODE_IMAGE=node:24.22.0-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5
# Keep in sync with "packageManager" in package.json.
ARG PNPM_VERSION=11.1.3

# ─── base: Node + pnpm via corepack ─────────────────────────────────────────
FROM ${NODE_IMAGE} AS base
ARG PNPM_VERSION
# COREPACK_HOME outside /root so the non-root `node` user (tools target) can run pnpm
# without downloading it again.
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_HOME=/corepack \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable \
 && corepack prepare "pnpm@${PNPM_VERSION}" --activate \
 && chmod -R a+rX /corepack
WORKDIR /app

# ─── deps: install from the lockfile only (cached unless manifests change) ───
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir /pnpm/store

# ─── build: next build with standalone output ───────────────────────────────
FROM deps AS build
COPY . .
# NEXT_OUTPUT switches next.config.ts to `output: "standalone"`.
# No secrets or DATABASE_URL here on purpose (see header): ENV set in this stage would also
# leak into the `tools` target as fake "valid" defaults.
# RELEASE_SHA is deliberately NOT declared here: it is read at runtime only (/api/health/),
# so an unchanged source tree can reuse the cached build layer across commits.
ENV NEXT_OUTPUT=standalone
# `public/` is optional in the repo; the runner stage copies it unconditionally.
RUN mkdir -p public && pnpm build

# ─── tools: seed / import runner (not deployed) ─────────────────────────────
FROM build AS tools
ARG RELEASE_SHA=dev
ENV RELEASE_SHA=${RELEASE_SHA} \
    NODE_ENV=production \
    MEDIA_DIR=/data/media \
    UPLOADS_DIR=/data/lead-files
# Scripts only write to the data volumes; /app stays root-owned (read-only for `node`).
RUN mkdir -p /data/media /data/lead-files && chown -R node:node /data
USER node
CMD ["sh"]

# ─── runner: minimal production image ───────────────────────────────────────
FROM ${NODE_IMAGE} AS runner
# curl is used by the Docker/Swarm healthcheck (also configured in Dokploy).
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1 \
    MEDIA_DIR=/data/media \
    UPLOADS_DIR=/data/lead-files
# Runtime-only: reported by GET /api/health/ so CI smoke tests can verify the new release.
ARG RELEASE_SHA=dev
ENV RELEASE_SHA=${RELEASE_SHA}
WORKDIR /app
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
# Russian Trusted Root CA (public Минцифры root, committed in docker/certs/): required for TLS
# to platform-api2.max.ru (MAX Bot API). Node adds it to its bundled roots.
COPY --chown=node:node docker/certs/ ./certs/
ENV NODE_EXTRA_CA_CERTS=/app/certs/russian_trusted_root_ca.pem
# Named volumes inherit ownership from the image, so `node` can write to them.
# (Bind mounts owned by root would not — see docs/deploy.md, "Тома".)
# Only `.next/cache/images` goes on a volume; the data/ISR cache stays per container.
RUN mkdir -p /data/media /data/lead-files /app/.next/cache/images \
 && chown -R node:node /data /app/.next/cache
USER node
EXPOSE 3000
VOLUME ["/data/media", "/data/lead-files"]
# start-period covers Payload init + migrations on the first healthcheck call.
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD curl -fsS http://localhost:3000/api/health/ || exit 1
CMD ["node", "server.js"]
