# API Surface — Endpoint Inventory (core)

> Part of the PreEmptly API final plan. See `00-README-index.md`. The consolidated endpoint contract. **Scope: CORE only** (kernel + vertical-agnostic `core-domain`). Pack-LPG, billing, and internal/n8n endpoints are listed as **deferred extensions** (§Extensions) to elaborate later. Feeds OpenAPI/Eden (session 07); shapes reference `data-model.md`.

## Conventions (apply to every endpoint)

- **Base path `/v1`** for business routes; **ops probes unversioned** (GAP-04). OpenAPI at `/swagger`.
- **Auth:** `Bearer` JWT, **`sub = userId`** (GAP-22). Roles: **`user`** (consumer), **`provider`** (LPG label: retailer), **`service`** (internal). `rider` = pack/deferred (GAP-14).
- **Every mutation:** requires **`Idempotency-Key`** (durable, GAP-02); offline-creatable creates accept a **client-supplied `UUIDv7` id**.
- **`X-App-Version`** header → **426 must-update** below the floor (GAP-04).
- **Tenancy** per endpoint (the authZ axis): **own** = `assertOwner(userId)` · **prov** = `assertProviderTenant(providerId)` · **link** = `assertLinked`. RLS backstops all.
- **Strict validation** (TypeBox, `additionalProperties:false`); **money** = integer minor units; **times** = UTC (day-math Asia/Manila, GAP-21).
- **Errors:** canonical envelope + machine-readable code catalog → **`error-taxonomy.md`**.

## Health / ops (unversioned, public)

| Method · Path | Notes |
|---|---|
| `GET /health` · `GET /livez` · `GET /readyz` | liveness/readiness probes |
| `GET /swagger` · `GET /openapi.json` | OpenAPI docs |

## Auth — `/v1/auth`

| Method · Path | Role | Req → Resp | Notes |
|---|---|---|---|
| `POST /auth/send-otp` | public | `{phone}` → `{cooldown}` | rate-limited IP+phone; libphonenumber PH; SMS-pump defense |
| `POST /auth/verify-otp` | public | `{phone, code}` → `{accessToken, refreshToken, isNewUser}` | RULE-AUTH-01 `isNewUser` |
| `POST /auth/refresh` | refresh-token | `{refreshToken}` → `{accessToken, refreshToken}` | rotates; token-version checked |
| `POST /auth/logout` | user | → `204` | revoke current refresh (GAP-10) |
| `POST /auth/logout-all` | user | → `204` | bump token-version (GAP-10) |
| `POST /auth/phone-change/initiate` | user | `{newPhone}` → `{otpSent}` | **GAP-22 planned** (dual-OTP) |
| `POST /auth/phone-change/confirm` | user | `{oldCode, newCode}` → `{ok}` | swap phone on same `userId` |
| `POST /auth/recovery/enroll` | user | `{recoveryCode? , secondaryContact?}` → `{ok}` | **GAP-22 planned** |
| `POST /auth/recovery/recover` | public | `{recoveryCredential, newPhone, otp}` → `{tokens}` | migrate number; heavy rate-limit |

## Me / identity — `/v1/me`

| Method · Path | Role | Req → Resp | Notes |
|---|---|---|---|
| `GET /me` | user | → profile | own |
| `PATCH /me` | user | `{name, …}` → profile | own |
| `POST /me/consent` | user | `{consentVersion}` → `{ok}` | RA 10173 (session 08) |
| `GET /me/export` | user | → portable data dump | RA 10173 (GAP-06) |
| `POST /me/erase` | user | → `202` (async anonymize) | GAP-06; **guarded: no in-flight requests** |

## Providers — `/v1/providers`

| Method · Path | Role | Req → Resp | Notes |
|---|---|---|---|
| `GET /providers/:id` | user | → public profile (name/branding) | via a link |
| `GET /providers/me` | provider | → profile + settings | prov |
| `PATCH /providers/me/settings` | provider | `{generic settings}` → updated | prov; **vertical-specific settings (e.g. preempty threshold) arrive via pack config** |

> Provider provisioning (retailer onboarding) is an onboarding flow, not basic CRUD — scoped separately.

## Places — `/v1/places` (consumer addresses)

| Method · Path | Role | Axis | Notes |
|---|---|---|---|
| `GET /places` | user | own | list own |
| `POST /places` | user | own | `{label, address, geo?}`; Idempotency-Key |
| `GET·PATCH·DELETE /places/:id` | user | own | assertOwner |

## Assets — `/v1/assets` (generic polymorphic; consumer-owned)

| Method · Path | Role | Axis | Notes |
|---|---|---|---|
| `GET /assets?vertical=&type=` | user | own | list own |
| `POST /assets` | user | own | `{id?(UUIDv7), placeId?, vertical, type, attributes}`; **attributes validated vs the pack's type schema**; client id + Idempotency-Key (GAP-02) |
| `GET·PATCH·DELETE /assets/:id` | user | own | assertOwner; `PATCH` = `{attributes}` |

## Service-requests — `/v1/service-requests` (generic polymorphic; the "order" surface)

| Method · Path | Role | Axis | Notes |
|---|---|---|---|
| `GET /service-requests?vertical=&status=` | user \| provider | own \| prov | consumer sees own; provider sees their tenant |
| `POST /service-requests` | user | own→link | `{id?, providerId, vertical, type, lifecycleKey, attributes}`; **discount locked at creation** (RULE-ORDER-02); client id + Idempotency-Key; `PENDING_SMS` never sent (GAP-02); records `clientCreatedAt` |
| `GET /service-requests/:id` | user \| provider | own \| prov/link | **IDOR-guarded** (the fix) |
| `POST /service-requests/:id/transition` | provider \| rider* | prov/link | `{to}`; **state-machine validated** → 409 on invalid (GAP-02); drives the `delivery` lifecycle (confirm/assign/out-for-delivery/delivered) |
| `POST /service-requests/:id/cancel` | user \| provider | own \| prov | user before terminal; emits `ServiceRequestStatusChanged` |

\* `rider` role deferred (GAP-14). Emits generic `ServiceRequestCreated` / `ServiceRequestStatusChanged` (GAP-15) via outbox.

## Links — `/v1/links` (consumer↔provider)

| Method · Path | Role | Axis | Notes |
|---|---|---|---|
| `POST /links` | user | own | `{providerRef | qrRef}` → ACTIVE link; resolves QR reference (RULE-QR-01) |
| `GET /links` | user \| provider | own \| prov | consumer's providers / provider's consumers |
| `GET /links/:id` | user \| provider | own \| prov | scoped |
| `POST /links/:id/primary` | user | own | set `isPrimary` |
| `DELETE /links/:id` | user \| provider | own \| prov | revoke |

## Device tokens & notifications — `/v1/device-tokens`, `/v1/notifications`

| Method · Path | Role | Notes |
|---|---|---|
| `POST /device-tokens` | user | `{token, platform}`; **multi-device upsert** (GAP-10) |
| `DELETE /device-tokens/:id` | user | own |
| `GET /notifications` | user | list own |
| `POST /notifications/:id/read` | user | mark read |
| `GET·PATCH /me/notification-preferences` | user | per-class/type toggles + quiet hours (`notifications-comms-spec.md`) |

## Prediction — nested on asset

| Method · Path | Role | Notes |
|---|---|---|
| `GET /assets/:id/prediction` | user | `{estimatedEmptyDate, confidenceTier, …}`; RULE-EST-01 tiers; assertOwner. (Eval/backtest harness is **not** a public route.) |

---

## Extensions (deferred — integrate later, not built here)

| Surface | Where | Deferred by |
|---|---|---|
| **pack-lpg** endpoints — mounted `/v1/lpg/*` via pack `routes`: manual **refill logging** (`POST /v1/lpg/refills` → emits `RefillLogged`), tank-type helpers, **rider/dispatch**, preempty config | `domain-packs.md`, session 05 | pack scope |
| **Billing / checkout** — `/v1/billing/plans`, `/v1/billing/checkout`, `/v1/billing/subscription` | `10-billing-checkout.md` | Phase-2 |
| **Internal / n8n** — `service`-role `/internal/*` (jobs, callbacks), `/internal/billing/webhook` | session 07, 10 | integration/Phase-2 |
| **Rider client** surface | GAP-14 | undecided |

## Cross-refs

- Entities/shapes: `data-model.md` · Auth/RBAC/policy: session 02 · Events emitted: `03` (generic) + `pack-lpg` (GAP-15) · Versioning/gate: `01` (GAP-04) · Offline/idempotency: `offline-sync-contract.md`.
- **Next companions:** error taxonomy (envelope + code catalog) and env/config catalog.
