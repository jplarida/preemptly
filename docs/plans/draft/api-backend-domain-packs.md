# PreEmptly API — Domain-Packs Platform (Modularity & Vertical Extensibility)

> **⚠️ SUPERSEDED / PROMOTED (2026-07-19)** — the authoritative version now lives in **`../final/domain-packs.md`** (platform reference) with the expansion how-to in **`../final/feature-expansion-playbook.md`**; also consolidated into `../api-backend-final-plan.md` (Platform section) and woven into sessions 01/04/05/06/09. This draft is provenance-only — read the `final/` docs for the live version.
>
> **Status:** Draft · **Date:** 2026-07-16 · **Coverage:** preempty:default
> Companion to the greenfield + tenancy drafts. Turns PreEmptly from "an LPG app" into a **platform of domain verticals** where LPG is pack #1. Meant for consolidation into `../api-backend-final-plan.md`; it **reshapes** Phase-1 sessions (§11).
> Real code lives at `D:\Personal\projects\preempty`.
>
> **Decisions taken (this session):** (1) build the **full pack system in Phase 1** (not just reserve seams); (2) a **fully-polymorphic JSON core** (generic `asset`/`service_request` + `vertical` discriminator + JSONB `attributes`, no per-pack tables) — designed here **with** the mitigations that keep weak-typing in check.
>
> **Priority tags:** **[Now]** = Phase-1 · **[Seam now, build later]** · **[Phase 2+]**.

---

## 1. Is the app easily modularized today?

**Horizontally — yes (already handled).** The greenfield plan's module anatomy (`contract.ts` / `repository.ts` / events / DI) already makes a *single* module extractable into its own service. That is not the gap.

**Vertically — no.** Adding a whole new **domain** (safety/security, health, home services) is blocked by four concrete things in the as-built app:

1. **Hand-wired mounting** — modules are a manual `.use()` chain in `apps/api-elysia/src/index.ts:42-54`; no registry, no config/convention, no auto-discovery. A new vertical means editing central wiring.
2. **Schema coupling** — `lib/*` is domain-clean, but `prisma/schema.prisma` bakes LPG in: `Order.tankId` is a **required** FK (`:163/183`), `Order.capacityKg:169` is kg-shaped, `Location.tanks:35`, and the global enums (`:243-293`) are gas-flavored. A non-LPG vertical **cannot reuse `Order`**.
3. **Hub imports** — `EstimationService` is imported directly by orders/riders/retailers/tanks/refills/scheduler (`orders/service.ts:3-5`, `riders/service.ts:3-4`, `estimation/scheduler.ts:5`). Modules are not self-contained.
4. **No enablement layer** — no `vertical`/`domain` discriminator, no metadata escape hatch, no per-tenant feature flags. The data layer is single-bound to LPG.

**But the bones are good:** `User`, `Location`, `Retailer` (a bare provider — *zero* gas columns), `CustomerRetailerLink`, `Notifications`, `OtpCode`, `DeviceToken` are a reusable spine, and the **estimation engine's math is already domain-agnostic** (`engine.ts:28-105` — "time to depletion at a per-day rate, calibrated by observed cycles"); only its kg/day rate table and cooking labels are LPG. So the platform is a reshape, not a rewrite.

## 2. Target architecture — kernel + core-domain + packs

Three layers plus the composition app:

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

- **`asset`** generalizes `Tank`: `{ id, placeId, vertical, type, attributes: Jsonb, … }`.
- **`service_request`** generalizes `Order`: `{ id, tenantId, customerId, providerId, vertical, type, lifecycleKey, status, attributes: Jsonb, … }` — **no required tank FK**; the subject lives in `attributes`/relations the pack defines.
- **`provider`** generalizes `Retailer` (already gas-free); **`place`** generalizes `Location`.

## 3. The `DomainPack` contract

A pack is a package that exports one object implementing the plugin interface the kernel consumes:

```ts
interface DomainPack {
  key: string;                       // 'lpg' | 'security' | 'health' | …
  version: string;
  entitlement: string;               // subscription entitlement that enables it (tenancy draft)
  assetTypes: AssetTypeDef[];        // { key, attributesSchema: TSchema, … }
  requestTypes: RequestTypeDef[];    // { key, attributesSchema: TSchema, lifecycle: LifecycleDef }
  predictionModels?: ConsumptionModel[];
  events?: EventBinding[];           // publish/subscribe on the platform bus
  routes?: ElysiaPlugin;             // optional vertical endpoints, mounted at /v1/<key>
  notificationTemplates?: TemplateDef[];
  jobs?: ScheduledJob[];             // e.g. LPG preempty scan
}
```

Everything vertical-specific is declared here; nothing about a pack requires editing the kernel or core.

## 4. The registry (in `platform-kernel`)

Replaces the hand-wired `index.ts`. At boot, `api-core` hands the registry the set of packs; the registry:

1. filters to **enabled** packs (deployment config **×** the caller's per-tenant **entitlement** — §9),
2. registers each pack's `assetTypes`/`requestTypes` **attribute schemas**, `lifecycles`, and `predictionModels`,
3. subscribes its `events`, schedules its `jobs`, and mounts its `routes` under `/v1/<key>`.

Adding a vertical = add a package to the registry list (or drop it in a discovered folder) — **no change to core wiring**.

## 5. Polymorphic JSON core — with the weak-typing mitigations

The core stores vertical data as **Postgres JSONB `attributes`** with `vertical` + `type` as real discriminator columns. The two well-known downsides of pure-JSON are mitigated by design:

- **Typed at the edge (validation is centralized, not absent).** Every write validates `attributes` against the active type's **TypeBox schema** registered by the pack (`additionalProperties:false`, format checks). Reads expose typed contracts from `shared-types`. So "validation lives only in app code" becomes "one schema per type, enforced on every write" — the same strictness the plan already mandates for route bodies, applied to `attributes`.
- **Query/perf escape hatch.** GIN-index `attributes`; when a pack needs to filter/sort on a hot field, promote it to a Postgres **generated column** derived from JSONB (e.g. `lpg_capacity_kg GENERATED ALWAYS AS ((attributes->>'capacityKg')::numeric) STORED`) and index that. Hot paths stay indexed without a per-pack table.

This is the trade the decision accepts: **zero-migration new verticals** and **uniform cross-vertical features** (§9), at the cost of typed columns — bought back at the edges by TypeBox + generated columns.

## 6. Per-vertical request lifecycles

`service_request.lifecycleKey` selects a state machine; each pack registers its lifecycle and — generalizing **session 09's order saga** into a **lifecycle registry** — a process manager per key. Two families coexist:

- **Delivery** (LPG, home services): `placed → confirmed → assigned → out-for-delivery → delivered` (today's `OrderStatus`, which is already delivery-shaped, becomes the shared `delivery` lifecycle).
- **Monitoring / subscription** (safety/security, health): no "out for delivery" — e.g. `armed → triggered → acknowledged → resolved`, or visit/appointment flows.

A pack picks an existing lifecycle or registers its own; the saga engine and audit trail are shared.

## 7. Generalized prediction

Port `estimation/engine.ts` into `core-domain/prediction` behind a small interface:

```ts
interface ConsumptionModel {
  key: string;                        // 'lpg.kg-per-day'
  rate(input: unknown): number;       // per-day consumption
  calibrate(history: CycleObservation[]): CorrectionFactor;
}
```

`pack-lpg` registers the kg/day rate table + cooking adjustments; the pure math (depletion-at-a-rate, calibrated by observed cycles, confidence widening) stays vertical-agnostic. The **eval/backtest harness (session 04)** becomes vertical-neutral — any pack with a `ConsumptionModel` gets accuracy backtesting for free. Verticals with no consumption concept simply register no model.

## 8. LPG as pack #1 — the port mapping (proves the core)

| Today (LPG) | Becomes |
|---|---|
| `Tank` | `asset(vertical='lpg', type='tank', attributes={capacityKg, model, usageLevel})` |
| `Order` (gas) | `service_request(vertical='lpg', type='refill', lifecycleKey='delivery')` |
| `RefillLog` / `AccuracyLog` | LPG domain events + `prediction_log` rows |
| `Estimation` | `prediction` output for the tank asset (LPG `ConsumptionModel`) |
| discounts / preempty-zone scan | pack `pricing` rules + a pack `job` emitting `TankEnteredPreemptyZone` |
| `Retailer` / `Location` / `User` / links / notifications | reused from `core-domain` unchanged |

Rebuilding today's app entirely as `pack-lpg` on the generic core is the proof that the core is truly domain-neutral.

## 9. Tenancy / entitlement synergy

This is where the JSON choice pays off. Because every row lives in core tables carrying `tenantId` + `vertical`:

- **Entitlement per tenant enables a vertical** — extends the `Subscription`/`Entitlement` model from `api-backend-hierarchical-tenancy.md` with a `verticals[]` (or per-pack flag). The registry gates mounting and the write path rejects requests for a vertical the tenant isn't entitled to.
- **Tenancy RLS is uniform** — the `owner_path <@ app.tenant_path` / `userId` policies apply to `asset`/`service_request` regardless of vertical; no per-pack RLS.
- **Cross-vertical features are uniform** — dashboards, billing, notifications, and audit read the one `service_request` table across verticals. A franchise HQ or reseller sees LPG + security + health in one rollup for free.

## 10. Adding a new vertical — the payoff checklist

A future `pack-security` (or health / home-services) is:

1. `implements DomainPack` in a new `packages/pack-security`.
2. Define asset/request **TypeBox attribute schemas** (e.g. `sensor`, `incident`).
3. Register a **lifecycle** (reuse `delivery`, or a new `monitoring` state machine) and, if relevant, a `ConsumptionModel`.
4. Add notification templates, optional `routes`, optional `jobs`, and an `entitlement` key.
5. Add the package to the registry list.

**No edits to `platform-kernel`, `core-domain`, or the shared schema.** That is "easily add modules."

## 11. Impact on the existing plan (Phase-1 reshape)

Since Phase-1 now *builds the platform*, these sessions change (to be applied in the consolidation pass — **not** edited here):

- **Session 01** — scaffold `platform-kernel` **including the pack registry**; add the polymorphic `core-domain` schema (`asset`/`service_request`/`prediction_log` with `vertical`/`type` discriminators + JSONB `attributes`).
- **Session 04** — estimation → generalized `prediction` capability + `ConsumptionModel`; harness stays vertical-neutral.
- **Session 05** — "port domain modules" → **build `core-domain` + port LPG as `pack-lpg`**; cross-module calls already go via contracts/events, so the hub-import problem dissolves.
- **Session 09** — order saga → **lifecycle registry** (a saga per `lifecycleKey`).
- **Tenancy drafts** — entitlement model gains a per-tenant **`verticals`/pack list**; registry reads it.
- **`prisma/schema.prisma`** — generic `asset`/`service_request`/`prediction_log`; consider Prisma `multiSchema` with a `core` schema (and a reserved per-pack schema only if a pack ever needs a typed side-table — §13).
- **README index / final plan** — add a "Platform / domain packs" section; recast the module list as "core-domain + packs."

## 12. Priority summary

- **[Now]** pack registry · polymorphic `core-domain` (`asset`/`service_request` + JSONB + discriminators) · TypeBox attribute-validation on writes · `DomainPack` contract · `pack-lpg` as the sole Phase-1 pack · generalized `prediction` · entitlement-gated mounting.
- **[Seam now, build later]** lifecycle registry beyond `delivery` · generated-column promotion for hot JSON fields · per-pack Postgres schema.
- **[Phase 2+]** actual second vertical (`pack-security`/`health`/`home-services`) · cross-vertical analytics · pack marketplace / third-party packs.

## 13. Open decisions

- **Packaging:** workspace packages (`packages/pack-*`, recommended for true isolation + independent deploy) vs folders under `apps/api-core/src/packs/*` (simpler, less split-ready).
- **Prisma layout:** single schema with naming conventions vs `multiSchema` (`core` + per-pack) — the latter aligns with the split-ready seam if a pack later takes its tables to its own DB.
- **Pure-JSON vs a typed side-table escape:** may any pack own a typed relational table for very hot/relational data, or is the JSONB + generated-column rule absolute? (Recommend: JSONB-first, allow a pack side-table only behind an explicit exception.)
- **Shared vs per-pack lifecycles:** how much of today's `OrderStatus` becomes the canonical shared `delivery` lifecycle.
- **Migration/backfill:** moving today's LPG rows (`Tank`/`Order`/…) into the polymorphic core — one-time transform + validation against the LPG attribute schemas.
- **Launch-timing risk:** building the platform before shipping LPG lengthens time-to-first-launch; consider shipping `pack-lpg` on the core early while other packs stay theoretical.

## 14. Verification

- **The acid test — a throwaway 2nd vertical:** stand up a stub `pack-water-tank` (or `pack-security`) and confirm it **mounts, validates its `attributes`, runs its lifecycle, and is entitlement-gated — without touching `platform-kernel`, `core-domain`, or the shared schema**. This is the pass/fail for "easily modularized."
- **LPG parity:** the full LPG flow (send-otp → create asset → place request → confirm delivery → `RefillLogged` → prediction reset) works as `pack-lpg`; session-06 regression stays green.
- **Cross-vertical:** a dashboard query over `service_request` returns rows from two verticals at once; a tenant not entitled to a vertical gets its writes/reads rejected.
- **Tenancy:** RLS still isolates tenants across verticals (one policy set, all verticals).
- **Typing/perf:** an invalid `attributes` payload is rejected at write (TypeBox); a hot LPG query uses the generated column, not a JSON scan.
