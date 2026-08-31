# Core-vs-Pack Decision Guide — `RULE-PACK-*`

> Part of the PreEmptly API final plan. See `00-README-index.md`. Cross-cutting — applies whenever a **new capability** is added, in any session. Companion to the **Platform** section of `../api-backend-final-plan.md`, the platform reference `domain-packs.md`, and the expansion how-to `feature-expansion-playbook.md`.
> Defines the **rules** for deciding where a capability lives (kernel / core-domain / pack) and a **trace** (the running ledger of decisions). Cite these like the other invariants (`RULE-EST-01`, `RULE-ORDER-01`).

## Why this exists

A platform of verticals only stays cheap-to-extend if the **shared/specific boundary** is drawn deliberately. Too much in packs → every vertical reinvents the same wheel. Too much in core → every vertical drags concepts it doesn't use, and "add a vertical" stops being free. These rules make the boundary a decision with a paper trail, not a case-by-case guess.

## The three tiers of sharing (recap)

| Tier | Package | Contains | Shared by |
|---|---|---|---|
| **Kernel** | `packages/platform-kernel` | cross-cutting infra, **zero domain** — config/DI, db, redis, events/outbox, auth, rbac, policy, tenancy/RLS, idempotency, rate-limit, audit, logging, otel, **registry** | everything, always |
| **Core-domain** | `packages/core-domain` | vertical-agnostic **domain** spine — identity, provider, place, asset, service-request, linking, notifications, pricing, prediction, billing | every vertical, by default |
| **Pack** | `packages/pack-<vertical>` | vertical-**specific** — LPG: tank asset-type, refills, riders, kg/day model, preempty scan | one vertical only |

"Determining a shareable feature" = deciding which tier a capability belongs in.

---

## RULE-PACK-01 — Tier boundary & the extension law

A capability lives in exactly one tier: **kernel** (infra every request needs), **core-domain** (a domain concept ≥2 verticals need in the same shape), or **pack** (one vertical). **A new vertical must mount with zero edits to kernel, core-domain, or the shared schema** — it may only *add* a `packages/pack-*` and register it. Core is **closed for modification, open for extension**: a `switch (vertical)` / `if (vertical === 'lpg')` inside kernel or core-domain is a **rule violation**, not a shortcut.

## RULE-PACK-02 — Determination tests

Run these on any candidate capability. Majority "core" ⇒ core-domain; any "must never vary" ⇒ kernel; otherwise ⇒ pack. Record the votes in the **Trace** below.

1. **Vocabulary** — describable without a vertical-specific noun? ("charge a subscription", "notify a user" = core; "refill a tank", "kg/day" = pack).
2. **Two-vertical (rule of three)** — would a genuinely different 2nd vertical (safety/health/home-services) use it essentially unchanged? ≥2 same-shape consumers ⇒ core.
3. **Change-coupling** — would adding a new vertical force an edit to this code? If yes, it isn't core (vertical knowledge is leaking in) — see RULE-PACK-01.
4. **Data-shape** — operates on the polymorphic core tables (`asset`/`service_request`: `vertical`/`type` + JSONB `attributes` validated against a declared schema) ⇒ core; needs a bespoke table ⇒ pack.
5. **Truth-ownership** — must it behave *identically* for every request regardless of vertical (tenancy, auth, idempotency, audit)? ⇒ **kernel**, not even core-domain.

## RULE-PACK-03 — Split the feature: skeleton in core, variation in a pack

Do **not** classify whole features as entirely core or entirely pack. Almost every capability is a **stable skeleton (core) + a pluggable variable part (pack)**. Find the seam: the invariant becomes a **core interface + registry entry**; the variation becomes a **pack registration**. Established seams to copy:

- **Prediction** — engine + eval harness + `ConsumptionModel` interface (core); kg/day cooking model (pack).
- **Lifecycle** — saga/process-manager **lifecycle registry** (core, session 09); `delivery` state machine (pack), `monitoring` for a health vertical.
- **Asset/request** — table + validation + tenancy (core); the `tank` `attributes` TypeBox schema (pack).

A capability is "adoptable by others" precisely when a new vertical can adopt the skeleton and supply only its delta.

## RULE-PACK-04 — Promotion timing (build-now vs wait)

Where a capability lives is a classification; *when* to build it in core is a separate call.

- **Build in core now** only if (a) the first vertical needs it *and* it's obviously generic (identity, tenancy, notifications), **or** (b) it's a **cheap-now / painful-to-retrofit seam** (outbox, idempotency, registry, polymorphic tables). Tag `[Now]`.
- **Otherwise leave it in the pack and wait** — build it where it's first needed; when the **second real consumer** appears, extract the stable half to core behind a `contract.ts`/interface (RULE-PACK-03). Tag `[Seam now, build later]` or `[Phase 2]`.
- **Never generalize on imagination** — generalize on the second *real* caller. Premature abstraction is a real cost (the final plan's launch-timing risk).

## RULE-PACK-05 — The acid test is the referee; keep the Trace

Session 06's throwaway-second-vertical acid test is the objective check on every boundary call: if standing up a stub `pack-security`/`pack-water-tank` forces a change to kernel/core-domain/shared schema, **the boundary was drawn wrong** — move the seam (RULE-PACK-03), don't patch core. Every new capability MUST be added to the **Trace** below with its RULE-PACK-02 votes and verdict, so the boundary stays auditable rather than folk knowledge.

## RULE-PACK-06 — Process archetypes & lifecycle templates

RULE-PACK-03 splits a *capability* into skeleton + variation. This rule applies the same move one level up, to **whole processes**: most process-bearing verticals are instances of a **small set of archetypes**, and each archetype is **one parameterized lifecycle template** — a layer *above* `lifecycleKey` (session 09). Multiple `lifecycleKey`s share a template; e.g. LPG `delivery` and home-healthcare `home-visit` are both the **`visit`** template. Its state graph, transitions, timers/SLAs, saga persistence, and the shared sub-capabilities (dispatch, tracking, proof-of-service, per-transition notifications) are written **once**; each pack registers only its **deltas** (states added, guards, actor role, the on-site/perform handler, compensations, required `attributes`).

**The archetype test** (add to RULE-PACK-02 for process capabilities): strip every vertical noun and write the state machine in neutral verbs. If two verticals' stripped machines are the **same sequence with the same actor-roles and the same compensation points**, they share an archetype ⇒ one template. If the *sequence itself* differs (a monitoring flow has no travel/on-site), they don't ⇒ different template. The referee is the **shape of the state graph**, not surface similarity.

**Discipline (or this becomes a god-lifecycle):**
- **One template per archetype, never a universal engine.** `visit`, `monitoring`, `booking`, `case` are separate templates. Forcing a monitoring flow through `visit` is the anti-pattern.
- **Deltas are declared data + typed handlers, never `switch (vertical)` inside the template** (RULE-PACK-01).
- **Build the seam now, extract the template on the second real caller** (RULE-PACK-04): design LPG `delivery` with its states/actors/guards/compensations as *declared data* so the shared `visit` template is a lift-not-rewrite when the 2nd visit vertical lands. Do **not** build the generic template speculatively.
- **Regulatory/clinical weight is a guard, not a fork.** Credentialing, consent, clinical records fill the template's `guards`/`required-attributes` slots — they don't justify a separate skeleton.

**Archetype catalog** (the known process shapes):

| Archetype | Neutral skeleton | Instances |
|---|---|---|
| **visit / fulfillment** | request → dispatch fulfiller → travel → on-site → perform → complete (+reschedule/no-show/cancel) | LPG `delivery`, home-healthcare `home-visit`, home-services, field inspection, courier |
| **monitoring / subscription** | subscribe → active → periodic events → renew/lapse (no visit) | alarm monitoring, health vitals, SaaS |
| **appointment / booking** | book slot → consumer arrives at provider → serve → close | clinic visit, salon |
| **case / ticket** | open → triage → work → resolve | incident response, support |

### Archetype ledger

Archetype applies only to **process-bearing** capabilities, so it lives here (a column on every Trace row would be empty for notifications/pricing/audit). Add a row when a vertical's lifecycle is introduced.

| `lifecycleKey` | Archetype (template) | Actor (fulfiller) | On-site / perform step | Completion effect | Status |
|---|---|---|---|---|---|
| `delivery` (LPG) | `visit` | rider | hand over cylinder, collect empty | `RefillLogged` → prediction reset | `[Seam]` 09 |
| `home-visit` (health) | `visit` | nurse / care-worker | perform care plan, capture vitals | `VisitNote` logged → next visit scheduled | `[Phase 2]` example |
| `monitoring` (safety) | `monitoring` | — (passive) | n/a | alert on threshold event | `[Phase 2]` example |

---

## Trace — capability classification ledger

Append one row per capability as it's introduced. Votes are RULE-PACK-02 tests: **Voc**(abulary), **2V** (two-vertical), **Chg**(-coupling: does a new vertical edit it? "no" is good), **Data**(-shape), **Own**(ership). Status: `built` / `[Now]` / `[Seam]` / `[Phase 2]` / `stays pack`.

| Capability | Voc | 2V | Chg | Data | Own | Verdict | Status | Notes |
|---|---|---|---|---|---|---|---|---|
| Identity / auth | neutral | yes | no | core | must-not-vary | **kernel + core** | `[Now]` 02 | identity in core-domain; auth mechanics in kernel |
| Tenancy / RLS / policy | neutral | yes | no | core | must-not-vary | **kernel** | `[Now]` 01/02 | one policy set, all verticals |
| Events / outbox / idempotency | neutral | yes | no | core | must-not-vary | **kernel** | `[Now]` 02/03 | painful-to-retrofit seam |
| Audit (hash-chained) | neutral | yes | no | core | must-not-vary | **kernel** | `[Now]` 02/03 | |
| Notifications | neutral | yes | no | core | — | **core-domain** | `[Now]` 05 | templates declared per pack |
| Pricing | neutral | yes | no | core | — | **core-domain** | `[Now]` 05 | |
| Prediction | neutral | yes | no | core | — | **core-domain** | `[Now]` 04 | `ConsumptionModel` interface; kg/day is pack (RULE-PACK-03) |
| Lifecycle registry | neutral | yes | no | core | — | **core-domain** | `[Seam]` 09 | `delivery` lifecycle is pack |
| Asset / service-request | neutral | yes | no | core | — | **core-domain** | `[Now]` 01/05 | polymorphic core tables |
| Billing / checkout | neutral | yes | no | core | — | **core-domain** | `[Phase 2]` 10 | `paymentProvider` port |
| Scheduling / jobs (cron→BullMQ) | neutral | yes | no | core | must-not-vary | **kernel** | `[Seam]` 03 | |
| Rider assignment | delivery-ish | delivery only | no* | pack | — | **pack now → shared `dispatch` skeleton** | stays pack | *`rider` is the LPG naming of the `visit`-archetype fulfiller; promote skeleton on 2nd visit vertical (RULE-PACK-03/06) |
| Dispatch / `fulfiller` | neutral | every `visit` vertical | no | core | — | **core-domain** | `[Seam]` 09 | generalizes `rider`; the visit archetype's assignment sub-capability (RULE-PACK-06) |
| Tracking / ETA | neutral | every `visit` vertical | no | core | — | **core-domain** | `[Phase 2]` | visit-archetype sub-capability; promote on 2nd caller |
| Proof-of-service (photo/signature/scan) | neutral | every `visit` vertical | no | core | — | **core-domain** | `[Phase 2]` | visit-archetype sub-capability; preempty scan is the LPG delta |
| Preempty low-gas scan | LPG | no | n/a | pack | — | **pack** | stays pack | LPG-specific |
| Geocoding / delivery zones | neutral | delivery verticals | no | core | — | **core-domain** | `[Phase 2]` | promote on 2nd delivery vertical |
| Media / attachments | neutral | yes | no | core | — | **core-domain** | `[Phase 2]` | promote on 2nd real use |
| Ratings / reviews | neutral | yes | no | core | — | **core-domain** | `[Phase 2]` | promote on 2nd real use |
| Consent / documents (RA 10173) | neutral | yes | no | core | must-not-vary | **kernel/core** | `[Phase 2]` | bring forward if launching publicly |

## Verification (ties to session 06)

- Every capability added since the last review has a **Trace row** with RULE-PACK-02 votes.
- The **acid test** (stub 2nd vertical mounts + validates + runs its lifecycle + is entitlement-gated with **zero** kernel/core/schema edits) passes — the objective proof RULE-PACK-01 held.
- No `switch (vertical)` / `if (vertical === …)` exists in `platform-kernel` or `core-domain` (grep gate — RULE-PACK-01).
