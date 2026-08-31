# PreEmptly API — Greenfield Split-Ready Backend

> **⚠️ SUPERSEDED (2026-07-16)** — consolidated into `../api-backend-final-plan.md`. Kept for provenance; **do not treat as current** — read the final plan instead.
>
> **Status:** Draft plan · **Date:** 2026-07-16 · **Coverage:** preempty:default
> Real code lives at `D:\Personal\projects\preempty`. This document is the approved architecture plan for the new `apps/api-core` backend.

## Context

The current backend (`apps/api-elysia`) is a working but organically-grown Elysia/Bun app: 14 modules, JWT auth with 3 role scopes, a Prisma singleton imported globally, central error handling, an estimation engine, and a cron scheduler. Tests mock Prisma (unit-only). It has **no CI, no Dockerfile, no rate limiting, no OTP throttling, a hardcoded `"dev-secret"` JWT fallback, a 30-day single-token auth model, and cross-module coupling** (e.g. `orders/index.ts` branches on `role` inline and services import the global prisma directly).

Decision (confirmed with user): **rebuild the API greenfield** on Elysia/Bun as a **modular monolith with enforced module boundaries and an internal event bus** — one deployable instance now, any module extractable into its own service later with no rewrite. Port the estimation engine and business logic module-by-module from `apps/api-elysia`. Add **full Phase-1 security hardening**, **unit + real-DB integration tests**, and a **CI pipeline**. Retire both legacy apps (`apps/api` NestJS, `apps/api-elysia`) once the port is complete.

The goal: a backend that is secure and CI-gated from day one, runs as a single instance for the Phase-1 MVP, and can be split into micro/nano-services by swapping the event transport and repository bindings — without touching business logic.

## Target Architecture

New workspace: **`apps/api-core`** (name adjustable). Legacy `apps/api` + `apps/api-elysia` kept for reference during the port, deleted after. Prisma schema stays shared at repo root (`prisma/schema.prisma`).

```
apps/api-core/
  src/
    main.ts                      # composition root: load config, build deps, app.listen()
    app.ts                       # buildApp(deps) — pure, returns Elysia; NO listen/side effects (testable)
    config/
      env.ts                     # TypeBox-validated env schema; FAIL-FAST at boot on missing/weak values
    platform/                    # the "kernel" — cross-cutting infra, injected not imported
      db/prisma.ts               # createPrismaClient(env) provider (no global singleton)
      http/
        error-handler.ts         # ported from lib/errors.ts
        security-headers.ts      # HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, restrictive CSP
        rate-limit.ts            # global + per-route limiter
        cors.ts                  # locked to WEB_URL + deep-link origin, credentials
      auth/
        jwt.ts                   # access+refresh, algorithm pinned, secret from validated env
        rbac.ts                  # requireRole('retailer'|'rider'|'user') composable guard
        current-user.ts          # derive middleware (ported from lib/auth.ts, deps injected)
      events/
        bus.ts                   # EventBus INTERFACE (publish/subscribe) + typed event registry
        in-memory-bus.ts         # default single-instance impl
        # later: nats-bus.ts / queue-bus.ts — swap here, nothing else changes
      logging/logger.ts          # structured logs + request-id, PII (phone) scrubbing
      audit/audit.ts             # writes security-relevant events to an audit sink (via bus)
    modules/
      <module>/
        <module>.routes.ts       # HTTP surface (Elysia plugin) — thin, validation + auth + delegate
        <module>.service.ts      # business logic — depends on repository + bus PORTS, never prisma
        <module>.repository.ts   # the ONLY place this module's tables are touched
        <module>.model.ts        # TypeBox request/response schemas, strict (additionalProperties:false)
        <module>.contract.ts     # PUBLIC interface other modules may call — the extraction seam
        <module>.events.ts       # domain events this module publishes / subscribes to
        <module>.unit.test.ts    # mocked repo + bus
        <module>.integration.test.ts # real Postgres via app.handle
    shared/                      # pure domain helpers/types, zero IO (estimation engine lives here)
  test/
    setup/unit-preload.ts        # mock repos/bus (evolves the existing preload.ts pattern)
    setup/integration.ts         # ephemeral Postgres + prisma migrate deploy + seed
    helpers.ts                   # createTestApp / makeRequest (ported from existing test/helpers.ts)
  Dockerfile                     # multi-stage bun build, non-root user, healthcheck
  package.json
```

Modules to port (same domains as today): `auth, users, locations, tanks, refills, estimation, orders, retailers, riders, linking, discounts, notifications, health`.

## Core Principles (what makes it split-ready)

1. **No cross-module DB access.** A module never reads/writes another module's tables. It calls the other module's `contract.ts` interface, or reacts to its events. This single rule is what makes later extraction cheap — a module's tables move with it.
2. **Repository isolates Prisma.** Services depend on a repository interface, not `PrismaClient`. Extracting a module to its own DB = re-point one repository binding. (Fixes today's global-prisma-import coupling.)
3. **Internal event bus behind an interface.** In-memory now; NATS/queue later by swapping the impl in `platform/events/`. Modules publish domain events instead of calling each other synchronously where the flow is async:
   - `OrderPlaced` → notifications notifies retailer
   - `DeliveryConfirmed` → refills creates RefillLog → emits `RefillLogged`
   - `RefillLogged` → estimation resets the tank countdown → notifications notifies customer
   This decoupling is both the split seam and a cleanup of today's tight order↔refill↔estimation coupling.
4. **Composition root / dependency injection.** `buildApp(deps)` receives `{ prisma, bus, config, otpSender, pushSender }`. Tests inject fakes; a future service extraction re-wires trivially. No module reaches for a global.
5. **Contracts + event schemas in `packages/shared-types`.** When a module becomes a network service, its remote client implements the same `contract.ts` interface the in-process caller already used.

## How the Split Actually Works (single instance now → micro/nano-services later)

Phase 1 runs as **one process, one deployable** — that does not change for the MVP. "Split-ready" is purely structural: the code is arranged so a module can *later* be lifted into its own service **without rewriting its business logic**. Every module reaches the outside world through three injected seams — never directly — and splitting = swapping what sits behind those seams.

| Seam | Single instance (now) | After split (later) |
|------|-----------------------|---------------------|
| **Event bus** (`platform/events/bus.ts`) | in-memory impl, publish/subscribe within the process | swap to `nats-bus.ts` / queue impl — events cross the network; module code unchanged |
| **Contract** (`<module>.contract.ts`) | a direct in-process function call | a network client (HTTP/gRPC) implementing the *same* interface; caller code unchanged |
| **Repository** (`<module>.repository.ts`) | shared Prisma against the one Neon DB | the module takes its tables to its own DB — only the connection binding changes |

Because modules depend on the **interface**, not the implementation, swapping the implementation never touches `service.ts`.

**Worked example — extracting `notifications` into a nano-service:**
1. **Give it a `main.ts`.** The `modules/notifications/` folder already holds routes/service/repo/events. Add a composition root that imports that same folder and calls `app.listen()` on its own port. No logic rewrite — the module is reused as-is.
2. **Swap the bus transport.** Change the `platform/events/` binding from `in-memory-bus` to `nats-bus` in both the API and the new service. `orders.service` still calls `bus.publish(OrderPlaced)` verbatim — it now serializes over NATS/queue, and notifications' existing subscriber receives it over the wire.
3. **Its tables move with it.** `DeviceToken` is only ever touched by `notifications.repository` (the "no cross-module DB access" rule). It can move to a separate DB or stay — no other module references it.
4. **Deploy separately.** New entrypoint/Dockerfile, own scaling; the main API stops running the notifications subscriber.

For a **synchronous** cross-module call (e.g. web needs a live read), the caller used `notificationsContract.getPrefs(userId)` — a direct call in-process, an injected HTTP-client implementation of the same `NotificationsContract` after the split. Caller code is identical either way.

**What "no rewrite" rests on:** Rule 1 (no cross-module DB reads) is load-bearing — the instant `orders` queries the `DeviceToken` table directly, notifications can never be extracted cleanly; the repository + contract layers exist to enforce this. Combined with the `buildApp(deps)` composition root, "same code, wired differently" is a config change, not a refactor.

**Natural split order (only split what benefits):** estimation scheduler → worker (already async/cron, CPU-ish) → notifications (FCM/SMS fan-out) → auth/OTP (rate-limit isolation). Chatty, tightly-coupled modules (orders ↔ tanks ↔ refills) stay together longest — and that is fine. The cost of this readiness is modest (the repository + contract layers) and it also cleans up today's global-prisma coupling whether or not a split ever happens.

## n8n Integration (edge orchestration layer)

n8n attaches at the **same event-bus seam** that enables service extraction — it is just another bus consumer at the edge, not a change to the core. The dividing line:

- **System of record — stays in the API** (typed, tested, RBAC'd): auth, orders, discount locking, the estimation engine, all critical-state DB mutations. Never in a low-code canvas.
- **Orchestration & integration — n8n**: outbound comms (Semaphore SMS, FCM, email), channel fan-out, scheduled ops jobs, and Phase-2 integrations (Viber/Messenger bot, GCash/Maya webhooks). Best-effort, change-often, non-dev-tweakable.

**Rule: n8n reacts to events and calls external services; it never owns truth.** Deciding *who is in the preempty zone* or *what discount is locked* stays in the API; n8n only delivers the message.

Wiring (reuses the outbound event adapter, HMAC-signed):
```
API module → bus.publish(TankEnteredPreemptyZone)
   → outbound adapter → HMAC-signed HTTP POST → n8n webhook trigger
      → n8n workflow: fan out to FCM / Semaphore SMS / email
      → (needs data?) → calls API /internal/* with a service token
```

Three integration points, mapped to current code:
1. **Preempty low-gas alerts** — the *scan + prediction* half of `estimation/scheduler.ts` stays server-side (uses the estimation engine + retailer threshold). Instead of calling `NotificationsService.sendToUser` directly, it **emits `TankEnteredPreemptyZone`**; n8n owns delivery/copy/timing/channels. The daily cron may instead become an n8n schedule that calls a thin `POST /internal/preempty-scan` returning the due list — logic still in the API.
2. **Order lifecycle comms** — `OrderPlaced` / `DeliveryConfirmed` / `RefillLogged` → n8n → notify customer + retailer across channels (replaces the stub `NotificationsService.sendToRetailer`).
3. **Ops automation (pure n8n, no core code)** — retailer sales digests, refill reconciliation, onboarding sequences, dead-letter alerts; cron workflows reading via a read-only API service token.

Non-negotiables:
- **Dedicated machine identity** — a 4th `service` role in the RBAC guard with a narrow scope; API→n8n webhooks HMAC-signed, n8n→API calls carry the service token, private network where possible.
- **Idempotency** — every event carries an ID; n8n workflows must be idempotent (n8n retries). Already required by the split-ready bus, so free.
- **Off the critical path** — n8n consumes events asynchronously; if it is down, orders/deliveries still succeed and notifications retry. Never in the synchronous request path.
- **Version-controlled workflows** — export flows to `ops/n8n/*.json` in the repo (reviewed, restorable); treat n8n's own DB as infra.

Cost: one operational component to run/secure/monitor, and n8n logic is harder to unit-test than code — which is exactly why the boundary above keeps tested-critical logic in the API. Worth it because the biggest unbuilt surface (notifications + external integrations + Phase-2 channels) is orchestration-heavy, and the event bus means adopting n8n costs nothing not already being built.

## Security Layer (full Phase-1 hardening)

- **Env validation, fail-fast** (`config/env.ts`): `JWT_SECRET` required and length-checked — **no `"dev-secret"` fallback**; boot aborts if unset/weak. Same for `DATABASE_URL`, `WEB_URL`, OTP provider keys.
- **Rate limiting** (`platform/http/rate-limit.ts`): global IP limiter + strict limiters on `/auth/send-otp` and `/auth/verify-otp`, keyed by IP **and** phone.
- **OTP throttling** (auth module): server-enforced 60s resend cooldown (currently client-only), max sends per phone/hour, max verify attempts → temporary lockout. Backed by `OtpCode` table state.
- **JWT hardening** (`platform/auth/jwt.ts`): short-lived access token + refresh-token flow (replaces the 30-day single token), algorithm pinned, `sub/role/iat/exp`, token-version claim for revocation.
- **RBAC guard** (`platform/auth/rbac.ts`): `requireRole(...)` composable middleware — replaces scattered inline `if (role === 'retailer')` checks in routes. Includes a narrow-scoped `service` role for n8n's machine-to-machine calls (`/internal/*`).
- **Universal strict input validation**: every route body/query/params uses TypeBox schemas with `additionalProperties:false` and format checks (e.g. `+63` phone pattern).
- **Security headers** (`platform/http/security-headers.ts`) + **CORS locked** to known origins with credentials.
- **Audit log** (`platform/audit/`): auth events, order status transitions, discount overrides, retailer-settings changes written via the bus to an audit table.
- **Structured logging with request IDs**, phone/PII scrubbed.
- **Secrets**: injected via validated env; document the prod path (host secret store / vault). No secrets in code or repo.

## Testing + CI

- **Unit** (`*.unit.test.ts`): mocked repository + bus (evolves the existing `test/preload.ts` + `helpers.ts` factories — mockUser/mockTank/mockOrder reused). Fast, no DB.
- **Integration** (`*.integration.test.ts`): real Postgres via **testcontainers** (Docker Postgres spun per run — local/CI parity), `prisma migrate deploy` + seed against it, exercise real routes through `app.handle()`. (Neon-branch-per-PR is an alternative; testcontainers chosen for local parity.)
- **CI** — **GitHub Actions** (`.github/workflows/ci.yml`, none exists today). Jobs on every push/PR: `bun install` → `prisma generate` → **type-check (`tsc -b`, matches Jenkins)** → lint → unit tests → integration tests (Postgres service/testcontainers) → build. All gate the merge.
  - Note: global rules mention Jenkins + husky. `tsc -b` is kept as the type-check step so a Jenkinsfile can mirror the same gates if Jenkins is the real CI — confirm at implementation time.

## Port Sequence (greenfield, incremental)

1. **Scaffold** `apps/api-core`: `package.json`, `tsconfig`, `config/env.ts`, `app.ts`/`main.ts`, `platform/*` (db, http, auth, events, logging, audit), test setup, Dockerfile. Prove boot + `/health` + one integration test green.
2. **Port `shared/estimation`** first — `engine.ts` is pure (no imports), trivial to move; bring `engine.test.ts` over.
3. **Port modules in dependency order**, one per PR, each landing with its `contract.ts`, repository, strict models, RBAC, unit + integration tests: `auth` → `users`/`locations` → `tanks`/`estimation` → `refills` → `orders` → `retailers`/`riders`/`linking` → `discounts` → `notifications`. Convert cross-module calls to contracts/events as each lands.
4. **Wire event flows** (OrderPlaced / DeliveryConfirmed / RefillLogged / TankEnteredPreemptyZone) and move the estimation scheduler's notification half behind the bus (emit the event instead of calling `NotificationsService`) so it can later become a worker or an n8n trigger.
5. **Cut over**: point web (`NEXT_PUBLIC_API_URL`) and mobile to `api-core`; **delete `apps/api` and `apps/api-elysia`**.
6. **(When needed) attach n8n**: add the HMAC outbound webhook adapter + `service`-role `/internal/*` endpoints, stand up n8n, and move notification delivery + ops automation into `ops/n8n/*.json` workflows. Optional for Phase-1 launch; the event contracts make it a drop-in later.

## Representative Files (new)

- `apps/api-core/src/app.ts`, `main.ts`, `config/env.ts`
- `apps/api-core/src/platform/events/bus.ts` + `in-memory-bus.ts`
- `apps/api-core/src/platform/auth/rbac.ts`, `jwt.ts`
- `apps/api-core/src/platform/http/rate-limit.ts`, `security-headers.ts`
- `apps/api-core/src/modules/orders/{routes,service,repository,contract,events,model}.ts` (the reference module shape)
- `apps/api-core/src/platform/events/outbound-webhook.ts` (HMAC-signed adapter) + `ops/n8n/*.json` (version-controlled workflows) — when n8n is attached
- `.github/workflows/ci.yml`, `apps/api-core/Dockerfile`

## Reuse from existing code

- Estimation engine: `apps/api-elysia/src/modules/estimation/engine.ts` (+ test) — port near-verbatim into `shared/`.
- Error model: `apps/api-elysia/src/lib/errors.ts` → `platform/http/error-handler.ts`.
- Auth derive logic: `apps/api-elysia/src/lib/auth.ts` → `platform/auth/current-user.ts` (deps injected, secret from env).
- Test factories + request helper: `apps/api-elysia/src/test/{helpers,preload}.ts` → `test/setup/`.
- All module business logic: port each `service.ts` behind the new repository/contract layer.

## Verification

- **Boot**: `bun run dev` in `apps/api-core`; `GET /api/health` returns ok; boot **fails loudly** with `JWT_SECRET` unset (proves fail-fast).
- **Unit**: `bun test` green, no DB required.
- **Integration**: testcontainers Postgres up, migrations applied, real routes exercised (e.g. send-otp → verify-otp → create tank → place order → confirm delivery → assert RefillLogged event + estimation reset).
- **Security spot-checks**: exceed OTP send limit → 429; consumer token on retailer route → 403 via RBAC; oversized/extra-field body → 400 via strict validation; response carries security headers.
- **Type-check**: `tsc -b` clean. **CI**: workflow runs all gates green on a PR.

## Open items to confirm at implementation time

- Workspace name `apps/api-core` (vs reclaiming `apps/api`).
- CI target: GitHub Actions (planned) vs Jenkinsfile (global rules reference Jenkins/husky).
- Refresh-token storage model (DB table vs stateless rotation) — decide when porting `auth`.
- n8n: include in Phase-1 launch vs defer (event contracts make it a drop-in either way); self-hosted vs n8n Cloud.
