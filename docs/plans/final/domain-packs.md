# Domain-Packs Platform — Reference

> Part of the PreEmptly API final plan. See `00-README-index.md`. **Authoritative reference** for the kernel + core-domain + packs platform (promoted from `../draft/api-backend-domain-packs.md`, which is now provenance-only). The **how-to workflow** for expanding lives in `feature-expansion-playbook.md`; the **core-vs-pack rules** in `core-vs-pack-decision-guide.md`; this doc is the **what-it-is** reference.
> **Decisions (Phase 1):** build the **full pack system in Phase 1** (not just seams); a **fully-polymorphic JSON core** (`asset`/`service_request` + `vertical`/`type` discriminators + JSONB `attributes`, no per-pack tables) with the mitigations that keep weak-typing in check.

## Why net-new (the four vertical blockers in the as-built app)

Horizontally the app was already extractable (module `contract.ts`/`repository.ts`/events/DI). **Vertically** — adding a new *domain* — it was blocked by four things, all fixed by this platform:

1. **Hand-wired mounting** — modules were a manual `.use()` chain; no registry. → **pack registry**.
2. **Schema coupling** — `Order.tankId` required FK, `Order.capacityKg`, gas-flavored enums; a non-LPG vertical couldn't reuse `Order`. → **polymorphic `service_request`** (no tank FK).
3. **Hub imports** — `EstimationService` imported directly across modules. → **contracts/events + generalized `prediction`**.
4. **No enablement layer** — no `vertical` discriminator, no per-tenant flags. → **discriminators + entitlement gate**.

The bones were good (`User`/`Location`/`Retailer`/links/notifications are a reusable spine; the estimation math is already domain-agnostic), so this is a **reshape, not a rewrite**.

## Target architecture — kernel + core-domain + packs

```
packages/
  platform-kernel/   # infra: config, DI, db, redis, events, auth, rbac, policy,
                     #        http, logging, audit, otel  +  the PACK REGISTRY
  core-domain/       # generic polymorphic spine (vertical-agnostic):
                     #   identity · provider · place · asset* · service-request*
                     #   linking · notifications · pricing · prediction
  pack-lpg/          # vertical #1 — the current app, repackaged as a DomainPack
  pack-<vertical>/   # future: pack-security, pack-health, pack-home-services …
  shared-types/      # contracts + event + attribute schemas
apps/
  api-core/          # composes kernel + core-domain + ENABLED packs via the registry
```

> **Packaging is provisional (GAP-07 #2):** the **logical** three-layer split (kernel / core-domain / pack) is firm; whether it's `packages/*` workspace packages or in-app `apps/api-core/src/*` folders is a **deferred** decision. Paths above are illustrative logical placeholders. See the final plan's *Packaging note*.

- **`asset`** generalizes `Tank`: `{ id, placeId, vertical, type, attributes: Jsonb, … }`.
- **`service_request`** generalizes `Order`: `{ id, tenantId, customerId, providerId, vertical, type, lifecycleKey, status, attributes: Jsonb, … }` — **no required tank FK**.
- **`provider`** generalizes `Retailer` (already gas-free); **`place`** generalizes `Location`.

## The `DomainPack` contract

A pack exports one object implementing the plugin interface the kernel consumes:

```ts
interface DomainPack {
  key: string;                       // 'lpg' | 'security' | 'health' | …
  version: string;
  entitlement: string;               // subscription entitlement that enables it
  assetTypes: AssetTypeDef[];        // { key, attributesSchema: TSchema, … }
  requestTypes: RequestTypeDef[];    // { key, attributesSchema: TSchema, lifecycle: LifecycleDef }
  predictionModels?: ConsumptionModel[];
  events?: EventBinding[];           // publish/subscribe on the platform bus
  routes?: ElysiaPlugin;             // optional vertical endpoints, mounted at /v1/<key>
  notificationTemplates?: TemplateDef[];
  jobs?: ScheduledJob[];             // e.g. LPG preempty scan (single-runner, GAP-05)
}
```

> **Contract completeness (GAP-18) — must be extended before vertical #2:** the current contract lacks `pricingRules` (how a pack registers pricing into core `pricing`), `roles` (e.g. the LPG `rider`/generalized `fulfiller`, GAP-17), `migrations`/schema (a pack's typed side-table, §Open decisions), pack-specific `policies`, and a **core-contract-compatibility** field (packs version independently — see `db-migration-runbook.md` §Pack/extension versioning). These are the deferred-expansion prerequisites — see `feature-expansion-playbook.md` §Prerequisites.

## The registry (in `platform-kernel`)

Replaces hand-wired mounting. At boot, `api-core` hands the registry the set of packs; the registry:
1. filters to **enabled** packs (deployment config **×** per-tenant **entitlement**),
2. registers each pack's `assetTypes`/`requestTypes` **attribute schemas**, `lifecycles`, `predictionModels`,
3. subscribes its `events`, schedules its `jobs`, mounts its `routes` under `/v1/<key>`.

Adding a vertical = add a package to the registry list — **no change to core wiring**.

## Polymorphic JSON core — with the weak-typing mitigations

Vertical data is Postgres **JSONB `attributes`** with `vertical`/`type` as real discriminator columns. The two downsides of pure-JSON are bought back at the edges:

- **Typed at the edge:** every write validates `attributes` against the active type's pack-registered **TypeBox schema** (`additionalProperties:false`, format checks). Reads expose typed contracts from `shared-types`. Per-field placement (core column vs `attributes` vs `pricing`) follows RULE-PACK-02's data-shape test (GAP-20).
- **Query/perf escape hatch:** GIN-index `attributes`; promote a hot field to a Postgres **generated column** (`… GENERATED ALWAYS AS ((attributes->>'capacityKg')::numeric) STORED`) and index that — no per-pack table.

The accepted trade: **zero-migration new verticals** + **uniform cross-vertical features**, at the cost of typed columns, mitigated by TypeBox + generated columns.

## Per-vertical request lifecycles

`service_request.lifecycleKey` selects a state machine; each pack registers its lifecycle. Generalizing session 09's order saga into a **lifecycle registry** (with `lifecycleTemplate` **archetypes** above `lifecycleKey`, RULE-PACK-06). Two families coexist:
- **Delivery / visit** (LPG, home services): `placed → confirmed → assigned → out-for-delivery → delivered`.
- **Monitoring / subscription** (safety, health): `armed → triggered → acknowledged → resolved`, or visit/appointment flows.

## Generalized prediction

`core-domain/prediction` behind a `ConsumptionModel` interface (`rate`, `calibrate`); `pack-lpg` registers the kg/day rate table + cooking adjustments; the pure math stays vertical-agnostic; the eval/backtest harness (session 04) is vertical-neutral. Verticals with no consumption concept register no model.

## LPG as pack #1 — the port mapping (proves the core)

| Today (LPG) | Becomes |
|---|---|
| `Tank` | `asset(vertical='lpg', type='tank', attributes={capacityKg, model, usageLevel})` |
| `Order` (gas) | `service_request(vertical='lpg', type='refill', lifecycleKey='delivery')` |
| `RefillLog` / `AccuracyLog` | LPG domain events + `prediction_log` rows (GAP-07) |
| `Estimation` | `prediction` output for the tank asset (LPG `ConsumptionModel`) |
| discounts / preempty-zone scan | pack `pricing` rules + a pack `job` emitting `TankEnteredPreemptyZone` |
| `Retailer` / `Location` / `User` / links / notifications | reused from `core-domain` unchanged |

> **Vocabulary note (GAP-15/16/17):** several LPG names still sit in core-layer artifacts — the Phase-1 event set (`OrderPlaced`/`RefillLogged`/…) in core `shared-types`, tenancy keyed on `retailerId`, `rider` as a core role. These are **deferred-expansion debt** to clear before vertical #2 (see the playbook's Prerequisites).

## Tenancy / entitlement synergy

Because every row carries `tenantId` + `vertical`:
- **Entitlement per tenant enables a vertical** — the registry gates mounting and the write path rejects a vertical the tenant isn't entitled to. *(Entitlement has no RLS backstop yet — GAP-19.)*
- **Tenancy RLS is uniform** — one policy set on `asset`/`service_request` covers all verticals.
- **Cross-vertical features are uniform** — dashboards/billing/notifications/audit read the one `service_request` table across verticals.

## Open decisions

- **Packaging:** workspace packages vs in-app folders — **deferred/provisional (GAP-07 #2)**.
- **Prisma layout:** single schema vs `multiSchema` (`core` + per-pack) — the latter aligns with the split-ready seam.
- **Pure-JSON vs typed side-table:** JSONB-first; a pack side-table only behind an explicit exception (needs the `migrations` contract slot, GAP-18).
- **Shared vs per-pack lifecycles:** how much of `OrderStatus` becomes the canonical shared `delivery`/`visit` lifecycle (RULE-PACK-06).
- **Migration/backfill:** **resolved (GAP-01)** — pre-launch, no data to migrate; LPG lands fresh as `pack-lpg`.
- **Launch-timing risk:** building the platform before shipping LPG lengthens time-to-first-launch — ship `pack-lpg` on the core early while other packs stay theoretical.

## Verification — the acid test

- **A throwaway 2nd vertical:** stub `pack-water-tank`/`pack-security` **mounts, validates its `attributes`, runs its lifecycle, and is entitlement-gated — without touching kernel/core-domain/shared schema** (session 06). The pass/fail for "easily modularized."
- **LPG parity:** the full LPG flow works as `pack-lpg`; session-06 regression green.
- **Cross-vertical:** a dashboard query over `service_request` returns rows from two verticals; a non-entitled tenant is rejected.
- **Tenancy:** RLS isolates tenants across verticals (one policy set).
- **Typing/perf:** an invalid `attributes` payload is rejected at write; a hot LPG query uses the generated column, not a JSON scan.
