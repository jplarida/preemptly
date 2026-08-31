# Session 09 — Order Lifecycle Saga / Process Manager

> Part of the PreEmptly API final plan. See `00-README-index.md`. **Depends on:** 03 (events/outbox/audit), 05 (orders/refills/estimation/notifications modules + wired events).
> Realizes backlog item **C3**. **Seam now, build later** — the events are made saga-ready in 03/05; this session builds the explicit process manager. **Optional for launch** (like n8n in 07); Temporal is the Phase-2 heavyweight option.
> In the domain-packs platform this is a **lifecycle registry** — one saga per `service_request.lifecycleKey`. The LPG `delivery` lifecycle is the first; each pack registers its own (e.g. monitoring/subscription flows for safety/health verticals). "Order" below = the `delivery` `service_request`.
> **Above `lifecycleKey` sits a `lifecycleTemplate` (process archetype) — see `core-vs-pack-decision-guide.md` RULE-PACK-06.** Many `lifecycleKey`s share one template: `delivery` (LPG) and `home-visit` (healthcare) are both the **`visit`** archetype. This session ships the `visit` template + the LPG `delivery` instance, and the shared **`dispatch`/`fulfiller`** capability the archetype needs — so a 2nd visit vertical is a lift-not-rewrite.

## Goal

Replace the implicit event *choreography* wired in session 05 with an explicit, observable **process manager** over the order lifecycle — one that owns the multi-step flow, its timeouts, and its compensations, without moving any system-of-record decision out of the owning modules. The saga coordinates; the modules still own their truth. Build it as a **lifecycle registry** keyed by `lifecycleKey` so packs register their own lifecycles; ship the `delivery` lifecycle (LPG) first.

Lifecycle modeled: `placed → confirmed → assigned → out-for-delivery → delivered → RefillLog written → estimation reset → customer notified`, with the failure/compensation branches that plain event fan-out cannot express. **Full states × transitions × guards × actors + timeouts/compensations in `delivery-lifecycle-state-machine.md`** (this saga is the process manager over that machine).

## Why a process manager (vs the 05 choreography)

Session 05 connects the flows event-to-event (`OrderPlaced` → … → `RefillLogged`). That works for the happy path but has no home for: a step that never fires (delivery never confirmed), a step that fails after a prior one committed (RefillLog write fails after estimation already reset), ordering/timeout rules, or a single place to see "where is order X stuck." The saga makes the flow a first-class, inspectable state machine.

## Lifecycle templates (archetypes) — the layer above `lifecycleKey`

Per RULE-PACK-06, a process-bearing vertical doesn't register a bespoke saga from scratch — it instantiates a **template** (an archetype). The registry therefore has two levels: `lifecycleTemplate` (the shared, parameterized state machine) → `lifecycleKey` (a pack's instance of it, supplying deltas).

- **`visit` template (this session):** `requested → scheduled → assigned → en-route → on-site → perform → complete → closed`, with `rescheduled / no-show / cancelled → compensation` branches. The template owns the state graph, transitions, timers/SLAs, saga persistence, and per-transition notification hooks.
- **LPG `delivery` = the `visit` instance:** registers its deltas only — `fulfiller = rider`, `perform = hand over cylinder + collect empty`, completion effect `RefillLogged → prediction reset`, no-show compensation `release rider + unlock discount`, and its `attributes` schema. **No copy of the state machine.**
- **Deltas are declared data + typed handlers** — `switch (vertical)` inside the template is a RULE-PACK-01 violation.
- **Second visit vertical (e.g. healthcare `home-visit`) is a lift, not a rewrite:** it reuses the `visit` template and supplies `fulfiller = nurse`, `perform = care plan + vitals`, guards (`credentialed`, `consentSigned`), completion `VisitNote → next visit scheduled`. Built in Phase 2; this session only proves the template + one instance.

### Shared `dispatch` / `fulfiller` capability (core-domain)

The `visit` archetype needs an assignment sub-capability. Generalize LPG's `rider` into a core-domain **`fulfiller`** (dispatch: offer → accept → assign → track), so every visit vertical inherits it and packs supply only who may be a fulfiller (credentialing guards). Tracking/ETA and proof-of-service are sibling visit-archetype sub-capabilities, promoted to core on their 2nd real caller (see the decision-guide Trace).

## Tasks

### Lifecycle template / archetype registry
- [ ] `platform/lifecycle/template.ts` — the `LifecycleTemplate` interface (states, transitions, guard slots, actor role, on-site/`perform` handler slot, compensation slots, SLA/timer defs) + a registry keyed by template name. `visit` is the first template.
- [ ] `packs/lpg` registers `delivery` as a `visit` **instance** (deltas only), not a hand-written saga — proves the template is truly parameterized.
- [ ] `core-domain/dispatch` — the generalized `fulfiller` assignment capability (`rider` becomes its LPG-named actor); contract + repository + events, tenant-scoped.
- [ ] **Grep gate:** no `switch (vertical)` / `if (vertical === …)` in `platform/lifecycle/*` or the template (RULE-PACK-01/06).

### Process manager
- [ ] `platform/saga/order-saga.ts` — a process manager subscribing to the lifecycle events from 03/05; advances an explicit per-order state machine keyed by `serviceRequestId` (the correlation id added in 05).
- [ ] `platform/saga/saga-store.ts` — persist saga instance state (current step, timestamps, attempt counts) so a restart resumes mid-flow. Add a `saga_state` table to `prisma/schema.prisma` (id, serviceRequestId, state, context JSON, updatedAt).
- [ ] **Idempotent transitions** — every step rides the existing outbox + `Idempotency-Key` machinery (03/02); re-delivered events must not double-advance the saga.
- [ ] **Timeouts / SLA escalation** — e.g. `confirmed` but not `out-for-delivery` within N minutes → emit an escalation event (retailer nudge / ops alert). Model timeouts as scheduled events (BullMQ repeatable/delayed job from the 03 seam), not in-process timers.
- [ ] **Compensation** — define compensating actions for the failure branches (e.g. RefillLog write fails after estimation reset → emit `RefillReconciliationNeeded`; delivery cancelled after assignment → release rider + unlock discount). Compensations are events, handled by the owning module — the saga never writes another module's tables.
- [ ] **Stuck-saga / dead-letter alerting** — surface instances parked past their SLA (feeds the ops automation in 07).

### Boundary (must hold)
- [ ] The saga **orchestrates, it does not own truth** — discount locking, estimation, order status all stay in their modules (mirrors the n8n rule in 07, but this saga is **internal**, in-process, and tested, not an n8n workflow).
- [ ] No cross-module DB access — the saga reacts to events and calls module `contract.ts` / emits events only.

### Phase-2 seam
- [ ] Evaluate **Temporal** (durable workflows: retries/timeouts/human steps handled for you) as a drop-in behind the same event interface. Document the migration path; do not adopt at launch. The in-process `order-saga.ts` and a future Temporal workflow implement the same lifecycle contract.

## Files (new/modified)

New: `apps/api-core/src/platform/saga/{order-saga.ts,saga-store.ts}`, `apps/api-core/src/platform/saga/order-saga.{unit,integration}.test.ts`; `apps/api-core/src/platform/lifecycle/template.ts` (+ registry) with the `visit` template; `packages/core-domain/dispatch/*` (the generalized `fulfiller` capability, + tests); the LPG `delivery` **instance** registration in `packages/pack-lpg`.
Modified: `prisma/schema.prisma` (add `saga_state`; `dispatch`/`fulfiller` tables — `rider` generalized); event registry in `packages/shared-types` (add escalation/compensation events + the `visit`-template transition events).

## Reuse

- Event flows + `withOutbox` from session 03; lifecycle events + `serviceRequestId` correlation from session 05.
- Existing order status transitions: `apps/api-elysia/src/modules/orders/` (the state set the saga formalizes — do not re-implement the transitions, react to them).

## Acceptance / verification

- Happy path: place → confirm → deliver drives the saga to a terminal state; `saga_state` reflects each step.
- **Resume on restart**: kill the process mid-flow → on restart the saga resumes from persisted state (no lost or double-advanced steps).
- **Timeout**: an order stuck at `confirmed` past the SLA emits the escalation event exactly once.
- **Compensation**: force a RefillLog write failure after estimation reset → the compensating event fires and the saga parks in a recoverable state, not a corrupt one.
- Idempotent: re-delivering a lifecycle event does not advance the saga twice.
- **Template instance (RULE-PACK-06):** LPG `delivery` runs entirely as a `visit`-template instance supplying deltas only — no hand-written state machine in `pack-lpg`.
- **Archetype acid test:** a stub `home-visit` `lifecycleKey` (fulfiller = nurse, `perform` = care-plan handler, a `credentialed` guard) mounts on the **same `visit` template** with zero edits to `platform/lifecycle/*` or `core-domain` — proving the archetype generalizes (ties to session 06's 2nd-vertical test).
- **Grep gate:** no `switch (vertical)` / `if (vertical === …)` in `platform/lifecycle/*` (RULE-PACK-01/06).
- Unit + integration green; `tsc -b` clean; CI security gates (06) pass.

## Notes

- This is the "build later" half of C3; the "seam now" half (events carry `serviceRequestId`/correlation + explicit states) lands in session 05, so this session is a clean drop-in whenever order-lifecycle failure handling starts to hurt.
- Keep it internal and tested — the reason critical orchestration stays here and only best-effort delivery goes to n8n (07).
