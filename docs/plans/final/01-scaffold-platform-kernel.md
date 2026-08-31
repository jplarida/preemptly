# Session 01 — Scaffold & Platform Kernel

> Part of the PreEmptly API final plan. See `00-README-index.md`. **Depends on:** nothing (first session).
> Corresponds to Port Sequence step 1.

## Goal

Stand up the empty `apps/api-core` workspace with the composition root and cross-cutting "kernel" so the app boots, serves `/health`, fails loudly on bad config, and serves OpenAPI docs — before any domain module exists. This session also lays the **platform** foundations: the **pack registry**, the **polymorphic `core-domain` schema** (`asset`/`service_request`/`prediction_log`), and the **RLS session-variable middleware** — so 05's `core-domain`+`pack-lpg` and 02's tenancy/RLS slot straight in. Auth internals (02) and events/outbox (03) get their own sessions but their **folders and interfaces are stubbed here**.

## Tasks

- [ ] Create workspace `apps/api-core` (package.json, tsconfig, wired into the monorepo). Prisma schema stays shared at repo root; `prisma` block points to `../../prisma/schema.prisma` (mirror `apps/api-elysia/package.json`).
- [ ] `src/config/env.ts` — TypeBox-validated env schema, **fail-fast at boot**: `DATABASE_URL`, `REDIS_URL`, `JWT_*`, `WEB_URL`, OTP keys required + length/format-checked. **No `"dev-secret"` fallback.** **Full var inventory (required/secret/default) in `env-config-catalog.md`.**
- [ ] `src/app.ts` — `buildApp(deps)` pure factory returning an Elysia app, **no `listen`** (testable). Receives `{ prisma, redis, bus, config, otpSender, pushSender }`.
- [ ] `src/main.ts` — composition root: load config → build real deps → `buildApp` → `listen`. Graceful shutdown (drain in-flight, flush bus/queue, close prisma/redis).
- [ ] `src/platform/db/prisma.ts` — `createPrismaClient(env)` provider (no global singleton); Neon pooled connection (PgBouncer) or Prisma Accelerate.
- [ ] `src/platform/redis/redis.ts` — Redis client provider (Upstash/self-host).
- [ ] `src/platform/http/error-handler.ts` — port `apps/api-elysia/src/lib/errors.ts` (`HttpError` + `onError` mapping). **Renders the canonical error envelope + attaches `requestId` per `error-taxonomy.md`** (code catalog + HTTP status usage).
- [ ] `src/platform/http/security-headers.ts` — HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, restrictive CSP.
- [ ] `src/platform/http/cors.ts` — locked to `WEB_URL` + deep-link origin, credentials.
- [ ] `src/platform/logging/logger.ts` — Pino structured logs, request-id, phone/PII scrubbing.
- [ ] `src/platform/observability/otel.ts` — OpenTelemetry traces/metrics init + Sentry error capture (wire, low config). **Enable OTel context propagation** so the trace context can ride the event envelope across the async hop (GAP-09; the envelope fields land in session 03).
- [ ] `src/modules/health/health.routes.ts` — `GET /health` (port from existing health module) + readiness/liveness probes.
- [ ] Mount **@elysiajs/swagger** — OpenAPI generated from TypeBox schemas; served at `/swagger` (+ `/openapi.json`).
- [ ] **API versioning + version gate established day 1 (GAP-04)** — mount all **business routes under a `/v1` base** (the version *is* the prefix; the legacy `/api` prefix is dropped — clients repoint to a base that includes `/v1`). **Ops probes stay unversioned** (`/health`, `/livez`, `/readyz`). Add the **minimum-supported-app-version gate** as a middleware **seam now** — reads an `X-App-Version` header and returns a structured **426 / must-update** below a configured floor; the floor *value* is set near launch (08), but the seam exists so **no route/client retrofit is ever needed**. All later sessions (02–07), the OpenAPI surface, and the Eden client are therefore born under `/v1`.
- [ ] **Stub folders/interfaces** for later sessions: `platform/auth/` (empty guards that 02 fills), `platform/events/bus.ts` interface + a no-op/in-memory impl (03 replaces).
- [ ] **Pack registry** (`platform/registry`): the `DomainPack` interface (`key, version, entitlement, assetTypes[], requestTypes[], predictionModels[], events[], routes?, notificationTemplates[], jobs?`) + a registry that mounts **enabled** packs (deployment config × per-tenant entitlement) and registers their attribute schemas/lifecycles. Replaces hand-wired route mounting. Wire `pack-lpg` as the sole Phase-1 pack (its content lands in 05).
- [ ] **Polymorphic `core-domain` schema**: add `asset`, `service_request`, `prediction_log` to `prisma/schema.prisma` — each with `vertical` + `type` discriminator columns and a JSONB `attributes` column (GIN-indexed). `service_request` generalizes `Order` and has **no required tank FK**. (Detail: `domain-packs.md`.) **Full table inventory + column conventions in `data-model.md`** (IDs/money/time/PII/tenancy rules + kernel/core/pack/billing tables).
- [ ] **RLS session-variable middleware** (`platform/db`): set `SET LOCAL app.current_provider` / `app.current_user` from `currentUser` inside the request transaction (backs the RLS mandated in 02); provide a `service`/`BYPASSRLS` connection for the relay/internal jobs. **Verify `SET LOCAL` works under the chosen pooling** (PgBouncer transaction mode / Prisma Accelerate).
- [ ] `Dockerfile` — multi-stage Bun build, non-root user, healthcheck.
- [ ] `.env.example` documenting every var (from `env-config-catalog.md`).

## Files (new)

`apps/api-core/{package.json,tsconfig.json,Dockerfile,.env.example}`,
`apps/api-core/src/{app.ts,main.ts}`,
`apps/api-core/src/config/env.ts`,
`apps/api-core/src/platform/{db/prisma.ts,redis/redis.ts,logging/logger.ts,observability/otel.ts}`,
`apps/api-core/src/platform/http/{error-handler.ts,security-headers.ts,cors.ts}`,
`apps/api-core/src/modules/health/health.routes.ts`.

## Reuse

- Error model: `apps/api-elysia/src/lib/errors.ts`.
- Health module + `onError` shape: `apps/api-elysia/src/modules/health/` and `src/index.ts`.
- Prisma package wiring: `apps/api-elysia/package.json`.

## Acceptance / verification

- `bun run dev` boots; `GET /health` returns ok (probes unversioned); business routes are under `/v1`.
- Unsetting `JWT_*` or `REDIS_URL` → **boot aborts with a clear error** (fail-fast proven).
- OpenAPI docs served at `/swagger`; a request with `X-App-Version` below the configured floor gets the **426/must-update** response (gate seam proven).
- Response carries the security headers; CORS rejects an unlisted origin.
- One trivial integration test (health) passes via `app.handle()` (sets up the harness that 06 formalizes).
- The **pack registry** mounts an (empty) `pack-lpg`; the `asset`/`service_request`/`prediction_log` tables exist; the **RLS session variables** are set per request (proven by a simple read under a set `app.current_provider`).
- `tsc -b` clean.

## Notes

- Keep `app.ts` side-effect free so 06's tests can build it with fake deps.
- Decide Redis provider and Neon pooling approach here (see index open items).
- **Data stance (GAP-01):** pre-launch, no production data. Add the new `asset`/`service_request`/`prediction_log` tables to the shared schema **alongside** the legacy `Tank`/`Order`/… tables (still used by `api-elysia` during the port) — **no rows are migrated between them.** The legacy tables are dropped at cutover (08). This is a clean baseline migration, not a data move.
- **Identity invariant (GAP-22):** `userId` is the **stable identity (PK)**; **phone is a unique, *mutable* credential**, never an identity/FK — every ownership/tenancy FK uses `userId`, so a number change is a one-column update with all data intact. Reserve recovery-credential fields (hashed recovery code / secondary contact) as a schema seam. See `identity-phone-change-recovery.md`.
- **Canonical timezone (GAP-21):** app-wide **`APP_TZ = Asia/Manila`** (UTC+8, no DST). Store all timestamps as `timestamptz` (**UTC**) and compute **day boundaries in `APP_TZ`** via a shared tz date util (used by estimation/scan/pricing) — **never derive "days" from naive UTC**. Uses the tz database (`Asia/Manila`), not a hardcoded `+8`. Becomes per-tenant/region only if expanding beyond PH.
- **Provider capacity (GAP-11):** size the DB connection pool within Neon's plan **connection ceiling** (use the pooled endpoint), and keep Redis (Upstash) usage within its per-request/command + connection limits (rate-limit / idempotency / OTP are the hot paths). Validate against plan limits under load (06/08).
- **Client-suppliable PKs (GAP-02):** primary keys for offline-creatable entities (`service_request`/`asset`, orders) are **client-generated UUIDv7**, not server autoincrement, so offline mutations replay with no temp-id→server-id remapping (see `offline-sync-contract.md`). Set this in the schema now.
- **Migration model (GAP-03, `db-migration-runbook.md`):** the baseline schema is one clean migration, but establish the discipline now — migrations run as a **single gated Job / CI step** (`prisma migrate deploy`), **not** inside app boot and **not** a per-pod initContainer; a DDL-capable role distinct from the app runtime role. Every later schema change is **expand/contract** and ships its **RLS policies in the same migration** as the table.
