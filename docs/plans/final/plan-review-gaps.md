# Plan Review — Open Gaps Register (`GAP-*`)

> Part of the PreEmptly API final plan. See `00-README-index.md`. Output of a full read-through of the plan (final plan + sessions 01–10 + decision guide) on 2026-07-19.
> These are gaps/risks/inconsistencies to resolve **before or during** the sessions they touch — not new features. Work them one at a time; flip **Status** as each is closed and link the session doc that absorbed it. Nothing here changes the core architecture — the seams are sound; these are migration, offline, cutover-safety, and doc-consistency items.

**Severity:** 🔴 high (bites hard if unaddressed) · 🟡 medium (confusion/scramble later) · 🟢 low (worth a line).
**Status:** `open` · `in-progress` · `resolved`.

---

## Core (base) vs Expansion — categorization (2026-07-19)

**Core (base)** = `platform-kernel` (infra) + `core-domain` (vertical-agnostic spine) + the base LPG app's own behavior/ops (auth, orders, offline, estimation math, tenancy, migrations, deploy, compliance). **Expansion** = the platform-of-verticals machinery: pack registry, `DomainPack` contract, entitlements, billing/feature-availing, lifecycle templates/archetypes, multi-vertical concerns.

| Gap | Side | Note |
|---|---|---|
| GAP-01/02/03 (resolved) | 🔵 core | data/offline/migration — all base |
| GAP-04 `/v1` versioning | 🔵 core | base API surface |
| GAP-05 scheduler multi-instance | 🔵 core | base estimation scheduler |
| GAP-06 erasure vs retention | 🔵 core | base compliance + tenancy |
| GAP-07 #1 estimation home | 🔵 core | core-domain location (root: structural) |
| GAP-07 #2 pack packaging | 🟣 expansion | pack packaging (deferred) |
| GAP-07 #3 rider client | 🔵 core | base client/auth surface → **GAP-14** (deferred) |
| GAP-07 #4 `prediction_log`/`accuracyLog` | 🔵 core | core-domain prediction schema |
| GAP-08 backups/PITR | 🔵 core | base ops |
| GAP-09 entitlement store | 🟣 expansion | gates packs |
| GAP-09 service-token / tracing | 🔵 core | base internal-auth + observability |
| GAP-10/11/12/13 | 🔵 core | base notifications/infra/testing/audit |
| GAP-15 LPG events in core | 🟣→✅ | vocabulary leak — **resolved** (generic core events + pack events) |
| GAP-16 `retailerId` tenancy | 🟣→✅ | vocabulary leak — **resolved** (→ `providerId`) |
| GAP-17 `rider` role in core | 🟣 expansion | vocabulary leak (ties GAP-14) |
| GAP-18 `DomainPack` incomplete | 🟣 expansion | pack-contract completeness |
| GAP-19 entitlement no backstop | 🟣 expansion | enforcement asymmetry |
| GAP-20 order-field placement | 🟣/🔵 | polymorphic discipline |
| GAP-21 timezone / day boundary | 🔵 core | day-granular estimation |
| GAP-22 phone-as-identity change | 🔵 core | identity |
| GAP-23 rate-limit vs replay burst | 🔵 core | offline correctness |
| GAP-24 money precision | 🔵 core | correctness |
| GAP-25 handler idempotency | 🔵 core | reliability |
| GAP-26 API endpoint lifecycle | 🔵 core | release/deprecation — **resolved** |

**Root structural finding:** the final-plan **Target Architecture tree** (in-app `src/{modules,shared}`, from the older greenfield draft) was never reconciled with the **workspace-package model** (`packages/{kernel,core-domain,pack-*}`) used by the Platform section + sessions 04/05/09. GAP-07 #1/#2/#4 are all symptoms. **Resolution principle (adopted):** separate the **logical** architecture (firm: kernel/core-domain/pack layering) from the **physical** packaging (deferred: packages vs in-app folders) — see the final plan's *Packaging note*.

**Meta-finding:** the debt is **asymmetric** — almost all flaws/gaps sit on the **core (base)** side (assembled from older drafts predating the packs consolidation); the **expansion** machinery (billing, registry, entitlement gating, lifecycle archetypes) is internally clean (authored fresh). **Point hardening effort at the core/base + the tree reconciliation, not the expansion layer.**

---

## 🔴 High

### GAP-01 — No data-migration plan (legacy concrete tables → polymorphic core)
**Severity:** 🔴 · **Touches:** final plan, 01, 08 · **Status:** ✅ resolved (2026-07-19)
**Issue:** The rebuild reuses the shared `prisma/schema.prisma`, adds polymorphic `asset`/`service_request`/`prediction_log`, and maps `Tank → asset`, `Order → service_request` — but nothing states how existing legacy rows (`Tank`/`Order`/`RefillLog`/users) move into the new shape. Session 08 just "deletes legacy once parity is confirmed."
**Why it matters:** the entire cutover risk profile depends on this. Silent assumption = data loss or a blocked cutover.
**Resolution:** **Stance confirmed = pre-launch / throwaway data (no production data worth keeping).** ⇒ **No migration / backfill / dual-write.** Polymorphic schema authored fresh (clean baseline migration); legacy + new tables coexist in the shared schema only during the port; legacy tables **dropped at cutover** with the legacy apps; seed/fixtures (06) replace migration for dev/test. Recorded in: final plan (**Data stance** note + Port Sequence step 6), session 01 (Notes), session 08 (Cutover tasks). **Reopen trigger:** if a pilot goes live before cutover, a backfill + reconciliation plan becomes required. No `11-*.md` needed — a documented stance suffices.

### GAP-02 — Offline sync / replay contract is unowned
**Severity:** 🔴 · **Touches:** 01, 02, 05, 06, 08 · **Status:** ✅ resolved (2026-07-19)
**Issue:** RULE-OFFLINE-01/02 make this offline-first (SQLite mutation queue + `PENDING_SMS` queued-order channel), but only the index open-items *mention* a "sync/replay endpoint shape + conflict handling" — no session builds it. Idempotency keys alone don't define replay ordering or conflict resolution.
**Why it matters:** duplicate or lost orders on reconnect — the exact failure idempotency is meant to prevent.
**Resolution:** New **`offline-sync-contract.md`** owns the full design. Decisions confirmed: **SMS = advance-notice only** (API order canonical, no SMS↔API dedup); **offline window a week+** (durable idempotency + queue-preserving re-auth). Key rules: client-generated **UUIDv7 PKs** + **DB-backed idempotency, ≥30d, (userId,key)**; **individual REST replay** (no batch endpoint) drained `created_at ASC`; **`PENDING_SMS` server-rejected**; **server-validated transitions** (409 on conflict, surfaced); **refresh TTL ≥ window** + re-auth preserves queue (same user); **client-locked discount honoured only within current bounds** (RULE-ORDER-02 × stale settings). Hooked into: 01 (client-suppliable UUID PKs), 02 (durable idempotency + refresh-token sizing), 05 (orders replay/transition/discount/`PENDING_SMS`-reject), 06 (offline replay tests), 08 (offline cutover verification). Open sub-decisions (refresh TTL value, retention value, failed-item policy) listed in the contract.

### GAP-03 — Production DB migration + rollback window not covered
**Severity:** 🔴 · **Touches:** 01, 06, 08 · **Status:** ✅ resolved (2026-07-19)
**Issue:** Only test-time `prisma migrate deploy` exists. No production migration strategy (expand/contract, zero-downtime), no handling of a bad migration, and no **dual-run rollback window** — 08 deletes legacy immediately after parity.
**Why it matters:** a failed cutover has no fallback; a bad migration has no defined recovery.
**Resolution:** Cutover half came from GAP-01 (pre-launch → code-only rollback + dual-run window in 08). Ongoing discipline now owned by new **`db-migration-runbook.md`** (deploy model confirmed = **K8s Job / gated CI step**): migrations as a **single gated Job before rollout** (not per-pod, not in app boot); **expand/contract** mandatory (rolling updates = old+new pods on one schema); safe-migration rules (`CREATE INDEX CONCURRENTLY`, no table-rewrites, batched backfills); **RLS ships in the same migration** as the table; bad-migration recovery = **fix-forward → code rollback (`rollout undo`, no restore) → PITR last resort**. Global convention added to the index; hooks in 01 (migration model + client PKs), 06 (RLS-in-migration + expand/contract acceptance), 08 (runbook slice + PITR drill). Open sub-decisions listed in the doc.

### GAP-04 — `/v1` versioning introduced too late (session 08)
**Severity:** 🔴 · **Touches:** 01, 07, 08, final plan, index · **Status:** ✅ resolved (2026-07-19)
**Issue:** Routes are built in 02–07 and the OpenAPI/Eden client wired in 07, but the `/v1` prefix is retrofitted in 08 — forcing re-pathing of every route, Swagger, the Eden client, and mobile/web base URLs. (Session 01 also mixes `/health` vs `/api/health`.)
**Why it matters:** versioning is a day-1 decision; retrofitting at the end is churn + risk across all clients.
**Resolution:** Established **day 1 in session 01**: business routes under **`/v1`** (version is the prefix; legacy `/api` dropped), **ops probes unversioned** (`/health`/`/livez`/`/readyz`), OpenAPI at `/swagger`. The **min-supported-app-version gate** is a middleware **seam from 01** (`X-App-Version` → 426/must-update), its floor **value** set near launch (08). Health path standardized (`/api/health` → `/health`). Sessions 02–07 + Eden client are born under `/v1` — no retrofit. Session 08 versioning task changed from "add `/v1`" to "set the floor value + confirm client base". Index convention + final-plan note added.

---

## 🟡 Medium

### GAP-05 — Estimation scheduler under multi-instance (duplicate scans)
**Severity:** 🟡 · **Touches:** 03, 05, 06 · **Status:** ✅ resolved (2026-07-19)
**Issue:** The design scales to multiple instances, but the preempty-zone scan is a cron; every instance running it ⇒ duplicate scans + duplicate `TankEnteredPreemptyZone` alerts. "Cron becomes a repeatable job" is stated but single-runner/leader-election is not an acceptance criterion. **Also found (level-vs-edge):** even on one instance, emitting for every in-zone tank on every tick re-alerts a tank each scan.
**Resolution:** Two facets fixed together. **(a) Single-runner:** scheduled jobs execute **exactly once per tick across N instances** — MVP = Redis distributed lock (`SET NX PX` + fencing token) around the in-app tick (Redis is `[Now]`); upgrade path = BullMQ repeatable job or K8s CronJob → `service`-role `/internal/jobs/*`; handler idempotent regardless (session 03). **(b) Edge-triggered:** the scan emits `TankEnteredPreemptyZone` **only on transition into** the zone, tracking per-tank "already-alerted" state, reset on refill-out-of-zone (session 05). Acceptance added to 05 + a multi-instance/edge test to 06; final-plan reliability line updated. Mechanism itself (Redis lock vs BullMQ vs CronJob) is an open sub-decision, defaulting to Redis-lock-now.

### GAP-06 — Right-to-erasure vs retailer business-record retention
**Severity:** 🟡 · **Touches:** 03, 05, 08 · **Status:** ✅ resolved (2026-07-19)
**Issue:** RA 10173 delete endpoint (08) collides with the multi-tenant model: a consumer links to many retailers, each needing order history for their books. Hard-delete vs anonymize-in-place is undefined.
**Resolution:** Model confirmed = **anonymize now, purge later**; full design in new **`data-privacy-erasure-retention.md`**. Stage 1 **crypto-shred** PII (per-user key = delete-to-anonymize, O(1)) + tombstone identity on retained records; Stage 2 a **single-runner retention-purge job** (reuses GAP-05) hard-deletes anonymized records after the retention window. Erasure **fans out via each module's `contract.ts`** (`erase/anonymize`, no cross-module DB access). **Audit reconciliation:** audit stores **IDs, no PII** (invariant added to 03) → anonymizing to a tombstone leaves the hash chain intact. Multi-tenant: one person anonymized globally, each retailer retains its own anonymized records. Hooked into 03 (no-PII audit invariant), 05 (per-module erase contract op), 08 (export/erase + crypto-shred + purge job + in-flight guard). Open sub-decisions: retention-window value (counsel), key management, in-flight policy, Phase-1-vs-2 timing.

### GAP-07 — Document inconsistencies (implementer traps)
**Severity:** 🟡 · **Touches:** final plan, index, 04, 05, 08 · **Status:** 🟠 partially resolved (2026-07-19)
**Issue (four sub-items):**
- **#1 Estimation engine home** stated two ways (`shared/` vs `core-domain/prediction`). → **Resolved (logical):** logical home = **core-domain/prediction** (fixed in final-plan tree/reuse + session 05); *physical* packaging marked provisional (see #2).
- **#2 Pack packaging** listed open yet sessions write concrete `packages/*`. → **Deferred (decision):** structure call is **provisional** — logical layering firm, physical packaging (packages vs in-app folders) deferred to session 05. Added a **Packaging note** to the final plan + an index convention. Not closed; intentionally held.
- **#3 "three clients" / rider** → **Deferred:** rider client surface undecided; tracked as **GAP-14**, to be settled in the module/expansion phase. Session 08 wording corrected to two clients + a GAP-14 pointer.
- **#4 `prediction_log` vs `accuracyLog`** → **Resolved:** `prediction_log` is the **core-domain generalization** of the legacy `accuracyLog`; the eval harness reads `prediction_log` (seeded; legacy data throwaway per GAP-01); `accuracyLog` not carried forward. Fixed in final plan + sessions 04/05.
**Remaining:** #2 (structure decision) + #3 (rider, via GAP-14) — both deliberately deferred to the module/expansion phase per 2026-07-19 decision (focus core/base now).

### GAP-14 — Rider client surface undecided
**Severity:** 🟡 · **Touches:** 02 (auth roles), 05 (`riders` module), 08 (cutover) · **Status:** ⏸ deferred (plan noted 2026-07-19)
**Issue:** RULE-AUTH-02 defines a separate rider auth role, but whether Phase 1 ships a rider-facing client — (a) rider role inside the consumer mobile app, (b) a separate rider app, or (c) no rider client (retailer-managed) — is undecided. Session 08 named "three clients" but listed two.
**Why it matters:** determines the cutover client-verification set, and whether the `riders` module (05) needs rider-facing endpoints/JWT-scope surface vs retailer-only management.
**Plan (tackle in the module/expansion phase, with session 05):** (1) decide a/b/c; (2) if (a) or (b), define the rider client's auth scope + the endpoints it hits and add rider verification to 08; if (c), mark the rider role retailer-managed/dormant and correct the client count. Keep the `riders` module port (05) role-agnostic until decided so it doesn't presuppose the answer.
**Deferred by:** 2026-07-19 decision to focus on core/base first.

### GAP-08 — Backups / PITR / disaster recovery unmentioned
**Severity:** 🟡 · **Touches:** 03, 08, `db-migration-runbook.md` · **Status:** ✅ resolved (2026-07-19)
**Issue:** No backup/restore or PITR story for a compliance-sensitive app with an append-only audit chain.
**Resolution:** New **Backups & DR** section in `db-migration-runbook.md`: **Postgres = authoritative (Neon PITR**, retention target 30d, RPO ~min); **Redis = non-authoritative, not backed up** (loss = mass re-auth + cold caches, no data loss); **restore drill on cadence**; backups encrypted at rest. **Two sharp interactions handled:** (1) crypto-shred **keys in a separate KMS** so a DB restore can't un-erase a user (GAP-06); (2) a PITR restore **rewinds the audit chain** → re-verify the chain post-restore + treat the restore as an audited event, with an optional **off-site chain-head anchor** against tamper-then-restore (session 03). Hooked into 03 (post-restore audit), 08 (DR task), erasure doc (key/KMS). Open sub-decisions: retention-window/plan value, RTO measurement, whether to adopt the external anchor.

### GAP-09 — Under-specified seams
**Severity:** 🟡 · **Touches:** 01, 02, 03, 07, 10 · **Status:** 🟠 partially resolved (2026-07-19)
**Issue (three parts):**
- **(A) `service`-token mechanism** for `/internal/*` — named but not designed. → 🔵 core.
- **(B) Trace/correlation propagation** across bus/outbox/n8n — not explicit beyond the saga's `orderId`. → 🔵 core.
- **(C) Entitlement store** shape (Redis cache + DB table + invalidation on `SubscriptionActivated`) — stubbed in 02, consumed in 10, undefined. → 🟣 expansion.
**Resolution:** **(A) resolved** — two caller classes: our own infra mints a **short-lived service JWT** (verified via the existing JWKS, no new mechanism); external orchestrators (n8n, payment provider) use **HMAC + timestamp-skew + Redis nonce** replay protection; secrets rotatable, `/internal/*` never publicly routable + least-privilege (session 02; applied in 07 n8n + 10 billing webhook). **(B) resolved** — event envelope carries `traceparent`/`correlationId`/`causationId`; **outbox stores + relay restores** the trace context so async flows read as one causal chain; OTel propagation enabled in 01; webhook carries `traceparent` (03/01/07). **(C) deferred** — entitlement-store concrete shape held for the **expansion phase** (designed with billing/10), consistent with the focus-core-now decision; session 02 stub annotated. Remaining: part C only.

---

## 🟢 Low

### GAP-10 — Push/`DeviceToken` + session lifecycle
**Severity:** 🟢 · **Touches:** 02, 05 · **Status:** ✅ resolved (2026-07-19)
Push-token refresh/invalidation/multi-device and logout/logout-all-devices weren't spelled out. **Resolved:** logout revokes the current refresh token, logout-all **bumps the token-version** + clears refresh tokens (reuses the existing revocation claim) — session 02. `DeviceToken` lifecycle (register/multi-device/refresh/prune-unregistered; hard-deleted on erasure) — session 05 notifications.

### GAP-11 — Serverless provider capacity limits
**Severity:** 🟢 · **Touches:** 01, 06 · **Status:** ✅ resolved (2026-07-19)
Upstash/Neon connection & command ceilings under Bun + PgBouncer (the pooling open item covers RLS `SET LOCAL`, not raw capacity). **Resolved:** capacity/connection-ceiling sizing note in session 01 (pool within Neon's limit; Redis within per-command/connection limits); **k6 load test validates against plan ceilings** (session 06).

### GAP-12 — Local dev seed/bootstrap
**Severity:** 🟢 · **Touches:** 06 · **Status:** ✅ resolved (2026-07-19)
A linked retailer+consumer+rider fixture for running the whole app locally, distinct from the integration seed. **Resolved:** `bun run seed:dev` script (linked retailer + consumer + rider + asset + order), distinct from the per-test seed — session 06.

### GAP-13 — Audit hash-chain across DB splits
**Severity:** 🟢 · **Touches:** 03 (note only) · **Status:** ✅ resolved (2026-07-19)
The single-chain assumption breaks when a module takes its tables to another DB. **Resolved (note):** audit stays a **centralized sink with one chain** — split-out services emit audit events over the bus to the central audit service rather than starting their own chain (session 03).

---

---

## Second-pass review (2026-07-19) — segregation & core-correctness

Found by turning the decision guide's own **RULE-PACK-02** tests back on the core sessions. Two buckets: **expansion-debt** (LPG vocabulary leaked into core-layer artifacts — no Phase-1 impact, but bites at vertical #2; deferred with the other expansion items) and **core-correctness** (real Phase-1 LPG risks).

### Expansion-debt (deferred to module/expansion phase)

#### GAP-15 — LPG events defined in core (`shared-types`)
**Severity:** 🟡 · **Side:** 🟣 expansion → 🔵 done · **Touches:** 03, 05, 09, final plan · **Status:** ✅ resolved (2026-07-19)
`OrderPlaced`/`DeliveryConfirmed`/`RefillLogged`/`TankEnteredPreemptyZone` were LPG events registered in core `shared-types`. **Resolution:** **pulled forward** (cheap at greenfield). Core `shared-types` defines **generic** `ServiceRequestCreated` + `ServiceRequestStatusChanged` (carry `vertical`/`type`/`lifecycleKey`/`from`/`to`/`serviceRequestId`); **LPG-domain events (`RefillLogged`, `TankEnteredPreemptyZone`) live in `pack-lpg`**. Notifications subscribes to the generic events and picks the **pack-provided template** per `(vertical, status)`; **dependency direction is pack→core** (packs call core contracts; core never imports a pack event). Correlation id `orderId`→`serviceRequestId` (session 09). Applied across sessions 03/05/09 + final plan principle 3.

#### GAP-16 — Tenancy keyed on `retailerId` (LPG vocabulary)
**Severity:** 🟡 · **Side:** 🟣 expansion → 🔵 done · **Touches:** 01, 02, 05, final plan, index, data-model · **Status:** ✅ resolved (2026-07-19)
`app.current_retailer` / `assertRetailerTenant` baked the LPG term "retailer" into core tenancy. **Resolution:** **pulled forward** (cheap at greenfield) — core scope key = **`providerId`**; helper `assertProviderTenant`; RLS session var `app.current_provider`; three axes = **provider**-tenancy / consumer-ownership / link-mediated. "Retailer" remains **only the LPG-facing label** for a provider (retailer dashboard/settings/override stay). Applied across `data-model.md`, sessions 01/02/05, final plan Tenancy section + principle 8, index convention. The one expansion-debt item that was cheaper to fix now than defer.

#### GAP-17 — `rider` is a core RBAC role
**Severity:** 🟡 · **Side:** 🟣 expansion · **Touches:** 02, 05, 09 · **Status:** ⏸ deferred (ties GAP-14)
`requireRole('user'|'retailer'|'rider'|'service')` — `rider` is the LPG delivery **fulfiller** (session 09 `dispatch` generalizes it). **Plan:** core roles = `user`/`provider`/`service`; `fulfiller` is a **pack-contributed role** (needs GAP-18). Resolve with GAP-14.

#### GAP-18 — `DomainPack` contract incomplete
**Severity:** 🟡 · **Side:** 🟣 expansion · **Touches:** 01 (registry), domain-packs draft · **Status:** ⏸ deferred
The contract lists assetTypes/requestTypes/predictionModels/events/routes/notificationTemplates/jobs but **not**: `pricingRules` (how `pack-lpg` registers the preempty-zone discount into core `pricing`), `roles` (GAP-17), `migrations`/schema (a pack's typed side-table, domain-packs §13), pack-specific `policies`, and a **core-contract-compatibility** field (independent pack versioning — `db-migration-runbook.md` §Pack/extension versioning). **Plan:** extend the `DomainPack` contract with these extension points before vertical #2.

#### GAP-19 — Entitlement has no DB backstop
**Severity:** 🟡 · **Side:** 🟣 expansion · **Touches:** 02, 10 · **Status:** ⏸ deferred (with GAP-09-C)
Tenancy has RLS as a backstop; **entitlement (which vertical a tenant may use) is app-layer only** — a missed check = a tenant using an unpaid vertical, with nothing behind it. **Plan:** fold `vertical ∈ entitled-set` into RLS (or a systematic guard) when the entitlement store is built (GAP-09-C).

#### GAP-20 — Order-field placement undefined (core column vs `attributes` vs `pricing`)
**Severity:** 🟡 · **Side:** 🟣/🔵 · **Touches:** 05 · **Status:** ⏸ deferred (rule at 05)
Which order fields are core `service_request` **columns** vs LPG `attributes` (JSONB) vs core `pricing`? (discount, cylinderCount, `clientCreatedAt`, PENDING_SMS-origin). Risk: LPG columns pollute the core table, breaking the polymorphic-JSON discipline. **Plan:** apply RULE-PACK-02 **data-shape test per field** at session 05; LPG-specific → `attributes`, generic → core column, price → `pricing`.

### Core-correctness (Phase-1 LPG risks)

#### GAP-21 — Time-zone / day-boundary handling
**Severity:** 🟡 · **Side:** 🔵 core · **Touches:** 01, 04, 05, 06 · **Status:** ✅ resolved (2026-07-19)
The estimation engine is **day-granular** (kg/day, cycle days, "N days before empty") and preempty/discount windows are day-based, but no doc pins **Asia/Manila** day boundaries. UTC vs PH day ⇒ off-by-one estimates + mistimed preempty alerts. **Resolution:** canonical **`APP_TZ = Asia/Manila`** (UTC+8, no DST) established in session 01 — store timestamps as `timestamptz` (UTC), compute **day boundaries in `APP_TZ`** via a shared tz util (tz-database, not hardcoded `+8`), never from naive UTC. Estimation day-math (04) + preempty countdown & discount windows (05) use PH days; the engine stays pure (injected clock / PH-aligned inputs). **Midnight-boundary tests** in 04/06; final-plan estimation note added. Per-tenant tz deferred to any beyond-PH expansion.

#### GAP-22 — Phone-number-as-identity: change / recovery
**Severity:** 🟡 · **Side:** 🔵 core · **Touches:** 01, 02 · **Status:** 🟠 partially resolved (2026-07-19)
Auth *is* phone+OTP, so the phone is the identity — but PH prepaid SIM churn is high and there is no number-change / account-recovery / merge flow. A SIM change loses the account (tanks, history, links). **Resolution:** full design in new **`identity-phone-change-recovery.md`**. **Locked now (day-1 invariant):** `userId` is the stable identity (PK), **phone is a unique *mutable* credential**, JWT `sub = userId`, no phone FKs — so a number change is a one-column update (sessions 01 schema + 02 JWT). **Phone-change flow** (dual-OTP old+new, keep `userId`, token-version bump, notify both) — **designed, timing TBD** ("review & planning"). **Lost-number recovery = pre-set recovery mechanism** (hashed recovery code / secondary contact enrolled in advance; recovery = credential + new-number OTP) — chosen; support-assisted as backstop. **Number-recycling guard** = dormancy step-up. **Merge out of scope** (Phase 2). **Remaining:** phase timing for the two flows + dormancy/recovery-type sub-decisions (all in the doc). *Invariant is the "resolve now" part; flows are planned.*

#### GAP-23 — Rate-limiter vs legitimate offline-replay burst
**Severity:** 🟡 · **Side:** 🔵 core · **Touches:** 02, 06 · **Status:** ✅ resolved (2026-07-19)
A device reconnecting after a week (GAP-02) drains many queued mutations at once; the `/auth`+global limiter could throttle a **legitimate** replay burst. **Resolution:** the strict `/auth/*` limiter is **separate** from the authenticated-mutation limiter (replay hits the latter); a **repeat `Idempotency-Key` doesn't count** (served from the store); the authenticated-mutation **burst allowance** (token bucket) is sized to a plausible offline-queue drain; client drains with light pacing. Session 02 + 06 test.

#### GAP-24 — Money precision / currency
**Severity:** 🟢 · **Side:** 🔵 core · **Touches:** 05, index · **Status:** ✅ resolved (2026-07-19)
LPG discounts/order amounts aren't specified as **integer minor units** (billing got this right with `priceMinor`; the order/discount path doesn't). Float money = rounding bugs. **Resolution:** all amounts = **integer centavos + `PHP`**, TypeBox `integer`, **no floats**, discount math rounds to the centavo — session 05 note + index convention.

#### GAP-25 — Event-handler idempotency not mandated
**Severity:** 🟢 · **Side:** 🔵 core · **Touches:** 03, 06, index · **Status:** ✅ resolved (2026-07-19)
Outbox is at-least-once; session 03 says "idempotent downstream" but doesn't **mandate every handler dedup on event id**. One un-idempotent handler = double notifications / double refill logs. **Resolution:** convention added (index + session 03) — **every subscriber is idempotent, dedup on event id** (processed-events ledger / natural idempotency); session 06 redelivery test asserts a single effect.

### GAP-26 — API endpoint lifecycle / deprecation policy
**Severity:** 🟡 · **Side:** 🔵 core · **Touches:** `db-migration-runbook.md`, 04, 06, 08 · **Status:** ✅ resolved (2026-07-19)
GAP-04 gave the `/v1` + min-version-gate *mechanism* but no *policy* for evolving/retiring endpoints across releases — stale/offline clients could hit changed/obsolete endpoints. **Resolution:** the **API-lifecycle section in `db-migration-runbook.md`** — same expand/contract discipline as DB: **additive-only within `/v1`**, breaking change → **`/v2` parallel-run** (never delete `/v1` until drained), `Deprecation`/`Sunset` headers + OpenAPI `deprecated`, **min-version 426 gate** as hard backstop (GAP-04), **telemetry-gated removal** (per-endpoint × per-app-version), and the **offline-window constraint** (deprecation window > max offline window, GAP-02). Contract tests (Pact, 06) catch breaks pre-release.

## How to work this list

1. Pick a `GAP-##`, set Status `in-progress`.
2. Make the edit in the **Touches** session doc(s) (or create `11-data-migration-and-cutover.md` for GAP-01/03).
3. Set Status `resolved` and note which doc absorbed it.
4. GAP-01, GAP-02, GAP-03 are best resolved **before session 05 lands** — cheapest now, most expensive at cutover.
