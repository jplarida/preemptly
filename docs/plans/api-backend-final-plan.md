# PreEmptly API — Final Backend Plan (Greenfield, Split-Ready, Hardened)

> **Status:** Final · **Date:** 2026-07-16 · **Coverage:** preempty:default
> Consolidates `draft/api-backend-greenfield-plan.md` + `draft/api-backend-enhancements-hardening.md` + `draft/api-backend-multi-tenancy.md` + `draft/api-backend-domain-packs.md` into one plan. Hardening, tenancy, and platform-modularity items are folded into the relevant sections; the "cheap-now / painful-retrofit" ones are promoted into the Phase-1 scaffold.
> Phase-2 hierarchical / reseller-franchise tenancy is tracked as a roadmap item (see backlog) against the retained `draft/api-backend-hierarchical-tenancy.md`.
> Real code lives at `D:\Personal\projects\preempty`.

## Context

The current backend (`apps/api-elysia`) is a working but organically-grown Elysia/Bun app: 14 modules, JWT auth with 3 role scopes, a global Prisma singleton, central error handling, an estimation engine, a cron scheduler, and unit-only tests (mocked Prisma). Gaps: **no CI, no Dockerfile, no rate limiting, no OTP throttling, a hardcoded `"dev-secret"` JWT fallback, a 30-day single token, cross-module coupling, and a live IDOR** (`orders/index.ts` `GET /:id` returns any order with no ownership check).

Decision (confirmed): **rebuild greenfield** on Elysia/Bun as a **split-ready modular monolith** — one deployable instance now, any module extractable into its own service later with no business-logic rewrite. Port the estimation engine + module logic from `apps/api-elysia`. Ship **full Phase-1 security hardening**, **unit + real-DB integration tests in CI**, and design in the reliability seams (outbox, idempotency, shared Redis state, object-level auth, asymmetric JWT) that are cheap now but painful to retrofit. n8n is an optional edge orchestration layer that drops in later on the same event seam. Retire `apps/api` (NestJS) + `apps/api-elysia` after the port.

## Target Architecture

New workspace **`apps/api-core`** (name adjustable). Legacy apps kept for reference during the port, deleted after. Prisma schema stays shared at repo root (`prisma/schema.prisma`).

**Data stance (confirmed 2026-07-19 — GAP-01):** the current backend is **pre-launch with no production data worth keeping.** Therefore there is **no data migration / backfill / dual-write** — the polymorphic `core-domain` schema is authored fresh (a clean baseline migration), legacy and new tables coexist in the shared schema only for the duration of the port, and the legacy tables are **dropped at cutover** together with the legacy apps. Seed/fixtures (session 06) replace migration for dev/test. *If this ever changes (a pilot goes live before cutover), GAP-01 reopens and a backfill + reconciliation plan is required.*

```
apps/api-core/
  src/
    main.ts                      # composition root: load config, build deps, app.listen()
    app.ts                       # buildApp(deps) — pure, returns Elysia; NO listen (testable)
    config/env.ts                # TypeBox-validated env; FAIL-FAST at boot on missing/weak values
    platform/                    # the "kernel" — cross-cutting infra, injected not imported
      db/prisma.ts               # createPrismaClient(env); Neon pooled conn (PgBouncer/Accelerate)
      redis/redis.ts             # Upstash/Redis client — shared state for the items below
      http/
        error-handler.ts         # ported from lib/errors.ts
        security-headers.ts      # HSTS, X-CTO, X-Frame, Referrer-Policy, Permissions-Policy, CSP
        rate-limit.ts            # Redis-backed global + per-route limiter
        idempotency.ts           # Idempotency-Key middleware (dedup mutations) — Redis/DB backed
        cors.ts                  # locked to WEB_URL + deep-link origin, credentials
      auth/
        jwt.ts                   # access+refresh, asymmetric (EdDSA/RS256), JWKS, key rotation
        rbac.ts                  # requireRole(user|retailer|rider|service) composable guard
        policy.ts                # object-level authorization (ownership/tenant) — kills IDOR
        current-user.ts          # derive middleware (ported from lib/auth.ts, deps injected)
      events/
        bus.ts                   # EventBus INTERFACE + typed event registry (events carry IDs)
        in-memory-bus.ts         # default single-instance impl
        outbox.ts                # transactional outbox: event written in same tx as state change
        relay.ts                 # ships outbox rows → bus/queue/n8n (at-least-once)
        # later: nats-bus.ts / bullmq (durable) — swap here, nothing else changes
      logging/logger.ts          # Pino structured logs + request-id, phone/PII scrubbing
      audit/audit.ts             # append-only, hash-chained audit sink (via bus)
      observability/otel.ts      # OpenTelemetry traces/metrics + Sentry error capture
    modules/<module>/
      <module>.routes.ts         # thin: validation + auth + object-policy + delegate
      <module>.service.ts        # business logic — depends on repository + bus PORTS, never prisma
      <module>.repository.ts     # the ONLY place this module's tables are touched
      <module>.model.ts          # TypeBox schemas, strict (additionalProperties:false)
      <module>.contract.ts       # PUBLIC interface other modules may call — extraction seam
      <module>.events.ts         # domain events this module publishes/subscribes
      <module>.unit.test.ts      # mocked repo + bus
      <module>.integration.test.ts # real Postgres via app.handle
    shared/                      # pure domain helpers/types, zero IO (estimation engine's logical home is core-domain/prediction — see Packaging note)
  test/setup/{unit-preload,integration}.ts, test/helpers.ts
  Dockerfile                     # multi-stage bun build, non-root, healthcheck
  package.json
```

The as-built modules (`auth, users, locations, tanks, refills, estimation, orders, retailers, riders, linking, discounts, notifications, health`) are ported into **two homes** (see **Platform** section): the vertical-agnostic **`core-domain`** (identity/auth, users, providers ← retailers, places ← locations, linking, service-requests ← orders, pricing ← discounts, notifications, prediction ← estimation, health) and the LPG **`pack-lpg`** (tanks → assets, refills, riders, the kg/day rate model, the preempty scan). The `modules/<module>/` anatomy above applies *within* `core-domain` and *within* each pack.

> **Packaging note (provisional — GAP-07):** the **logical** architecture is firm — three layers (**kernel · core-domain · pack**), the estimation engine's home is **core-domain/prediction**, packs are self-contained verticals. The **physical** packaging — workspace packages (`packages/{platform-kernel,core-domain,pack-*}`) **vs** in-app folders (`apps/api-core/src/{platform,core-domain,packs}`) — is **deferred** to when modules/packs are built. The tree above and any `packages/*` or `shared/` paths in the session docs are **illustrative logical placeholders**, not a committed physical layout. Decide this at/just before session 05.

## Core Principles (split-ready + reliable)

1. **No cross-module DB access.** A module never touches another's tables — it calls the other's `contract.ts` or reacts to its events. Load-bearing rule for cheap extraction.
2. **Repository isolates Prisma.** Services depend on a repository interface, not `PrismaClient`. Extraction to a separate DB = re-point one binding. (Fixes today's global-prisma coupling.)
3. **Event bus behind an interface + transactional outbox.** In-memory now; NATS/BullMQ later by swapping the impl. Events are written to an `outbox` table **in the same transaction** as the state change, then relayed at-least-once → guarantees "state changed ⟺ event emitted" (no lost/ghost events on crash). **Events are generic in core, LPG-specific in the pack (GAP-15):** core `shared-types` defines `ServiceRequestCreated`/`ServiceRequestStatusChanged`; `pack-lpg` defines `RefillLogged`/`TankEnteredPreemptyZone`; packs call core contracts, core never imports a pack event. Async flows:
   - `ServiceRequestCreated` (lpg/refill) → notify provider (pack template)
   - `ServiceRequestStatusChanged` (→`delivered`) → `pack-lpg` writes RefillLog, emits `RefillLogged`, resets `prediction` via its contract
   - `RefillLogged` (pack) → notify consumer
   - `TankEnteredPreemptyZone` (pack) → preempty low-gas alert
4. **Composition root / DI.** `buildApp(deps)` receives `{ prisma, redis, bus, config, otpSender, pushSender }`. Tests inject fakes; extraction re-wires trivially. No module reaches for a global.
5. **Shared state lives in Redis, not process memory.** Rate-limit / OTP throttle / refresh-token / idempotency stores are Redis-backed so they survive multi-instance and service splits (in-memory silently breaks the moment you scale — the exact thing this architecture targets).
6. **Idempotency everywhere it matters.** `Idempotency-Key` on all mutations (esp. `POST /orders`) — the offline mobile queue *will* double-submit on flaky networks; also required for at-least-once delivery.
7. **Contracts + event schemas in `packages/shared-types`.** A split-out module's network client implements the same `contract.ts` the in-process caller used.
8. **Multi-tenant by design (provider = tenant; LPG label: *retailer*).** Isolation runs on three axes — provider-tenancy (`providerId`), consumer-ownership (`userId`), and link-mediated cross-access (`assertLinked`, via `Link`/`ServiceRequest`). Enforced in repositories through `policy.ts`, backstopped by Postgres RLS. Consumers are multi-tenant (link to many providers). See **Tenancy & Isolation**.
9. **A platform of domain verticals (packs).** The app is a kernel + a vertical-agnostic **`core-domain`** + swappable **domain packs**; LPG is pack #1. New verticals (safety/security, health, home services) drop in as packs — a registry mounts them, entitlements gate them — with no core rewrite. See **Platform: Kernel + Core-Domain + Domain Packs**.

## How the Split Works (single instance now → services later)

Phase 1 is **one process, one deployable** — unchanged for MVP. Every module reaches the outside world through three injected seams; splitting = swapping what sits behind them, never `service.ts`:

| Seam | Single instance (now) | After split (later) |
|------|-----------------------|---------------------|
| **Event bus** (`platform/events/bus.ts`) | in-memory + outbox relay | swap to `nats-bus`/BullMQ — events cross the network; module code unchanged |
| **Contract** (`<module>.contract.ts`) | direct in-process call | network client (HTTP/gRPC) implementing the *same* interface; caller unchanged |
| **Repository** (`<module>.repository.ts`) | shared Prisma on one Neon DB | module takes its tables to its own DB — only the binding changes |

**Extraction example (`notifications` → nano-service):** add a `main.ts` that imports the same `modules/notifications/` folder and `listen()`s on its own port → swap the bus binding from in-memory to BullMQ/NATS in both processes → `DeviceToken` (only touched by `notifications.repository`) moves with it → deploy separately. `orders.service` still calls `bus.publish(OrderPlaced)` verbatim. **Natural split order:** estimation scheduler → worker; then notifications; then auth/OTP. Chatty modules (orders ↔ tanks ↔ refills) stay together longest.

**Language strategy (polyglot-ready, single-language now).** Phase 1 is **single-language — TypeScript/Bun end-to-end** — for velocity and to preserve end-to-end type safety (Eden Treaty API→web, `shared-types` across API/web/mobile). The three seams above are **language-agnostic wire protocols** (bus events, HTTP/gRPC contracts, JSON-Schema-from-TypeBox), so a module can later be **extracted and reimplemented in another language with no change to callers** — the extraction seam *is* the polyglot seam. Introduce a second language only at a **proven** seam (this is `RULE-PACK-04` applied to languages — not on speculation), where a real bottleneck or capability need justifies the extra toolchain/CI/ops cost.

- **First candidate: `prediction` → Python** (numpy/scikit/PyTorch) once models outgrow the current per-day-depletion math — it's already isolated behind the `ConsumptionModel` interface + a vertical-neutral eval harness, the cleanest extraction point. The eval/backtest harness could even go Python-first.
- **Later, if scale demands:** high-fanout workers / relay → **Go**; CPU-bound media/crypto → **Rust/Go**.
- **Cheap-now enabler:** keep event/contract schemas **language-neutral** (TypeBox→JSON Schema already; consider **protobuf/gRPC** for a known heavy Python boundary) so a non-TS service plugs into the same contracts.
- **Do not** split for polyglot's sake while single-instance — it fragments the one-deployable MVP and breaks the end-to-end type system. Reactive, at a seam, when justified.

## Platform: Kernel + Core-Domain + Domain Packs

> Full reference: **`final/domain-packs.md`**; expansion how-to: **`final/feature-expansion-playbook.md`**. Decision: **build the full pack system in Phase 1** with a **fully-polymorphic JSON core**. This makes the app a *platform of verticals* — LPG today, safety/security, health, home services, or anything later, as **drop-in packs** with no core rewrite.

Three layers plus the composition app:

- **`packages/platform-kernel`** — the infra kernel (`platform/*`: config/DI/db/redis/events/auth/rbac/policy/http/logging/audit/otel) **+ a pack registry** that replaces hand-wired route mounting.
- **`packages/core-domain`** — the vertical-agnostic spine: `identity`, `provider` (← retailer), `place` (← location), **`asset`** (polymorphic: `vertical` + `type` columns + JSONB `attributes`, generalizes `Tank`), **`service-request`** (generalizes `Order`: `vertical`/`type`/`lifecycleKey`/`status` + JSONB `attributes`, **no required tank FK**), `linking`, `notifications`, `pricing`, **`prediction`** (the estimation engine behind a `ConsumptionModel` interface).
- **`packages/pack-<vertical>`** — self-contained verticals; **`pack-lpg` is #1** (today's app repackaged).
- **`apps/api-core`** composes kernel + core-domain + **enabled** packs via the registry (deployment config × per-tenant entitlement).

**`DomainPack` contract** (what a pack exports): `key`, `version`, `entitlement`, `assetTypes[]` (each with a TypeBox `attributes` schema), `requestTypes[]` (schema + `lifecycle`), `predictionModels[]`, `events[]`, `routes?` (mounted `/v1/<key>`), `notificationTemplates[]`, `jobs?`. Adding a vertical = add a package to the registry — **no edits to kernel/core/schema**.

**Polymorphic JSON core — with mitigations** (the accepted trade): vertical data is Postgres **JSONB `attributes`** with `vertical`/`type` as real columns. Weak-typing is bought back at the edges: **every write validates `attributes` against the active type's TypeBox schema** (`additionalProperties:false`), and hot query fields are promoted to **Postgres generated columns** (GIN-indexed) when needed. Net: **zero-migration new verticals** + uniform cross-vertical billing/dashboards/tenancy, without losing validation.

**Per-vertical lifecycles:** `service_request.lifecycleKey` selects a state machine; each pack registers its lifecycle + a saga (the order saga of session 09 generalizes into a **lifecycle registry**). Delivery (LPG/home-services) and monitoring/subscription (safety/health) flows coexist.

**LPG-as-pack mapping (proves the core):** `Tank → asset(vertical='lpg',type='tank',attributes={capacityKg,model,usageLevel})`; gas `Order → service_request(vertical='lpg',lifecycleKey='delivery')`; `RefillLog`/`AccuracyLog` → LPG events + `prediction_log`; discounts/preempty-zone → pack `pricing` + a pack `job`.

## Security Layer (full Phase-1 hardening)

- **Object-level authorization (BOLA/IDOR)** — [priority] `platform/auth/policy.ts`: every fetch/mutate-by-id passes `currentUser` and asserts the right tenancy axis in the repository, systematically (not ad hoc). Fix the `orders` `findOne` IDOR when porting. **Postgres RLS is mandated** (not optional) as the backstop — see **Tenancy & Isolation**.
- **Env validation, fail-fast** (`config/env.ts`): `JWT_SECRET`/keys, `DATABASE_URL`, `REDIS_URL`, `WEB_URL`, OTP keys required + checked; **no `"dev-secret"` fallback** — boot aborts.
- **Rate limiting** (`platform/http/rate-limit.ts`, Redis): global IP + strict limiters on `/auth/*`, keyed by IP **and** phone.
- **OTP hardening + SMS-pumping defense** (auth): server-enforced 60s resend cooldown, max sends/phone/hour, max verify attempts → lockout; **libphonenumber-js** validation (valid PH mobile prefixes only, reject landline/premium); CAPTCHA/Turnstile after N attempts; Semaphore **spend cap + alert**.
- **JWT hardening**: short-lived access + refresh flow (replaces 30-day token), **asymmetric EdDSA/RS256 + JWKS** so split-out services verify with a public key; token-version claim for revocation; refresh tokens in Redis.
- **RBAC guard** (`platform/auth/rbac.ts`): `requireRole(...)` incl. a narrow `service` role for n8n's `/internal/*` machine calls.
- **Universal strict validation**: every body/query/params uses TypeBox with `additionalProperties:false` + format checks (`+63` phone).
- **Security headers + CORS locked** to known origins with credentials.
- **Tamper-evident audit log** (`platform/audit/`): auth events, order transitions, discount overrides, retailer-settings changes — **append-only + hash-chained**.
- **PII / PH Data Privacy Act (RA 10173)**: consent capture, retention policy, **data export & delete** endpoints, field/at-rest encryption for sensitive columns. Phase-2 GCash/Maya via **hosted checkout** to keep PCI scope ~zero.
- **Edge**: **Cloudflare** WAF/DDoS/bot + geo-restrict to PH (Phase 1 is +63 only).
- **Secrets**: injected via validated env; document prod path (Doppler/Infisical/Vault/KMS). None in code/repo.
- **Structured logging** with request IDs, PII scrubbed.

## Tenancy & Isolation

> Consolidated from `draft/api-backend-multi-tenancy.md` (full detail there). The tenant is the **`Provider`** (LPG label: *retailer*; concrete, no abstract org layer in Phase 1) — scope key **`providerId`** (GAP-16 resolved). Consumers are **multi-tenant** — a `User` links to many providers via `Link` (one `isPrimary`); consumer-owned data (`place`/`asset`/refills/device tokens) is `userId`-scoped, not partitioned per provider.

**Three access axes** (every endpoint sits on one):
1. **Provider-tenancy** — `row.providerId === currentUser.providerId`, for provider-scoped rows; list queries filter by it, by-id ops assert it.
2. **Consumer-ownership** — `row.userId === currentUser.id`, for consumer-owned rows.
3. **Link-mediated cross-access** — a provider reaches a consumer's data only via an `ACTIVE` `Link` or a `ServiceRequest` (`assertLinked`); cross-table, so it stays in the app layer, not RLS.

**Enforcement:** `policy.ts` exposes `assertProviderTenant` / `assertOwner` / `assertLinked` + collection-scoping helpers, called from repositories; the `requireRole` guard is actually applied to every provider/rider/user route (today only one route checks). **Postgres RLS is the mandated backstop [Now]:** RLS on provider-scoped and consumer-owned tables, `SET LOCAL app.current_provider` / `app.current_user` per request transaction, a `service`/`BYPASSRLS` path for the relay/internal jobs. Caveat: `SET LOCAL` must share the transaction under pooled connections (PgBouncer/Accelerate) — verify at implementation. In the pack model, `asset`/`service_request` carry `tenant`/`vertical` columns so **one RLS policy set covers all verticals**.

*Phase-2 roadmap:* hierarchical / reseller-franchise tenancy (a tenant tree above the retailer, white-label + multi-branch) is specified in `draft/api-backend-hierarchical-tenancy.md` — not built in Phase 1, but the entitlement model and `retailerId`-as-scope-key are the seams it needs.

## Reliability & Integrations (OSS / 3rd-party)

- **Redis (Upstash serverless)** — [Now] backs rate-limit, OTP, refresh, idempotency, cache, pub/sub.
- **Transactional outbox + relay** — [Now, seam] reliable events; **BullMQ (Redis)** — [seam now, build later] durable retryable jobs (SMS/FCM/n8n dispatch) with backoff + DLQ; the cron becomes a repeatable job. **Scheduled jobs are single-runner (GAP-05):** exactly one execution per tick across instances (Redis lock now → BullMQ repeatable job / K8s CronJob later); the preempty scan emits `TankEnteredPreemptyZone` **edge-triggered** (on entry into the zone), not every tick.
- **Observability** — [Now] **Sentry** (errors) + **OpenTelemetry** → Grafana Cloud/Axiom/Better Stack; **Pino** logs.
- **API surface** — [Now] **@elysiajs/swagger** (OpenAPI from TypeBox) → free docs, enables **Schemathesis** fuzzing, and **Eden Treaty** end-to-end type-safe client for the Next.js web app.
- **Product analytics + flags** — [Now-ish] **PostHog** (OSS): reorder funnels (core hypothesis) + per-retailer feature flags for discount tiers.
- **Comms redundancy** — second SMS provider (Twilio/Vonage) behind the `otpSender` abstraction; transactional email (Resend/SES) when retailer email lands.
- **Geocoding/delivery** — [Phase 2] Google Maps/Mapbox or OSS Nominatim+Photon/OpenRouteService for address validation, rider routing, delivery zones.
- **DB hygiene** — [Now] Neon pooled connection (PgBouncer) or Prisma Accelerate; read replicas for dashboards later.
- **Resilience** — [Now] circuit breakers + timeouts around Semaphore/FCM (Cockatiel/p-retry); liveness/readiness probes; graceful shutdown (drain requests, flush bus/queue).
- **API versioning** — [Now] `/v1` + minimum-supported-app-version gating (mobile can't force-update). **Established in session 01, not retrofitted (GAP-04):** business routes under `/v1` from day 1, ops probes unversioned, the version-gate is a middleware seam whose floor value is set near launch.

## n8n Integration (optional edge orchestration)

n8n attaches at the **same event seam** — just another bus/queue consumer, not a core change. **System of record stays in the API** (auth, orders, discount locking, estimation, all critical mutations); **n8n owns orchestration** (SMS/FCM/email delivery, channel fan-out, ops automation, Phase-2 Viber/Messenger/GCash webhooks). **Rule: n8n reacts to events and calls external services; it never owns truth.**
Wiring: `bus.publish(...)` → HMAC-signed outbound webhook → n8n trigger → fan-out; n8n → API `/internal/*` with the `service` token. Non-negotiables: dedicated `service` identity, HMAC-signed webhooks, **idempotent** workflows (retries), **off the critical path** (down n8n never blocks orders), and **version-controlled workflows in `ops/n8n/*.json`**. Optional for launch — the event contracts make it a drop-in later.

## Testing + CI

- **Unit** (`*.unit.test.ts`): mocked repo + bus (evolves existing `test/preload.ts` + `helpers.ts` factories).
- **Integration** (`*.integration.test.ts`): real Postgres via **testcontainers**, `prisma migrate deploy` + seed, real routes via `app.handle()`.
- **Contract/e2e** — [later] **Pact** across mobile/web/API; **Playwright** web e2e; **k6** load tests.
- **CI (GitHub Actions, `.github/workflows/ci.yml`)** on every push/PR: `bun install` → `prisma generate` → **type-check `tsc -b`** → lint → unit → integration → build. Security gates: **gitleaks/trufflehog** (secrets, + husky pre-commit), **Semgrep** + **CodeQL** (SAST), **Dependabot/Renovate** + `bun audit`, **Trivy** (container) + SBOM, optional **Schemathesis**/ZAP (DAST). All gate merge.
  - Global rules mention Jenkins + husky — `tsc -b` kept so a Jenkinsfile can mirror the same gates if Jenkins is the real CI (confirm at implementation time).

## Port Sequence (greenfield, incremental)

1. **Scaffold** `apps/api-core`: package/tsconfig, `config/env.ts`, `app.ts`/`main.ts`, and `platform/*` **including the promoted seams** — Redis client, `events/{bus,outbox,relay}`, `http/{rate-limit,idempotency,security-headers}`, `auth/{jwt (asymmetric),rbac,policy}`, `observability/otel`, audit — **plus the pack registry, the polymorphic `core-domain` schema (`asset`/`service_request`/`prediction_log` with `vertical`/`type` + JSONB `attributes`), and the RLS session-variable middleware (`SET LOCAL app.current_provider`/`app.current_user`).** Prove boot + `/health` + one integration test + fail-fast + OpenAPI docs.
2. **Port the estimation engine** first — pure; bring `engine.test.ts`. **Generalize it into `core-domain/prediction` behind a `ConsumptionModel` interface; `pack-lpg` registers the kg/day model + cooking adjustments; the eval harness stays vertical-neutral.** Day-math uses **Asia/Manila** boundaries, not UTC (GAP-21).
3. **Port modules in dependency order**, one per PR, each with `contract.ts`, repository, strict models, RBAC + **object-policy**, idempotency on mutations, unit + integration tests: `auth` → `users`/`locations` → `tanks`/`estimation` → `refills` → `orders` (**fix IDOR here**) → `retailers`/`riders`/`linking` → `discounts` → `notifications`. **Land generic modules in `core-domain`, LPG-specific ones in `pack-lpg`; apply the three tenancy axes (list-scope + by-id assert + `assertLinked`) to every module; validate each `attributes` payload against its type's TypeBox schema.** Convert cross-module calls to contracts/events; publish events via the outbox.
4. **Wire event flows** (OrderPlaced / DeliveryConfirmed / RefillLogged / TankEnteredPreemptyZone); move the estimation scheduler's notification half behind an event (emit, don't call `NotificationsService`) so it can become a worker or n8n trigger.
5. **Estimation eval harness** — use the **`prediction_log`** table (the core-domain generalization of the legacy `accuracyLog`) for predicted-vs-actual backtesting so estimation strategies can be A/B'd (protects the core IP).
6. **Cut over**: point web (`NEXT_PUBLIC_API_URL`) + mobile to `api-core`; **delete `apps/api` + `apps/api-elysia`** and **drop the now-unused legacy tables** from the shared schema. **No data backfill** — pre-launch (GAP-01). Rollback is code-only (re-point clients at legacy) within a short dual-run window, not a data restore.
7. **(When needed) attach n8n**: HMAC outbound adapter + `service`-role `/internal/*` + `ops/n8n/*.json`; optionally swap in-memory bus → BullMQ. Optional for launch.
8. **(When monetizing) billing & checkout** (`final/10-billing-checkout.md`): a `core-domain/billing` module + `paymentProvider` port (GCash/Maya/card via hosted checkout) + HMAC `service`-role webhook that activates `Subscription`/`Entitlement`, turning the operator entitlement-toggle into a self-serve tenant subscribe-and-pay journey. Phase-2 / optional — the entitlement enforcement seams already exist from steps 1–3.

## Enhancements backlog (priority tags)

- **[Now]** object-level auth/policy (3 tenancy axes) · **Postgres RLS backstop** · **pack registry + polymorphic `core-domain` + `DomainPack` contract + `pack-lpg`** · **generalized `prediction`** · **entitlement-gated pack mounting** · Redis-backed shared state · idempotency keys · transactional outbox · env fail-fast · rate-limit + OTP/SMS-pumping defense · asymmetric JWT+JWKS · security headers · CI security scanning · Sentry+OTel · OpenAPI+Eden · DB pooling · API versioning · graceful shutdown/probes.
- **[Seam now, build later]** BullMQ durable queue · tamper-evident audit · saga/process-manager → **lifecycle registry** (Temporal candidate — **session 09**; event seam in 05) · lifecycle families beyond `delivery` · generated-column promotion for hot JSON fields · per-pack Postgres schema.
- **[Phase 2+/optional]** **hierarchical / reseller-franchise tenancy** (`draft/api-backend-hierarchical-tenancy.md`, retained) · **additional verticals** (`pack-security`/`pack-health`/`pack-home-services`) · cross-vertical analytics · geocoding/delivery routing · real-time WS/SSE tracking · PostHog analytics rollout · second SMS provider · **billing & checkout / self-serve feature-availing** (`final/10-billing-checkout.md`: `core-domain/billing` + `paymentProvider` port + GCash/Maya hosted checkout + HMAC webhook → `Subscription`/`Entitlement` activation; renewal/dunning/reconcile — enforcement seams land in sessions 01/02) · PH NPC export/delete endpoints (bring forward if launching publicly).

## Reuse from existing code

- Estimation engine: `apps/api-elysia/src/modules/estimation/engine.ts` (+ test) → **`core-domain/prediction`** (logical home; physical packaging provisional — see Packaging note) near-verbatim.
- Errors: `apps/api-elysia/src/lib/errors.ts` → `platform/http/error-handler.ts`.
- Auth derive: `apps/api-elysia/src/lib/auth.ts` → `platform/auth/current-user.ts` (deps injected, secret from env).
- Test factories/helpers: `apps/api-elysia/src/test/{helpers,preload}.ts` → `test/setup/`.
- All module business logic: port each `service.ts` behind the new repository/contract/outbox layer.

## Verification

- **Boot**: `bun run dev`; `GET /api/health` ok; boot **fails loudly** with `JWT_SECRET`/`REDIS_URL` unset; OpenAPI docs served.
- **Unit**: `bun test` green, no DB.
- **Integration**: testcontainers Postgres, migrations applied; exercise send-otp → verify-otp → create tank → place order → confirm delivery → assert `RefillLogged` (via outbox) + estimation reset.
- **Security spot-checks**: another user's order id → **403 via object-policy** (IDOR closed); exceed OTP send limit → 429; landline/invalid PH number rejected; consumer token on retailer route → 403; extra-field body → 400; response carries security headers; duplicate `POST /orders` with same `Idempotency-Key` → single order.
- **Reliability**: kill the process mid-flow → on restart the outbox relay still delivers the pending event (no loss).
- **Type-check `tsc -b`** clean; **CI** all gates (incl. security scans) green on a PR.

## Open items to confirm at implementation time

- Workspace name `apps/api-core` vs reclaiming `apps/api`.
- CI target: GitHub Actions vs Jenkinsfile (global rules reference Jenkins/husky).
- Refresh-token model (Redis rotation vs DB table) — decide when porting `auth`.
- Redis provider (Upstash serverless vs self-host) and queue (BullMQ now vs after split).
- n8n: include at launch vs defer; self-hosted vs Cloud.
- PH NPC export/delete: Phase 1 vs Phase 2 (depends on public-launch timing).
- Pack packaging: workspace packages (`packages/pack-*`) vs folders under `apps/api-core/src/packs/*`.
- Prisma layout: single schema vs `multiSchema` (`core` + per-pack) for the split-ready seam.
- Pure-JSON core vs allowing a pack a typed side-table for very hot/relational data.
- Tenancy RLS under pooled connections: verify `SET LOCAL` works with PgBouncer transaction mode / Prisma Accelerate.
- **Launch-timing risk:** building the full pack platform before shipping LPG lengthens time-to-first-launch — consider shipping `pack-lpg` on the core early while other packs stay theoretical.
- Hierarchical/reseller tenancy: greenlight timing for Phase 2 (drives the entitlement + tenant-tree work).
