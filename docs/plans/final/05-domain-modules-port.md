# Session 05 — Domain Modules Port

> Part of the PreEmptly API final plan. See `00-README-index.md`. **Depends on:** 02 (auth/policy/idempotency), 03 (bus/outbox/audit), 04 (engine).
> The largest body of work — best done as **one PR per module**, following a fixed anatomy. Treat each module as its own mini-session.

## Goal

Port every domain module from `apps/api-elysia` into the new split-ready shape, **landing generic capability in `core-domain` and LPG-specific capability in `pack-lpg`** (the first `DomainPack`). Convert cross-module calls to contracts/events, enforce the **three tenancy axes**, and validate polymorphic `attributes` against each type's TypeBox schema. Fix the known IDOR in `orders`.

## Two homes (core-domain vs pack-lpg)

| Lands in `core-domain` (vertical-agnostic) | Lands in `pack-lpg` (LPG-specific) |
|---|---|
| identity/auth (02), users, `provider` (← retailers), `place` (← locations), `linking`, `service-request` (← orders), `pricing` (← discounts), `notifications`, `prediction` (04), health | `asset` type `tank` (← tanks), `refills`, `riders`, the kg/day `ConsumptionModel`, the preempty scan `job`, the `delivery` lifecycle wiring |

**LPG-as-pack mapping:** `Tank → asset(vertical='lpg',type='tank',attributes={capacityKg,model,usageLevel})`; gas `Order → service_request(vertical='lpg',type='refill',lifecycleKey='delivery')`; `RefillLog` → LPG events + the legacy `AccuracyLog` concept → the core-domain `prediction_log` (see GAP-07); discount/preempty logic → `pricing` rules + a pack `job`. Rebuilding today's app entirely as `pack-lpg` on the generic core is the proof the core is domain-neutral.

> **Endpoint contract:** the core endpoint inventory (method · path · role · axis) is in `api-surface.md`; pack-lpg endpoints (refills/rider/preempty) are the deferred extensions there.

## Module anatomy (repeat for each)

```
modules/<module>/
  <module>.routes.ts        # thin: strict validation + requireRole + object-policy + delegate
  <module>.service.ts       # business logic — depends on repository + bus PORTS, never prisma
  <module>.repository.ts    # the ONLY place this module's tables are touched; publishes via withOutbox
  <module>.model.ts         # TypeBox schemas, additionalProperties:false, +63 phone format
  <module>.contract.ts      # PUBLIC interface other modules call (the extraction seam)
  <module>.events.ts        # events this module publishes/subscribes
  <module>.unit.test.ts     # mocked repo + bus
  <module>.integration.test.ts  # real Postgres via app.handle
```

Per-module checklist: strict models · **an `erase(userId)`/`anonymize(userId)` op on the module's `contract.ts`** that erases only this module's slice (RA 10173 erasure fans out via contracts — no cross-module DB access; see `data-privacy-erasure-retention.md`, GAP-06) · `requireRole` (actually applied) + **the three tenancy axes on every access** — collection queries tenant-scoped (`providerId`/`userId`), by-id ops call `assertProviderTenant`/`assertOwner`, provider↔consumer reads call `assertLinked` · polymorphic `attributes` validated against the type's TypeBox schema · idempotency on mutations · cross-module needs go through the other module's `contract.ts` or an event (never its tables) · state changes emit events via `withOutbox` · unit + integration tests.

## Port order (dependency-first, one PR each)

1. [ ] `users`, `locations`
2. [ ] `tanks`, `estimation` (stateful service wraps the `core-domain/prediction` engine from 04)
3. [ ] `refills` — subscribes to `DeliveryConfirmed`, emits `RefillLogged`
4. [ ] **`orders` — FIX THE IDOR**: `GET /:id` (and all by-id ops) must assert ownership/tenant via `policy.ts`. **Transitions enforce `delivery-lifecycle-state-machine.md`** (states × transitions × guards × actors; invalid → 409). Emits `OrderPlaced`; discount locked at creation (RULE-ORDER-02); single DB status + role labels (RULE-ORDER-01); `PENDING_SMS` never persisted (RULE-OFFLINE-01). **Offline replay (GAP-02, `offline-sync-contract.md`):** create accepts a **client-supplied UUIDv7 id + `Idempotency-Key`** and treats a repeat as idempotent (returns the same order); **reject the `PENDING_SMS` enum on write**; **validate order state transitions** (offline `cancel` of an already-delivered order → 409, surfaced); on replay **honour the client-locked discount only if within the retailer's current bounds** (RULE-ORDER-02 × stale cached settings), else clamp/flag; record `clientCreatedAt` alongside server `receivedAt`.
5. [ ] `retailers`, `riders`, `linking`
6. [ ] `discounts`
7. [ ] `notifications` — subscribes to order/refill events; keep delivery thin (real FCM/SMS fan-out can move to n8n in 07). Owns `DeviceToken` exclusively. **Full contract in `notifications-comms-spec.md`** (catalog, channel routing + SMS fallback, preferences/opt-out + quiet hours, edge-triggered preempty alert, idempotent handlers, templates/localization). **DeviceToken lifecycle (GAP-10):** register on login, support **multiple tokens per user** (multi-device), refresh on FCM token rotation, and **prune tokens FCM reports unregistered** (on send failure); tokens hard-deleted on erasure (GAP-06).

## Event wiring (after modules land)

- [ ] Connect the flows using **generic core events + pack events (GAP-15)**: core `ServiceRequestCreated` / `ServiceRequestStatusChanged` drive notifications; `pack-lpg` emits `RefillLogged` / `TankEnteredPreemptyZone` and resets core `prediction` via its **contract** (pack→core, never core→pack).
- [ ] Move the estimation scheduler's **notification half** behind an event: it computes who's in the preempty zone (stays server-side, uses the engine + provider threshold) and **emits `TankEnteredPreemptyZone`** (a `pack-lpg` event, GAP-15) instead of calling `NotificationsService` directly — so it can later become a worker or n8n trigger. **Single-runner + edge-triggered (GAP-05):** the scan runs **exactly once per tick across instances** (single-runner mechanism from 03) and emits `TankEnteredPreemptyZone` **only on transition *into* the zone** — track per-tank "already-alerted" state so a tank that stays in-zone does **not** re-alert every tick (edge- not level-trigger). The preempty **day-countdown and discount windows use `APP_TZ` (Asia/Manila) day boundaries (GAP-21), not UTC.** Reset the flag when a refill moves the tank out of the zone.
- [ ] **Saga seam (for session 09):** make lifecycle events **saga-ready** — every `ServiceRequestStatusChanged` event carries the `serviceRequestId` as a stable correlation id, and status transitions use an explicit, named state set (the `delivery` lifecycle). This is the "seam now" half of backlog C3; the explicit process manager is built in session 09 and needs nothing more than these two properties.

## Reuse

- Each module's business logic: port `apps/api-elysia/src/modules/<module>/service.ts` behind the new repository/contract/outbox layer.
- Cron scan logic: `apps/api-elysia/src/modules/estimation/scheduler.ts` (keep the scan, replace the direct notify call with an event).
- Notification stubs: `apps/api-elysia/src/modules/notifications/service.ts`.

## Acceptance / verification (per module + end-to-end)

- Each module: unit + integration green; **object-policy blocks another actor's object (403)**; strict validation rejects extra fields (400).
- **Orders IDOR closed**: user A requesting user B's order id → 403.
- End-to-end integration: send-otp → verify-otp → create tank → place order → confirm delivery → assert `RefillLogged` (via outbox) + estimation reset.
- **Tenancy:** list endpoints return only the caller's tenant rows; `assertLinked` gates retailer↔consumer reads; RLS backstops (a query with its `where` removed still isolates).
- **Pack shape:** LPG data lands as `asset`/`service_request` with `vertical='lpg'`; an invalid `attributes` payload is rejected at write; no LPG term leaks into `core-domain`.
- **Scheduler (GAP-05):** the preempty scan fires **exactly once per tick** across N instances; a tank already in the preempty zone does **not** re-alert on subsequent ticks (edge-triggered); the scan handler is idempotent.
- No module imports another module's prisma models (enforced by review + repository boundary).
- `tsc -b` clean; CI security gates green.

## Notes

- Land modules behind the CI from session 06 so each PR is gated.
- Keep `contract.ts` minimal — only what other modules genuinely call.
- **Money (GAP-24):** all monetary values (order amount, discount, pricing) are **integer minor units (centavos)** with an explicit **`PHP`** currency (matching billing's `priceMinor`); TypeBox `integer` schemas; **never floats**; discount math rounds to the centavo at computation.
