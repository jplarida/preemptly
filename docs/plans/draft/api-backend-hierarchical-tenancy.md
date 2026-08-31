# PreEmptly API — Hierarchical / Channel-Partner Tenancy (Phase 2)

> **Status:** Draft — **retained as the live Phase-2 roadmap spec** (referenced from `../api-backend-final-plan.md` backlog). **Phase:** 2+ (do **not** fold into the Phase-1 plan) · **Date:** 2026-07-16 · **Coverage:** preempty:default
> Extends the flat retailer-tenant model + three axes, now consolidated into `../api-backend-final-plan.md` (Tenancy & Isolation). **Supersedes `api-backend-multi-branch-tenancy.md`** (deleted) — the franchise (Model B) case is absorbed here as one level of a general hierarchy.
> Real code lives at `D:\Personal\projects\preempty`.
>
> **Priority tags:** everything is **[Phase 2+]** unless marked **[Seam now]** (a cheap Phase-1 reservation that avoids a painful retrofit).

---

## 1. Scope

Combines the two capabilities discussed:

- **Model A — white-label reseller:** a partner buys the platform, has its **own brand(s) and billing identity**, and resells to *independent* companies (each of which may have its **own** brand).
- **Model B — franchise / multi-branch:** one company runs **many branches under a single shared brand**, with HQ oversight.

The key realization: **A and B are the same primitive at different levels.** Every non-leaf node "owns the subtree beneath it." Instead of two features, this is **one generalized tenant hierarchy**; A and B differ only in two per-node properties (brand ownership + entitlements, §5–6).

```
Platform (PreEmptly)
 └─ Reseller / Partner        (A)  own brand(s) + billing; children may have DIFFERENT brands
     └─ Brand / Retailer HQ   (B)  a company; ONE brand shared downward
         └─ Branch            (B)  operational outlet
             └─ Consumers          link to a branch (unchanged from base doc)
```

Depth is **arbitrary** (chosen): reseller → sub-reseller → brand → branch → … all work through the same mechanism.

## 2. Why net-new (recap)

The as-built model is flat and concrete: `Retailer` is the tenant root, no parent, no abstraction, **no subscription/billing entity**, and settings are 1:1 per retailer with no inheritance. A hierarchy therefore needs (a) a tree structure, (b) an entitlement model, (c) brand entities/inheritance, and (d) subtree-scoped isolation. All additive, all Phase 2+.

## 3. Entity model — a `Tenant` node tree (recommended)

Introduce a single node type that forms the tree; operational data hangs off leaf/brand nodes.

- **`Tenant`** — one row per node: `id`, `parentId?`, **`path ltree`** (materialized path, e.g. `reseller1.brandA.branch3`), `type: PLATFORM | RESELLER | BRAND | BRANCH`, `brandId?` (→ the brand-root Tenant it inherits branding from), `subscriptionId?`, `name`.
- **`Retailer`** becomes the **operational profile** attached 1:1 to a `Tenant` of type `BRAND`/`BRANCH` (it holds pricing, riders, orders, links as today). `RESELLER`/`PLATFORM` nodes have **no** Retailer profile — they never sell gas.
- Existing `retailerId` foreign keys (`Order`, `Rider`, `RetailerSettings`, `InviteStat`, `CustomerRetailerLink`) keep pointing at the **operational** tenant (the branch). Semantically `retailerId` == the leaf tenant id; no consumer-facing change.

**Lower-migration alternative:** extend `Retailer` itself with `parentId` + `path` + `type` and treat reseller nodes as non-operational `Retailer` rows. Cheaper migration, but conflates "sells gas" with "owns a subtree." Recommend the dedicated `Tenant` node for a clean separation; the alternative is a fallback if the migration cost is prohibitive. **(Open decision §11.)**

## 4. Arbitrary depth via `ltree`

Postgres `ltree` + materialized path is what makes any-depth cheap:

- Each `Tenant.path` encodes its ancestry; moving a subtree updates paths (rare, batched).
- **Subtree membership is one predicate:** `path <@ :ancestorPath` (descendant-or-self). This is the single rule the whole isolation model rests on.
- GiST-index the `path` column.

## 5. The access model — one subtree-scope axis

The base doc's **Axis 1 (retailer-tenancy)** generalizes to:

| Axis | Rule | Notes |
|------|------|-------|
| **1′ · Subtree scope** | caller's session carries its `tenant_path`; it may access an operational row iff the row's owning tenant path `<@ tenant_path` | a **branch** (leaf) sees only itself; an **HQ** sees its brand + branches; a **reseller** sees everything under it, across brands |
| **2 · Consumer-ownership** | unchanged — `userId === currentUser.id` | consumers are not part of the tenant tree |
| **3 · Link-mediated cross-access** | unchanged — retailer↔consumer only via `ACTIVE` link or `Order` | a reseller/HQ reaches consumer data only through its branches' links |

So the franchise "Axis 4" from the superseded draft is **not** a separate axis — it is Axis 1′ at the brand level. Reseller scope is the same axis one level up. Consumers/riders are unaffected in normal operation.

## 6. What actually separates A from B — two per-node properties

The hierarchy and Axis 1′ are shared. Only these differ per node:

1. **Brand ownership (white-label vs shared):**
   - A **`RESELLER`** node is a *brand boundary*: its children may carry **different** `brandId`s → white-label (**A**).
   - A **`BRAND`** node is a *brand root*: it shares its `brandId` **downward** to all branches → single brand (**B**).
   - Branding (display name, logo, theme, **SMS sender identity**, custom domain, default discount tiers) resolves by walking to the node's `brandId` root, with branch-level overrides where allowed.
2. **Entitlements (what a node may do):** attached via `Subscription`/`Entitlement` on the node — `canResell` (provision independently-branded children = **A**), `whiteLabel` (custom domain/branding), `hierarchyEnabled` + `maxChildren`/`maxDepth` (= **B**), plan/status/period. Provisioning a child checks the **parent's** entitlement and is audited.

A single reseller can therefore hold *both* a franchise brand (many branches, one brand) **and** standalone single-shop brands beneath it — because both are just nodes with different brand/entitlement settings.

## 7. RLS & enforcement

Consistent with the base doc (app layer primary, RLS backstop; cross-table checks stay app-side):

- **App layer:** the request resolves the caller's `tenant_path`; operational repositories scope reads/writes to `path <@ tenant_path`. By-id access uses an `assertInSubtree(row, currentUser)` helper. Branch requests reduce to today's Axis-1 behavior.
- **RLS backstop (ltree):** set `SET LOCAL app.tenant_path = '<caller path>'` per request; policy on operational tables is `USING (owner_path <@ current_setting('app.tenant_path')::ltree)`.
  - To keep the policy a single predicate on hot tables (`Order`), **denormalize the owning `owner_path`** (the branch's path) onto the row, refreshed if a node moves; colder tables may instead subquery `Tenant`.
  - Consumer-owned tables keep `app.current_user` RLS (Axis 2); link-mediated access (Axis 3) stays in `assertLinked`.
  - The `service`/`BYPASSRLS` role (base doc §7) covers relay/rollup/cross-tenant jobs.

## 8. White-label specifics (Model A)

- **Distinct brands per reseller subtree** via `brandId`; branding + **custom domain** + **SMS sender identity** resolved from the brand root — so a consumer of Reseller-X's brand never sees "PreEmptly."
- **Billing identity:** the reseller holds the platform subscription and *re-bills* its children; model `Subscription.billedByTenantId` so "who pays the platform" (reseller) differs from "who uses the seats" (its companies). Detailed payment integration is out of scope here — only the entitlement + billing-owner pointer.
- **Isolation between resellers is absolute:** Axis 1′ upper-bounds every reseller to its own subtree; no reseller can see another's brands, companies, or consumers.

## 9. Franchise specifics (Model B)

- **Shared brand downward** (single `brandId` for the whole brand subtree); branches override only *operational* fields (pricing, `discountsEnabled`) unless HQ locks them.
- **HQ rollup:** Axis 1′ gives HQ a read view across its branches (aggregate dashboards); branch-to-branch isolation still holds downward.

## 10. Impact on the existing model

- **Consumers:** unchanged — link to a branch; the multi-tenant-consumer model already allows linking across several branches/brands. Preempty-alert ownership stays with the linked branch (`isPrimary`).
- **Riders:** unchanged — belong to one branch; visible upward only via rollup.
- **Base Axes 2 & 3:** untouched. Only Axis 1 generalizes to 1′.
- **Migration:** the real cost — introduce `Tenant`, backfill each existing `Retailer` as a `BRAND`/`BRANCH` node with a root `path`, repoint `retailerId` semantics to the tenant. Existing single retailers become depth-1 nodes and behave exactly as today.

## 11. Seams worth reserving in Phase 1 — [Seam now]

Cheap now, painful to retrofit:

- Keep **`retailerId` as the sole retailer scope key** everywhere (already true) so it can later mean "operational tenant id."
- Route **all retailer-settings reads through a resolver function** (identity today) so brand inheritance slots in without touching call sites.
- Reserve nullable **`parentId`** + a **`path`** column on the retailer/tenant even if unused — so the tree grows later without a data backfill.
- Keep the **`service`/`BYPASSRLS`** connection path (base doc) — rollup/cross-tenant jobs need it.

## 12. Integration points (future — only if greenlit)

Described for a later Phase-2 consolidation; **not** applied to the Phase-1 `final/` docs now:

- `prisma/schema.prisma`: `Tenant` node (ltree `path`, `type`, `brandId`, `parentId`), `Subscription`/`Entitlement`, `Order.owner_path` denormalization; RLS policies.
- Base tenancy doc: generalize Axis 1 → Axis 1′; add `assertInSubtree` / `resolveTenantPath` to `policy.ts`.
- Auth/current-user: resolve `tenant_path`, brand, and entitlements onto `currentUser`.
- Retailers module: node CRUD (create reseller/brand/branch), entitlement-gated provisioning, rollup queries, settings-inheritance resolver, branding/domain resolution.
- Testing: hierarchy isolation + white-label + entitlement tests (§13).

## 13. Open decisions

- **Entity shape:** dedicated `Tenant` node (recommended) vs extending `Retailer` with `parentId`/`path`/`type`.
- **RLS path strategy:** denormalized `owner_path` on hot tables vs `Tenant` subquery everywhere.
- **Subtree-move frequency:** how often nodes re-parent (drives whether path denormalization needs a maintenance job).
- **HQ/reseller mutation rights:** read-only rollup vs acting on descendants' operations/settings; which settings a parent can *lock*.
- **Billing model:** reseller re-bills children vs platform bills each; downgrade/lapse behavior for a subtree.
- **Depth caps per plan:** does an entitlement bound `maxDepth`/`maxChildren`, and can a reseller grant sub-reseller rights?
- **Consumer visibility upward:** aggregated across a subtree's branches, or strictly per-branch?

## 14. Verification (when built)

- **Standalone parity:** a depth-1 retailer behaves identically to today; all base-doc isolation tests still pass.
- **Subtree scope:** a reseller/HQ sees exactly its subtree — never a sibling subtree; RLS denies cross-subtree rows even with the app `where` removed (`path <@` backstop proven).
- **Branch isolation:** branch A cannot see branch B even under the same brand/reseller.
- **White-label:** a consumer under Reseller-X's brand receives X's branding + SMS sender; never another brand's; resellers cannot see each other's data.
- **Entitlement:** provisioning a child beyond `maxChildren`/`maxDepth`, or without `canResell`/`hierarchyEnabled`, is rejected and audited.
- **Inheritance:** a node with null branding inherits its brand root; allowed overrides win, locked ones are blocked.
