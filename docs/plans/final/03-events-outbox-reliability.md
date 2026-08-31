# Session 03 — Events, Outbox & Reliability

> Part of the PreEmptly API final plan. See `00-README-index.md`. **Depends on:** 01 (kernel, prisma, redis).
> The messaging backbone that makes the system both split-ready and crash-safe. Everything async rides this.

## Goal

Replace fire-and-forget coupling with a typed event bus fronted by a **transactional outbox**, so "state changed ⟺ event emitted" holds even across crashes — and so any module can later be split out by swapping the bus transport. Add the resilience primitives around external calls.

## Tasks

### Event bus + outbox
- [ ] `platform/events/bus.ts` — `EventBus` interface (`publish`/`subscribe`) + a **typed event registry**; every event carries a stable id.
- [ ] `platform/events/in-memory-bus.ts` — default single-instance impl.
- [ ] `platform/events/outbox.ts` — write the event to an `outbox` table **in the same DB transaction** as the state change (a `withOutbox(tx, event)` helper modules call from their repositories).
- [ ] `platform/events/relay.ts` — poll/stream outbox rows and deliver to the bus (and later the webhook adapter/queue) **at-least-once**, marking delivered; retriable.
- [ ] Add the `outbox` table to `prisma/schema.prisma` (id, type, payload, createdAt, deliveredAt, attempts).
- [ ] **BullMQ seam** — keep `relay`/bus behind the interface so swapping in-memory → BullMQ (Redis) durable queue with backoff + DLQ is a binding change. (Build BullMQ now or defer per open items.)
- [ ] **Scheduled jobs are single-runner (GAP-05)** — the preempty-zone scan (and any future cron) must execute **exactly once per tick across N instances**, never once-per-pod. MVP mechanism: a **Redis distributed lock** (`SET NX PX` + fencing token) around the in-app scheduled tick — only the lock holder runs it (Redis is a `[Now]` dep, so no new infra). **Upgrade path:** a **BullMQ repeatable job** (dedup by repeat key; one worker processes) when BullMQ lands, or a **K8s CronJob** hitting a `service`-role `/internal/jobs/*` endpoint (decouples the scan from app instances — aligns with "scan becomes a worker/n8n trigger", 05/07). The job **handler must be idempotent** regardless of mechanism.

### Audit
- [ ] `platform/audit/audit.ts` — **append-only, hash-chained** audit sink (each row hashes the previous). Subscribes to security-relevant events: auth events, order status transitions, discount overrides, retailer-settings changes. Add `audit_log` table. **Invariant — no PII in audit (GAP-06):** store IDs + event types only, never phone/name/address. This is what lets RA 10173 erasure (anonymize a user to a tombstone) coexist with the tamper-evident chain — the chain never needs editing. See `data-privacy-erasure-retention.md`. **Post-restore (GAP-08):** re-verify the chain after any PITR restore (a restore rewinds it) and treat the restore as an audited event; optionally anchor the chain head off-site. **Across splits (GAP-13):** audit stays a **centralized sink with one chain** — a split-out service emits audit events over the bus to the central audit service rather than starting its own chain, preserving a single tamper-evident chain.

### Resilience
- [ ] Circuit breakers + timeouts around external calls (Semaphore/FCM) via **Cockatiel** or **p-retry**.
- [ ] Confirm graceful shutdown (from 01) flushes the relay/queue before exit.

### Event contracts (GAP-15 — generic core events, LPG events in the pack)
- [ ] **Core generic lifecycle events** in `packages/shared-types`: **`ServiceRequestCreated`** and **`ServiceRequestStatusChanged`** (carry `vertical`/`type`/`lifecycleKey`/`from`/`to`/`serviceRequestId`) — the vertical-agnostic spine any pack emits. **LPG-domain events live in `pack-lpg`** (`RefillLogged`, `TankEnteredPreemptyZone`), **not** core `shared-types`.
- [ ] Document the Phase-1 flows in these terms:
  - `ServiceRequestCreated`(lpg/refill) → **notifications** notifies the provider (pack-provided template)
  - `ServiceRequestStatusChanged`(→`delivered`, `lifecycleKey='delivery'`) → `pack-lpg` `refills` writes `RefillLog`, emits pack **`RefillLogged`**, and calls the core `prediction` **contract** to reset
  - pack `RefillLogged` → notifications notifies the consumer
  - pack `TankEnteredPreemptyZone` (from the preempty scan job) → preempty low-gas alert
- [ ] **Notifications subscribes to the generic events** and picks the **pack-provided template** per `(vertical, status)` — packs drive their own notifications with no core edits (RULE-PACK). Dependency direction stays pack→core (packs call core contracts; core never imports a pack event).

### Trace & causation propagation (GAP-09)
- [ ] The **event envelope carries** `traceparent` (W3C trace context), `correlationId` (root = the inbound request-id from session 01), and `causationId` (the event/command that caused this one).
- [ ] The **outbox stores** the trace context with the row; the **relay restores** it on delivery so a consumer's span links to the producer's trace across the async hop (OTel context propagation) — so `OrderPlaced → notify → RefillLogged → estimation reset → n8n dispatch` reads as **one traceable causal chain**, not disconnected spans.

## Files (new/modified)

New: `apps/api-core/src/platform/events/{bus.ts,in-memory-bus.ts,outbox.ts,relay.ts}`, `apps/api-core/src/platform/audit/audit.ts`, event schemas in `packages/shared-types`.
Modified: `prisma/schema.prisma` (add `outbox`, `audit_log`).

## Acceptance / verification

- A state change + its event commit atomically: force an error after the state write but before delivery → on restart the relay still delivers (no loss); duplicate delivery is idempotent downstream.
- **Crash test**: kill the process mid-flow → pending outbox event is delivered on restart.
- Audit rows chain-verify (tampering breaks the hash chain).
- Circuit breaker opens on repeated Semaphore/FCM failure and recovers.
- Unit + integration tests green; `tsc -b` clean.

## Notes

- Modules (session 05) publish **only** via `withOutbox` — never call the bus directly inside a transaction.
- **Handler idempotency (GAP-25):** the relay is **at-least-once**, so **every event subscriber must be idempotent — dedup on the event id** (a processed-events ledger or natural idempotency). A redelivered event must cause a **single effect** (double-notify / double-`RefillLog` are the failure). Session 06 tests redelivery.
- This session unblocks the event-driven parts of every module and the n8n integration (07).
