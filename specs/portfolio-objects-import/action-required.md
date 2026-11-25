# Action Required: Portfolio objects import

Manual steps that must be completed by a human (or by the coordinator with explicit user approval).

## Before Implementation

- [x] **kie.ai key** — updated by the user in root `.env` as `KIE_AI_API_app_KEY` (verified 2026-11-25: balance 1362 credits).

## During Implementation

- [ ] **Approve kie.ai spend after the pilot** — task 06 (wave 2) writes the script and pilots Topaz vs Recraft on 5 covers
      (~$0.3), then stops; the user approves the model. The full run on all 43 covers (~430 credits Topaz, ~25 Recraft)
      happens in task 08 step 1, after the content is final.
- [ ] **Review content** (optional but recommended) — skim `scripts/import-inex/data/content/*.json` or the local site
      before the prod run: texts and typical thicknesses are guesses for the content manager to fix.

## After Implementation (production run — coordinator, only after the user says «go»)

- [ ] **Backups on the VDS** — `ssh -i ~/.ssh/id_ed25519 root@46.8.221.127 'bash -s -- manual-objects <PROD_PG_SERVICE>' < scripts/ops/predeploy-dump.sh`
      and `docker run --rm -v inex-glass-prod-media:/d -v /root:/b alpine tar czf /b/media-pre-objects.tgz -C /d .`
- [ ] **Commit + CI** — merge the scripts so the `ghcr.io/baturaandrey/inex-glass:sha-<commit>-tools` image contains them;
      deploy that commit first (the tools image must match the live app: `prodMigrations` runs on init).
- [ ] **Copy inputs to the VDS** — manifest, content, covers and source photos (`scripts/.import-tmp/photos`, `res/Объекты`)
      to e.g. `/root/objects-import/` (same relative layout), plus an empty writable dir `/root/objects-import/out`;
      `chown -R 1000:1000 /root/objects-import`, bind-mount into the tools container (inputs read-only is fine).
- [ ] **Run** — env from `docker exec <app> printenv` (DATABASE_URL, PAYLOAD_SECRET, FORM_HMAC_SECRET, ORDER_TOKEN_SECRET,
      SITE_URL, SITE_ENV, NODE_ENV=production; no JOBS_ENABLED) → `docker run --rm --env-file … --network dokploy-network
      -v inex-glass-prod-media:/data/media -v /root/objects-import:/import
      -v /root/objects-import/out:/app/scripts/.import-tmp <img>-tools pnpm tsx scripts/import-inex/merge-objects.ts
      --input=/import --out=/app/scripts/.import-tmp --dry-run`, then without `--dry-run` + `--i-know-this-is-prod`;
      delete the env file. The `/app` tree of the tools image is root-owned and read-only for the `node` user, so the
      writable `out` mount is mandatory (pattern of `docs/deploy.md` §9.3; media index, `slugs-objects.json` and the report
      land there). No `--force-dev` on prod. Old one-page drafts of `import.ts` do not exist on prod; `tk-kolco` (published
      by the user) is protected by the overwrite guard and only reported.
- [ ] **After the run** — `scripts/reindex-search.ts` if needed, `scripts/indexnow-all.ts` once, `pnpm smoke:prod`,
      give the regenerated redirect CSV (`docs/inex/12-migration-inex-su.fixed.csv`, produced in task 08 by `fix-csv.ts`) to the inex.su team after checking its diff.
- [ ] **Customer feedback** — if approved, budget the follow-up (small objects, upscale all photos).

> These steps are also referenced in the relevant task files.
