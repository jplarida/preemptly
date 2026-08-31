# Session 06 — Testing & CI Pipeline

> Part of the PreEmptly API final plan. See `00-README-index.md`. **Depends on:** 01 (harness). **Grows each session** — set it up early, then every module PR must pass it.

## Goal

A CI pipeline that gates every push/PR on type-check, lint, unit + real-DB integration tests, build, and a security scan suite. Establish the two-tier test strategy the modules reuse.

## Tasks

### Test harness
- [ ] `test/setup/unit-preload.ts` — mock repositories + bus; evolve the existing mocked-Prisma pattern from `apps/api-elysia/src/test/preload.ts`.
- [ ] `test/helpers.ts` — `createTestApp` / `makeRequest` factories; port entity factories (mockUser/mockTank/mockOrder…) from `apps/api-elysia/src/test/helpers.ts`.
- [ ] `test/setup/integration.ts` — **testcontainers** Postgres (local/CI parity), `prisma migrate deploy` + seed, exercise real routes via `app.handle()`.
- [ ] Convention: `*.unit.test.ts` (fast, mocked, no DB) + `*.integration.test.ts` (real Postgres) per module.
- [ ] **Dev seed script (GAP-12)** — a runnable `bun run seed:dev` that creates a **linked retailer + consumer + rider + asset(tank) + order** so the whole app runs/demos locally; distinct from the per-test integration seed.

### Platform & tenancy tests
- [ ] **Tenant isolation** — retailer A cannot read retailer B's orders/riders/settings (**403**); consumer A cannot read consumer B's assets (**403**); an unlinked retailer cannot read a consumer's asset (**403**), permitted after an `ACTIVE` link. **RLS backstop:** a query with its tenant `where` removed still returns only the caller's rows; a raw cross-tenant read with no session variable set is denied.
- [ ] **2nd-vertical acid test** — stand up a throwaway stub pack (e.g. `pack-water-tank`) and assert it **mounts, validates its `attributes`, runs its lifecycle, and is entitlement-gated — without touching `platform-kernel`, `core-domain`, or the shared schema**. This is the pass/fail for "easily modularized."
- [ ] **Cross-vertical** — a dashboard query over `service_request` returns rows from two verticals at once; a tenant not entitled to a vertical has its reads/writes rejected.
- [ ] **Rate-limit vs replay burst (GAP-23)** — a reconnecting device's burst of queued authenticated mutations is **not** throttled as abuse; repeat `Idempotency-Key`s don't count; the strict `/auth` limits are unaffected.
- [ ] **Event-handler idempotency (GAP-25)** — redelivering an event causes a **single effect** (no double notification / double `RefillLog`).
- [ ] **Timezone day-boundary (GAP-21)** — a refill at 23:30 vs 00:30 Asia/Manila lands in adjacent PH days; a refill at 03:00 PH (=19:00 UTC prior day) buckets to the PH day; estimation day-counts + the preempty countdown are stable across UTC midnight.
- [ ] **Scheduled-job single-runner (GAP-05)** — run N app instances against one Redis/DB; the preempty scan executes **once per tick** (not N times); a tank in-zone alerts **once on entry**, not every tick (edge-trigger).
- [ ] **Offline replay (GAP-02, `offline-sync-contract.md`)** — replay a queued `POST /v1/orders` (same `Idempotency-Key`) after a simulated multi-day gap → **exactly one** order (2nd call returns the stored response); a dependent offline `create asset → create order` replays in order via client UUIDv7 ids (no remapping); cancel-of-already-delivered → **409**; a write carrying `PENDING_SMS` is **rejected**; the queue drains after same-user OTP re-auth but not under a different user.

### CI (`.github/workflows/ci.yml`)
- [ ] Pipeline on push/PR: `bun install` → `prisma generate` → **type-check `tsc -b`** → lint → unit → integration (Postgres service/testcontainers) → build. All gate merge.
- [ ] Security gates:
  - **gitleaks/trufflehog** secret scanning (+ husky pre-commit hook mirroring it).
  - **Semgrep** + GitHub **CodeQL** (SAST).
  - **Dependabot/Renovate** + `bun audit`.
  - **Trivy** container scan + **SBOM** generation.
  - Optional **Schemathesis** (OpenAPI fuzzing) / OWASP ZAP baseline (DAST).
- [ ] Keep `tsc -b` as the type-check step so a **Jenkinsfile** can mirror the gates if Jenkins is the real CI (global rules reference Jenkins/husky — confirm target).

### Later (post-MVP)
- [ ] **Pact** consumer-driven contract tests across mobile/web/API.
- [ ] **Playwright** web e2e; **k6** load tests + SLOs — **validate against Neon/Upstash plan ceilings (GAP-11)** (connection + command limits).

## Files (new)

`.github/workflows/ci.yml`, `.github/dependabot.yml` (or `renovate.json`),
`apps/api-core/test/helpers.ts`, `apps/api-core/test/setup/{unit-preload.ts,integration.ts}`,
husky pre-commit hook (secret scan).

## Reuse

- Mocked-Prisma preload + factories + request helper: `apps/api-elysia/src/test/{preload.ts,helpers.ts}`.

## Acceptance / verification

- A PR runs the full pipeline; a deliberately failing type-check / test / injected secret / vulnerable dep **blocks merge**.
- Integration suite spins Postgres, applies migrations, and passes locally and in CI identically.
- Coverage visible (optional threshold gate).

## Notes

- Do this right after 01 so 02–05 land already gated.
- Respect global rules: never `--no-verify`; husky hooks must pass.
