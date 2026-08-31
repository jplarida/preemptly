# PreEmptly API — Build Sessions Index

> **Status:** Final · **Date:** 2026-07-16 · **Coverage:** preempty:default
> Source of truth: `../api-backend-final-plan.md`. This folder breaks that plan into session-sized work packages.
> Real code lives at `D:\Personal\projects\preempty`. New workspace: `apps/api-core`.

## What we're building

A **greenfield, split-ready, multi-tenant platform** replacing `apps/api-elysia`: one deployable Elysia/Bun instance now, any module extractable into its own micro/nano-service later with **no business-logic rewrite**. It is structured as a kernel + a vertical-agnostic **`core-domain`** + swappable **domain packs** — **LPG is pack #1**, and new verticals (safety/security, health, home services) drop in as packs with no core rewrite. The tenant is the **retailer** (three-axis isolation + Postgres RLS). Full Phase-1 security hardening, unit + real-DB integration tests in CI, and the reliability seams (outbox, idempotency, Redis-backed state, object-level auth, asymmetric JWT) designed in from the start because they are painful to retrofit. n8n is an optional edge orchestration layer that drops in later on the same event seam.

## The three seams (the core idea, referenced throughout)

Every module reaches the outside world only through these injected seams — splitting a service = swapping what's behind them, never touching `service.ts`:

| Seam | Now (single instance) | Later (split) |
|------|-----------------------|---------------|
| Event bus (`platform/events/bus.ts`) | in-memory + outbox relay | swap to NATS/BullMQ |
| Contract (`<module>.contract.ts`) | direct in-process call | HTTP/gRPC client, same interface |
| Repository (`<module>.repository.ts`) | shared Prisma on one Neon DB | module's tables move to its own DB |

A **fourth seam — the pack registry** — mounts whole domain verticals (LPG today; safety/health/home-services later), each declared via a `DomainPack` and gated by per-tenant entitlement. See the final plan's **Platform** section.

## Session documents & sequence

| # | Document | Focus | Depends on |
|---|----------|-------|-----------|
| 01 | `01-scaffold-platform-kernel.md` | Workspace, config/env fail-fast, app/main DI, db+redis, http basics, logging, health, Dockerfile | — |
| 02 | `02-auth-and-security.md` | JWT (asymmetric+JWKS), RBAC, object-level policy (IDOR), rate-limit, idempotency, OTP/SMS-pumping, port `auth` | 01 |
| 03 | `03-events-outbox-reliability.md` | Event bus + transactional outbox + relay, event flows, hash-chained audit, resilience, BullMQ seam | 01 |
| 04 | `04-estimation-engine.md` | Generalize the engine into `core-domain/prediction` behind `ConsumptionModel`; eval/backtest harness (`accuracyLog`), vertical-neutral | 01 |
| 05 | `05-domain-modules-port.md` | Build `core-domain` + port LPG as `pack-lpg`; per-module tenancy axes + fix orders IDOR; LPG-as-pack mapping | 02, 03, 04 |
| 06 | `06-testing-and-ci.md` | Unit + testcontainers integration, GitHub Actions, security-scan gates, husky; **tenant-isolation + 2nd-vertical acid tests** | 01 (grows each session) |
| 07 | `07-integrations-and-n8n.md` | OpenAPI+Eden, PostHog/flags, comms redundancy, geocoding, n8n edge orchestration | 03, 05 |
| 08 | `08-cutover-compliance-ops.md` | Web/mobile cutover, delete legacy, PH NPC/PII, WAF/secrets, API versioning | 05, 06 |
| 09 | `09-order-lifecycle-saga.md` | Order saga → **lifecycle registry** + **`lifecycleTemplate` archetypes** (RULE-PACK-06): the `visit` template + LPG `delivery` instance + shared `dispatch`/`fulfiller`; Temporal Phase-2 seam — **optional for launch** | 03, 05 |
| 10 | `10-billing-checkout.md` | Tenant feature-availing: plan catalog → hosted checkout (GCash/Maya/card) → HMAC webhook activates `Subscription`+`Entitlement`; renewal/dunning/reconcile — **Phase 2 · optional for launch** | 01, 02, 03 |

### Reference & cross-cutting documents

Not sequenced sessions — open as needed; each is woven into the sessions noted.

| Document | What it is |
|---|---|
| `feature-expansion-playbook.md` | **Start here to expand** — routes a new vertical / shared capability / in-pack feature through decide → build → avail → prove, with the prerequisites gate |
| `domain-packs.md` | Platform **reference** — kernel/core-domain/packs, `DomainPack` contract, registry, polymorphic JSON core, tenancy/entitlement |
| `core-vs-pack-decision-guide.md` | `RULE-PACK-01…06` — core-vs-pack rules, process archetypes, the classification **Trace** |
| `offline-sync-contract.md` | Offline order sync/replay contract (GAP-02) |
| `db-migration-runbook.md` | Migration/deploy/rollback, backups & DR, **+ API endpoint lifecycle/deprecation** — expand/contract for DB *and* the client surface (GAP-03/08/26) |
| `data-privacy-erasure-retention.md` | RA 10173 erasure (anonymize-now-purge-later) + retention (GAP-06) |
| `identity-phone-change-recovery.md` | Identity model + phone change/recovery (GAP-22) |
| `plan-review-gaps.md` | GAP register + Core-vs-Expansion categorization (review tracker) |
| `adr-0001-backend-framework.md` | Decision: **Elysia on Bun** (single-language TS), with **Hono** as the documented fallback |
| `data-model.md` | `prisma/schema.prisma` shape — column conventions + table inventory (kernel/core-domain/pack-lpg/billing) |
| `api-surface.md` | Endpoint inventory (**core** surface) + authZ/tenancy per endpoint; extensions (pack-lpg/billing/internal) deferred |
| `notifications-comms-spec.md` | Notification catalog · channels/routing · preferences/opt-out · delivery guarantees · templates/localization · comms redundancy |
| `error-taxonomy.md` | Canonical error envelope + machine-readable code catalog + HTTP status usage |
| `env-config-catalog.md` | Complete env-var inventory (required/secret/default) → fail-fast `config/env.ts` + `.env.example` |
| `delivery-lifecycle-state-machine.md` | The `delivery` lifecycle: states × transitions × guards × actors + saga timeouts/compensations (mermaid) |

**Recommended order:** 01 → 02 → 03 → 04 → 05 → 06 (kept green throughout) → 07 → 08. Sessions 02/03/04 can be parallelized after 01 if worked by different people. **Session 09** is build-later (like 07's n8n): its event seams land in 03/05, and the process-manager build can be deferred to Phase 2 — slot it after 05 whenever order-lifecycle failure handling starts to hurt. **Session 10** (billing/checkout) is Phase-2/optional too: its enforcement seams (entitlement gate, write-path reject, `currentUser` entitlements) land in 01/02, so the self-serve subscribe-and-pay journey is a clean drop-in whenever paid feature-availing is needed — until then an operator toggles entitlements by config.

> **Cross-cutting (woven into 01/02/04/05/06/09, not standalone sessions):** **Tenancy & RLS** (from `draft/api-backend-multi-tenancy.md`) and the **domain-packs platform** (reference: **`domain-packs.md`**) are folded into the sessions above — kernel/registry/core-schema/RLS-middleware in 01, policy axes + RLS + entitlement gate in 02, `prediction` in 04, `core-domain`+`pack-lpg`+tenancy in 05, isolation + 2nd-vertical tests in 06, lifecycle registry in 09. **Phase-2 hierarchical/reseller tenancy** (`draft/api-backend-hierarchical-tenancy.md`) is roadmap-only, not scheduled.

> **Expanding with new features/verticals?** Start with **`feature-expansion-playbook.md`** (the "start here" how-to) → it routes to `core-vs-pack-decision-guide.md` (rules), `domain-packs.md` (platform reference), and `10-billing-checkout.md` (feature-availing). Prerequisites before a clean 2nd vertical are tracked in `plan-review-gaps.md` (GAP-15–20, 07 #2, 14, 09-C).

## Global conventions (apply to every session)

- **No cross-module DB access** — a module only touches its own tables (via its repository); everything else is a `contract.ts` call or a bus event.
- **DI, no globals** — `buildApp(deps)` receives `{ prisma, redis, bus, config, otpSender, pushSender }`; nothing imports a global singleton.
- **Strict validation** — every route body/query/params uses TypeBox with `additionalProperties:false`; a pack's polymorphic `attributes` are validated against the type's TypeBox schema on every write.
- **Object-level auth** on every by-id access — RBAC (role) is not enough.
- **Tenancy** — **provider = tenant** (LPG label: retailer). Provider-scoped repository queries filter by **`providerId`** (GAP-16), consumer-owned by `userId`; cross-access is link-mediated via `assertLinked`; Postgres RLS is the backstop.
- **Vertical packs** — generic capability lives in `core-domain`; anything LPG-specific lives in `pack-lpg`. A new vertical is a new pack (a `DomainPack`), never an edit to kernel/core/schema. **When adding any new capability, classify it per `core-vs-pack-decision-guide.md` (`RULE-PACK-*`) and record it in that doc's Trace ledger.**
- **Publish events via the outbox** (same tx as the state change), never fire-and-forget.
- **Every event handler is idempotent (GAP-25)** — the outbox/relay is at-least-once; subscribers dedup on event id (processed-events ledger / natural idempotency), so a redelivery is a single effect.
- **Money is integer minor units (GAP-24)** — all amounts in centavos + `PHP`, TypeBox `integer`, never floats.
- **Versioned from day 1 (GAP-04)** — all business routes under `/v1` (established in session 01); ops probes (`/health`/`/livez`/`/readyz`) unversioned; OpenAPI at `/swagger`; a min-supported-app-version gate seam exists from 01, its floor value set near launch (08).
- **Endpoints evolve additive-only; breaking = new version (GAP-26)** — never break a `/v1` endpoint in place; breaking change → `/v2` parallel-run until old clients drain; deprecation via `Deprecation`/`Sunset` headers; the parallel-run window must exceed the max offline window. See `db-migration-runbook.md` §API endpoint lifecycle.
- **Logical vs physical packaging (provisional, GAP-07)** — the kernel/core-domain/pack *layering* is firm; whether it maps to workspace packages (`packages/*`) or in-app folders (`apps/api-core/src/*`) is a **deferred** decision. Treat `packages/*` / `shared/` paths in the session docs as illustrative placeholders until it's resolved (at/before session 05).
- **Migrations are expand/contract** — every schema change is additive-first and backward-compatible with the running version; migrations run as a **single gated Job/CI step** (not per-pod), and new tenant-scoped tables ship their RLS in the same migration. See `db-migration-runbook.md` (GAP-03).
- **Every module lands with unit + integration tests** and passes CI security gates before merge.
- Follow global repo rules: read before edit, no unapproved code, no `--no-verify`, ask before committing, verify `tsc -b`.

## Plan review — open gaps

A full read-through (2026-07-19) produced **`plan-review-gaps.md`** — a tracked `GAP-01…14` register (data migration, offline-sync contract, cutover rollback, `/v1` timing, scheduler single-runner, erasure-vs-retention, doc inconsistencies, backups, under-specified seams, rider-client surface) **plus a Core-vs-Expansion categorization**. Work it one at a time. First-pass GAP-01…14: **all 🔴 High (01/02/03/04), all core/base 🟡 Medium (05/06/08/09-A·B), and all 🟢 Low (10–13) resolved.** A **second pass (GAP-15…25)** applied RULE-PACK-02 to the core docs and found **expansion-debt** (LPG vocabulary leaked into core — GAP-15…20, deferred) and **core-correctness** gaps (GAP-21…25: timezone, phone-as-identity, rate-limit-vs-replay, money precision, handler idempotency — **all resolved**; GAP-22's change/recovery *flows* planned but timing TBD). **Open now = only deferred-expansion** (07 #2/#3, 14, 09-C, 15–20), held for the module/expansion phase. The register's meta-finding: nearly all debt was on the **core/base** side (older drafts); the **expansion** machinery is clean — so hardening pointed at core/base + the tree reconciliation.

## Scope-deepening backlog

Tracks **depth of specification** for the backend (distinct from `plan-review-gaps.md`, which tracks review findings). Fleshed out beyond the sessions as needed.

| Area | Doc | Status |
|---|---|---|
| Data model (`prisma/schema.prisma` shape) | `data-model.md` | ✅ done |
| API surface — **core** endpoint inventory + authZ | `api-surface.md` | ✅ done |
| Versioning / deprecation / pack versioning | `db-migration-runbook.md` §API lifecycle | ✅ done (GAP-04/26) |
| Notifications & comms spec (catalog/channels/prefs/delivery) | `notifications-comms-spec.md` | ✅ done |
| Error taxonomy (canonical envelope + code catalog) | `error-taxonomy.md` | ✅ done |
| Env / config catalog (complete typed var list) | `env-config-catalog.md` | ✅ done |
| Delivery lifecycle state machine (states × transitions × guards × actors) | `delivery-lifecycle-state-machine.md` | ✅ done |
| API surface — **extensions** (pack-lpg/billing/internal) | `api-surface.md` §Extensions | ⏸ deferred (with extensions) |

Cross-cutting contracts (offline, migration/backups, erasure/retention, identity) are already fleshed out as their own reference docs — see the reference table above.

## Open items to resolve during the build

- Workspace name `apps/api-core` vs reclaiming `apps/api`.
- CI target: GitHub Actions vs Jenkinsfile (global rules reference Jenkins/husky).
- Refresh-token model: Redis rotation vs DB table (decide in 02).
- Redis provider: Upstash serverless vs self-host; BullMQ now vs after split.
- n8n: launch vs defer; self-hosted vs Cloud.
- PH NPC export/delete: Phase 1 vs Phase 2 (depends on public-launch timing).
- Pack packaging (workspace packages vs folders) and Prisma layout (single vs `multiSchema`).
- Launch-timing risk of building the full pack platform before shipping LPG (ship `pack-lpg` early?).
- Tenancy RLS under pooled connections (`SET LOCAL` + PgBouncer/Accelerate) — verify in 01/02.
- **Offline functionality for mobile** — the Flutter apps must work offline-first (SQLite cache + mutation queue for the offline order channel, per `RULE-OFFLINE-01`). **Backend contract now specified in `offline-sync-contract.md` (GAP-02 resolved):** durable idempotency, client UUIDv7 PKs, individual REST replay, server-validated transitions, `PENDING_SMS` rejection, queue-preserving re-auth. Hooked into sessions 01/02/05/06/08.
