# Session 08 — Cutover, Compliance & Ops

> Part of the PreEmptly API final plan. See `00-README-index.md`. **Depends on:** 05 (all modules ported), 06 (CI green).
> Final session: switch clients over, retire legacy, and land the launch-readiness items.

## Goal

Make `apps/api-core` the live backend, delete the legacy apps, and complete the operational + compliance hardening needed for a public Philippines MVP.

## Tasks

### Cutover
- [ ] **Data stance (GAP-01) — pre-launch, no backfill.** Legacy data is throwaway: no rows are migrated into `asset`/`service_request`. Confirm no live pilot/production data has appeared since 2026-07-19; if it has, **stop — GAP-01 reopens** and a backfill + reconciliation plan is required before cutover.
- [ ] Point the web dashboard to `api-core` via `NEXT_PUBLIC_API_URL` (env-switchable — no code change).
- [ ] Point mobile to `api-core` — **refactor the hardcoded base URL** in `api_constants.dart` to `String.fromEnvironment('API_BASE_URL', …)` / `--dart-define` (see backend-switching reference).
- [ ] Verify the clients against the new API end-to-end — mobile consumer + web retailer. *(Rider client surface is undecided — tracked as **GAP-14**, to be settled in the module/expansion phase; add rider verification here once decided.)*
- [ ] **Offline sync end-to-end (GAP-02, `offline-sync-contract.md`):** place an order offline → reconnect → it syncs **exactly once** (idempotent), local `PENDING_SMS` reconciles to the API order; a device offline past the token lifetime re-auths via OTP and still drains its queue.
- [ ] Keep legacy hot for a short **dual-run rollback window** (re-point clients back on failure — code-only, no data restore needed) before deletion.
- [ ] **Delete `apps/api` (NestJS) and `apps/api-elysia`** once parity is confirmed, and **drop the now-unused legacy tables** (`Tank`/`Order`/`RefillLog`/…) from the shared schema in a dedicated migration.

### API lifecycle
- [ ] **API version gate — set the policy value (GAP-04):** `/v1` and the version-gate **seam** already exist from session 01 (no route retrofit). Here, **set the minimum-supported-app-version floor** (mobile can't be force-updated instantly) and confirm mobile/web base URLs point at the `/v1` base.

### Edge & secrets
- [ ] **Cloudflare** in front — WAF/DDoS/bot mitigation + **geo-restrict to PH** (Phase 1 is +63 only).
- [ ] **Secrets management** for prod — Doppler/Infisical/Vault/KMS; confirm nothing sensitive in code/repo; rotate the JWKS signing keys.

### Compliance / PII (PH Data Privacy Act, RA 10173)
- [ ] Consent capture at onboarding; documented data-retention policy.
- [ ] **Data export & erase** endpoints — **erasure model = anonymize-now-purge-later (GAP-06, `data-privacy-erasure-retention.md`)**: Stage 1 crypto-shred/anonymize PII immediately + tombstone identity on retained records; Stage 2 a **single-runner retention-purge job** (GAP-05 mechanism) hard-deletes anonymized records after the retention window. Erasure fans out via each module's `contract.ts` (no cross-module DB access); guarded against in-flight orders; export offered before erase.
- [ ] Field-level or at-rest encryption for sensitive columns (phone, address) — **per-user data key so anonymization = delete the key (crypto-shred, O(1) irreversible)** per the erasure doc.
- [ ] *(Phase 2 note)* GCash/Maya via **hosted checkout** to keep PCI scope ~zero.
- [ ] Decide Phase-1 vs Phase-2 timing for export/delete based on public-launch date.

### Ops readiness
- [ ] Confirm liveness/readiness probes + graceful shutdown (from 01/03) behave under real deploy.
- [ ] Dashboards/alerts from Sentry + OpenTelemetry (from 01); Semaphore spend alerts (from 02).
- [ ] Runbook: deploy, rollback, key rotation, incident response. **DB-migration + deploy/rollback slice lives in `db-migration-runbook.md` (GAP-03):** migrations as a gated K8s Job before rollout, expand/contract, code-only rollback (`rollout undo`) valid because migrations stay backward-compatible, PITR restore only as last resort.
- [ ] **Backups / DR (GAP-08, `db-migration-runbook.md` §Backups):** set the Neon PITR **history-retention window** (target 30d) + **RPO/RTO** targets; run a **restore drill** before go-live, then on cadence; keep crypto-shred **keys in a separate KMS** so a restore can't un-erase a user (GAP-06); a **restore re-verifies the audit chain** and is itself audited; optional **off-site anchor** of the audit chain head. Redis is non-authoritative (not backed up).

## Files (modified/new)

Web: `apps/web` env config. Mobile: `apps/mobile/.../api_constants.dart`.
API: `/v1` routing + version-gate middleware; export/delete endpoints; encryption utilities.
Infra: Cloudflare config, secret-manager wiring, deploy/runbook docs.

## Reuse

- Backend-switching + mobile base-URL notes: `.claude/sessions/2026-07-04-backend-switching-node-vs-elysia.md` (real repo).

## Acceptance / verification

- Web + mobile operate fully against `api-core`; legacy apps deleted; monorepo builds.
- Requests outside PH are geo-blocked at the edge; WAF rules active.
- No secrets in repo; keys rotate without downtime.
- Data export returns a user's data; delete removes/anonymizes it; encrypted columns unreadable at rest.
- Old app version receives the min-version gate response.
- Full regression via CI (06) green.

## Notes

- This is the "go-live" gate. Bring compliance items forward into earlier sessions if the public launch date is near.
