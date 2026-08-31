# PreEmptly API — Multi-Tenancy Model & Isolation

> **⚠️ SUPERSEDED (2026-07-16)** — consolidated into `../api-backend-final-plan.md` (Tenancy & Isolation section) and woven into sessions 01/02/05/06. Kept for provenance; read the final plan for the live version.
>
> **Status:** Draft · **Date:** 2026-07-16 · **Coverage:** preempty:default
> Companion to `api-backend-greenfield-plan.md` + `api-backend-enhancements-hardening.md`. Makes tenancy a first-class concern and is meant to be **consolidated into `../api-backend-final-plan.md`** (see §9).
> Real code lives at `D:\Personal\projects\preempty`.
>
> **Priority tags:** **[Now]** = Phase-1, do it · **[Seam now, build later]** = wire the seam in the scaffold, implement later · **[Phase 2+/optional]**.

---

## 1. Why this document

The current plan set treats tenancy only *implicitly*: `policy.ts` "asserts ownership/retailer-tenancy" and RLS appears as a single "consider… as defense-in-depth" aside. The model itself — who the tenant is, how a consumer relates to it, which tables are partitioned, and how isolation is proven — is nowhere written down. This document fills that gap and mandates the enforcement, grounded in the **as-built** schema and backend (not a greenfield guess).

## 2. Tenant model (as-built)

- **The tenant is the `Retailer`.** It is a concrete entity, not an abstract org/tenant/workspace layer — none exists in the schema (a repo-wide grep for `tenant|workspace|organization` finds nothing).
- **Three separate identity tables:** `User` (consumer), `Retailer`, `Rider`. There is **no `role` column** — role is carried in the JWT and resolved to the matching table at request time (`apps/api-elysia/src/lib/auth.ts:25-54`). Consequence: **for a retailer, `currentUser.id === retailer.id`**, and every `retailerId` filter passes `currentUser.id` directly.
- **Consumers are multi-tenant.** A `User` links to **many** retailers via the `CustomerRetailerLink` join table (`@@unique([customerId, retailerId])`), exactly one flagged `isPrimary` (`modules/linking/service.ts:60-74,116-153`). The primary link drives single-retailer contexts such as the preempty scan (`estimation/scheduler.ts:41`).
- **Riders are single-tenant.** A `Rider` belongs to exactly one retailer (`Rider.retailerId`, `onDelete: Cascade`).
- **Consumer-owned data is not partitioned per retailer.** `Location`, `Tank`, `Estimation`, `RefillLog`, `DeviceToken` are scoped by `userId` and reach a retailer only *transitively* (via an `Order`, or via an active link). This is deliberate and is why "add `retailerId` to every table" is the **wrong** move here — a consumer's tank is not owned by one retailer.

## 3. The three access axes (the core idea)

Isolation is not one rule; it is three, and every endpoint sits on one of them:

| Axis | Rule | Applies to |
|------|------|-----------|
| **1 · Retailer-tenancy** | `row.retailerId === currentUser.id` (caller is that retailer) | retailer-scoped tables |
| **2 · Consumer-ownership** | `row.userId === currentUser.id` (caller owns the row) | consumer-owned tables |
| **3 · Link-mediated cross-access** | a retailer may touch a consumer's data **only** via an `ACTIVE` `CustomerRetailerLink` **or** an `Order` between them | retailer → consumer reads (e.g. estimation scan, order fulfilment) |

Axis 3 is the subtle one: it is a **cross-table** relationship, so it cannot be expressed as single-table RLS — it stays in the application/policy layer (see §7).

## 4. Data classification (every model → axis → scoping column)

| Model | Axis | Scoping column | `retailerId` today? |
|-------|------|----------------|---------------------|
| `Retailer` | 1 (tenant root) | `id` | — |
| `RetailerSettings` | 1 | `retailerId @unique` | **Yes** |
| `Rider` | 1 | `retailerId` | **Yes** |
| `InviteStat` | 1 | `retailerId` (`@@unique([retailerId,date])`) | **Yes** |
| `Order` | 1 + 2 (both parties) | `retailerId` **and** `customerId` | **Yes** |
| `CustomerRetailerLink` | 1 + 2 (the bridge) | `retailerId` + `customerId` | **Yes** |
| `User` | 2 (identity) | `id` | No |
| `Location` | 2 | `userId` | No |
| `Tank` | 2 | `userId` (via `Location`) | No |
| `Estimation` | 2 | `tankId` → `userId` | No |
| `RefillLog` | 2 | `tankId` → `userId` | No |
| `AccuracyLog` | 2 | `tankId` → `userId` | No |
| `DeviceToken` | 2 | `userId` | No |
| `OtpCode` | none (pre-auth) | `phone` | No |

**No new columns are required** for the mandated design — retailer-scoped tables already carry `retailerId`; consumer tables stay `userId`-scoped.

## 5. App-layer enforcement — [Now]

The policy layer (`platform/auth/policy.ts`, session 02) exposes one helper per axis, called from repositories (never ad hoc per route):

- `assertRetailerTenant(row, currentUser)` — Axis 1; throws 403 unless `row.retailerId === currentUser.id`.
- `assertOwner(row, currentUser)` — Axis 2; throws 403 unless `row.userId === currentUser.id`.
- `assertLinked(customerId, retailerId)` — Axis 3; throws 403 unless an `ACTIVE` `CustomerRetailerLink` (or a qualifying `Order`) exists.
- **Collection scoping:** list/query repositories must inject the scope into the `where` (`{ retailerId: currentUser.id }` or `{ userId: currentUser.id }`) — isolation is not only a by-id concern.

Two known gaps this closes:
- **The `orders` IDOR** — `GET /orders/:id` currently calls `findOne(id)` with no scope (`orders/index.ts:24-26` → `service.ts:99-106`). Every by-id op must run `assertRetailerTenant` / `assertOwner`.
- **The role guard is not applied** — today only `orders/index.ts:18-23` inspects role; there is no guard middleware. The new `requireRole('user'|'retailer'|'rider'|'service')` (session 02) must actually wrap retailer/rider/user routes, not just exist.

## 6. Identity & role notes for the port

- Keep the three-table identity model (`User`/`Retailer`/`Rider`) — the port is behind repositories/contracts, and `currentUser.id`→table resolution moves into `platform/auth/current-user.ts` (deps injected).
- Because `currentUser.id` means different things per role, the policy helpers take the **typed** `currentUser` (role + id), never a bare id, to avoid an id-collision class of bug across tables.

## 7. Defense-in-depth: Postgres Row-Level Security — [Now, mandated]

App-layer checks are primary; RLS is the backstop so a missed `where` cannot leak across tenants.

- **Retailer-scoped tables** (`Order`, `Rider`, `RetailerSettings`, `InviteStat`, `CustomerRetailerLink`): enable RLS with
  `USING (retailer_id = current_setting('app.current_retailer', true)::text)`.
- **Consumer-owned tables** (`Location`, `Tank`, `Estimation`, `RefillLog`, `AccuracyLog`, `DeviceToken`): enable RLS keyed on `current_setting('app.current_user', true)`. (`Order` carries both keys — its policy ORs the retailer and customer predicates.)
- **Per-request session variables:** a DB middleware sets `SET LOCAL app.current_retailer` / `app.current_user` from `currentUser` at the start of the request transaction. Reads/writes for that request run inside the transaction so the setting applies.
- **`service` role bypass:** the relay/outbox, internal `/internal/*` calls, and migrations run as a role with `BYPASSRLS` (or with the settings unset and policies that fail closed), since they legitimately cross tenants.
- **Axis 3 is *not* pushed into RLS** — a cross-table link check as a SQL policy (subquery into `CustomerRetailerLink`) is expensive and easy to get wrong; it stays in `assertLinked` at the app layer.

**Caveats to honour (call out at implementation):**
- Under pooled connections (Neon PgBouncer *transaction* mode / Prisma Accelerate), `SET LOCAL` **must** share the transaction with the query — implement via a Prisma client extension or an explicit `$transaction` wrapper; **verify Accelerate supports `SET LOCAL`** before committing to it (this feeds the Redis/pooling open item).
- RLS policies live in a migration (`prisma/schema.prisma` has no native RLS DSL — use raw SQL in a migration); document that Prisma model access still needs the app-layer scope because Prisma is unaware of the policy.

## 8. Priority summary

- **[Now]** 3-axis policy helpers · collection scoping · fix `orders` IDOR · apply `requireRole` guard · RLS on retailer- and consumer-scoped tables · per-request session-variable middleware · tenant-isolation tests.
- **[Seam now, build later]** `service`-role `BYPASSRLS` path (finalised with the internal/n8n work in 07) · RLS on any tables added later.
- **[Phase 2+/optional]** richer per-link authorization (roles within a retailer), cross-retailer analytics under a controlled bypass.

## 9. Integration points into the final plan (for the merge)

This draft folds into the existing docs as follows — **not yet applied**; listed for the consolidation pass:

- **`final/00-README-index.md` → Global conventions:** add a **Tenancy** invariant — "Retailer is the tenant; every retailer-scoped repository query filters by `retailerId`, every consumer-owned query by `userId`; cross-access is link-mediated via `assertLinked`; RLS is the backstop."
- **`final/01-scaffold-platform-kernel.md`:** add the DB session-variable middleware seam (`SET LOCAL app.current_retailer`/`app.current_user` per request) in `platform/db`, plus the `service`/`BYPASSRLS` connection path.
- **`final/02-auth-and-security.md`:** `policy.ts` ships the three axis helpers; the `requireRole` guard is actually applied; **RLS enablement promoted from "consider" to a [Now] task** with the session-variable convention.
- **`final/05-domain-modules-port.md`:** per-module scoping checklist entry (list-scope + by-id assert), the `orders` IDOR fix references Axis 1/2, and the estimation scan uses Axis 3 (`assertLinked`) for reading linked consumers' tanks.
- **`final/06-testing-and-ci.md`:** add tenant-isolation acceptance tests to the integration suite (§11).
- **`prisma/schema.prisma` (+ migration):** RLS policies for the tables in §7 (no new columns).
- **`api-backend-final-plan.md`:** add a "Tenancy" subsection under Security and reference this axis model.

## 10. Open decisions

- **Axis 3 mechanism:** app-layer `assertLinked` only (recommended) vs a SQL RLS policy joining `CustomerRetailerLink`. Recommend app-layer + a `linking.contract.ts` call; RLS covers only the single-table axes.
- **Estimation scan access:** does the retailer-side scan run under a `service`/`BYPASSRLS` path or under a link-scoped query as the retailer? Recommend link-scoped (`where.retailerId = retailer.id` over `CustomerRetailerLink`) so it stays inside Axis 1.
- **Pooling vs `SET LOCAL`:** confirm Neon PgBouncer transaction-mode / Accelerate compatibility; may steer the pooling choice in session 01.
- **Rider read scope:** rider is limited to its retailer's linked customers and assigned orders — confirm the exact surface (read-only?).
- **Primary-link semantics:** when a consumer links to several retailers, which one owns a preempty alert / default order context? Today = `isPrimary`; confirm this is the intended product rule.

## 11. Verification

Tenant-isolation is proven by integration tests (via `app.handle()`), added in session 06:

- Retailer A requesting retailer B's order / rider / settings by id → **403** (Axis 1); `GET /orders/:id` for another tenant → **403** (IDOR closed).
- Retailer A's `GET /orders` (and every list endpoint) never returns retailer B's rows (collection scoping).
- Consumer A cannot read consumer B's tank/location/refill → **403** (Axis 2).
- A retailer **not linked** to a consumer cannot read that consumer's tank → **403** (Axis 3); after an `ACTIVE` link is created, the permitted read succeeds.
- **RLS backstop:** a repository query with the tenant `where` clause deliberately removed still returns only the current tenant's rows (proves RLS, not just app code, enforces isolation); a raw cross-tenant query without the session variable set returns zero rows / is denied.
- `service`-role/relay path can cross tenants as required (outbox delivery unaffected).
