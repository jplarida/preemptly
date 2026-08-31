# Feature Expansion Playbook

> Part of the PreEmptly API final plan. See `00-README-index.md`. **The single "start here" doc when expanding.** It routes you to the right rules/steps rather than duplicating them: the *rules* live in `core-vs-pack-decision-guide.md` (`RULE-PACK-*`), the *platform reference* in `domain-packs.md`, the *feature-availing* flow in `10-billing-checkout.md`.
> Open this whenever you're about to add anything new — a vertical, a shared capability, or a feature inside a pack.

## Step 0 — Which kind of expansion is this?

| Shape | Example | Route |
|---|---|---|
| **A. New vertical / pack** | safety, health, home-services | §A (add-a-vertical) |
| **B. New shared capability** in core-domain | dispatch, tracking, media, ratings | §B (promote to core) |
| **C. New feature inside a pack** | a new LPG request type, a new attribute | §C (in-pack) |

Not sure if something is A/B/C? Run **`RULE-PACK-02`** (vocabulary · two-vertical · change-coupling · data-shape · truth-ownership). Process-shaped? Also run **`RULE-PACK-06`** (archetype test). The decision guide is the referee.

## The workflow (all shapes): Decide → Build → Avail → Prove

1. **Decide** — classify with `RULE-PACK-01…06`; record the verdict in the decision guide's **Trace**.
2. **Build** — §A/§B/§C below.
3. **Avail** — gate it by entitlement; if it's a paid feature, wire the subscribe-and-pay flow (`10-billing-checkout.md`).
4. **Prove** — the acid test (§Prove).

---

## §A — Add a new vertical (a `DomainPack`)

The payoff path (full contract + registry in `domain-packs.md`):

1. `implements DomainPack` in a new `pack-<vertical>`.
2. Define **asset/request TypeBox attribute schemas** (e.g. `sensor`, `incident`) — `additionalProperties:false`.
3. Register a **lifecycle**: reuse an existing **archetype template** (`visit`/`monitoring`) via `RULE-PACK-06`, or register a new one; add a `ConsumptionModel` if the vertical has a depletion concept.
4. Add **notification templates**, optional **routes** (`/v1/<key>`), optional **jobs** (single-runner, GAP-05), a **pricing rule** if priced, any **roles** it introduces, and an **entitlement** key.
5. Add the package to the **registry** list.

**No edits to `platform-kernel`, `core-domain`, or the shared schema** — if a step forces one, the boundary was drawn wrong (fix the seam, per `RULE-PACK`), *or* you've hit a Prerequisite below.

> ⚠️ **Prerequisites — clear these before vertical #2** (deferred-expansion gaps; today's contract can't fully express a clean second vertical):
> - **GAP-18** — extend the `DomainPack` contract: `pricingRules`, `roles`, `migrations`/schema, `policies`.
> - **GAP-15** — move LPG events (`OrderPlaced`/`RefillLogged`/…) out of core `shared-types`; core keeps generic `service_request` lifecycle events, packs own their domain events.
> - **GAP-16** — de-LPG the tenant key: `retailerId` → generic `tenantId`/`provider`.
> - **GAP-17 / GAP-14** — `rider` is LPG's `fulfiller`; make roles pack-contributed; settle the rider client surface.
> - **GAP-09-C / GAP-19** — build the entitlement store + give entitlement an RLS backstop.
> - **GAP-20** — apply the per-field data-shape ruling (core column vs `attributes` vs `pricing`).
> - **GAP-07 #2** — settle the packaging (packages vs in-app folders).
> These are tracked in `plan-review-gaps.md`; the playbook is their consumer.

## §B — Add a shared capability to core-domain

For something ≥2 verticals will use in the same shape (dispatch, tracking, media, ratings…):

1. Confirm it's core via `RULE-PACK-02` (majority "core"; must-not-vary ⇒ kernel).
2. **Split the feature** (`RULE-PACK-03`): the stable skeleton + a registry interface in core-domain; the variable part becomes a **pack registration** (e.g. dispatch skeleton in core, "who may be a fulfiller" as a pack guard).
3. **Timing** (`RULE-PACK-04`): build now only if it's a cheap-now/painful-later seam; otherwise wait for the **second real caller** — don't generalize on imagination.
4. Add a **Trace** row + (if process-shaped) an archetype-ledger row.

## §C — Add a feature inside a pack

Purely vertical-specific (a new LPG request type, a new tank attribute, a new pack job):

1. Add/extend the pack's `assetTypes`/`requestTypes` **attribute schema** (validated on every write).
2. If it needs a hot query field, promote it to a **generated column** (don't add a core column).
3. Register any new **lifecycle**/`job`/**template** on the pack; keep LPG vocabulary **inside the pack** (RULE-PACK-01 — no `switch (vertical)` in core).
4. No core/kernel/schema edits.

## §Avail — turn the feature on for a tenant

- **Entitlement gate:** the registry mounts a pack only for tenants entitled to it; the write path rejects a vertical a tenant isn't entitled to (`domain-packs.md` §Tenancy). *(Entitlement store + RLS backstop = GAP-09-C/GAP-19.)*
- **Paid feature-availing:** the self-serve subscribe-and-pay journey (catalog → hosted checkout → webhook activates `Subscription`/`Entitlement`) is in **`10-billing-checkout.md`**. Until it ships, availing is an operator/config entitlement toggle.

## §Prove — the acid test (session 06)

The objective pass/fail for "did we keep the boundary clean":
- A **throwaway stub vertical** (`pack-water-tank`/`pack-security`) **mounts, validates its `attributes`, runs its lifecycle, and is entitlement-gated — with zero edits to kernel/core-domain/shared schema.**
- **Grep gate:** no `switch (vertical)` / `if (vertical === …)` in kernel or core-domain (RULE-PACK-01/06).
- **Cross-vertical:** a dashboard query over `service_request` returns two verticals' rows; a non-entitled tenant is rejected.

## Map — where everything lives

| Need | Doc |
|---|---|
| Core vs pack **rules** + archetypes + Trace | `core-vs-pack-decision-guide.md` |
| Platform **reference** (kernel/core-domain/packs, `DomainPack`, registry, polymorphic core, tenancy) | `domain-packs.md` |
| **Feature-availing** / billing | `10-billing-checkout.md` |
| Lifecycle **templates/archetypes** build | `09-order-lifecycle-saga.md` |
| **Prerequisites** to a clean 2nd vertical | `plan-review-gaps.md` (GAP-15–20, 07 #2, 14, 09-C) |
| The **acid test** | `06-testing-and-ci.md` |
