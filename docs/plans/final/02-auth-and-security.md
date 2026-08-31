# Session 02 — Auth & Security

> Part of the PreEmptly API final plan. See `00-README-index.md`. **Depends on:** 01 (kernel, env, redis).
> Builds the `platform/auth/*` + security middleware, then ports the `auth` module as the first real module and the reference for object-level authorization.

## Goal

All security primitives other modules depend on, plus a hardened phone-OTP auth flow. Closes the classes of bug the current backend has: `"dev-secret"` JWT, 30-day single token, no rate limiting, no OTP throttling, and IDOR.

## Tasks

### Security primitives (`platform/`)
- [ ] `platform/auth/jwt.ts` — access + refresh flow (replaces 30-day single token). **Asymmetric EdDSA/RS256 + JWKS** so split-out services verify with a public key. `sub` (= **`userId`, never phone** — identity invariant, GAP-22) / `role` / `iat` / `exp` + token-version claim for revocation. Refresh tokens stored in Redis. **Offline-window sizing (GAP-02):** set the **refresh-token lifetime ≥ the expected offline window** (a week+; e.g. 30–90d) so a reconnecting device usually refreshes without re-auth. When the refresh token *has* expired, re-auth is via OTP and **must preserve the offline queue, draining only under the same `userId`** (see `offline-sync-contract.md`; the queue itself lives client-side).
- [ ] `platform/auth/current-user.ts` — derive middleware; port logic from `apps/api-elysia/src/lib/auth.ts` but **deps injected** (prisma/redis/config), secret from validated env.
- [ ] `platform/auth/rbac.ts` — `requireRole('user'|'retailer'|'rider'|'service')` composable guard. Replaces scattered inline `if (role === ...)` checks. **Apply it to every retailer/rider/user route** — today only one route in the whole app checks role. `service` role is for n8n `/internal/*` (session 07).
- [ ] `platform/auth/policy.ts` — **object-level authorization, three axes**: `assertProviderTenant` (provider-scoped rows, scope key `providerId` — GAP-16), `assertOwner` (consumer-owned rows), `assertLinked` (provider↔consumer via an `ACTIVE` `Link`/`ServiceRequest`), plus collection-scoping helpers that inject the tenant filter into list queries. Enforced in repositories — the systematic IDOR fix every module uses. (Detail: `draft/api-backend-multi-tenancy.md`.)
- [ ] **Postgres RLS [Now, mandated]** — enable RLS on provider-scoped and consumer-owned tables (and on `asset`/`service_request`, keyed by tenant+`vertical`); policies read `app.current_provider`/`app.current_user` (set by the 01 middleware); the `service` role bypasses (`BYPASSRLS`) for relay/internal jobs. App-layer policy is primary; RLS is the backstop — a missed `where` cannot leak across tenants. Axis 3 (`assertLinked`) stays app-layer (cross-table).
- [ ] **Entitlement / vertical gate** — a check (deployment config × per-tenant entitlement) the pack registry consults so a tenant only reaches verticals it is enabled for. Stub the entitlement store now (the full model is Phase-2 hierarchical tenancy); `pack-lpg` is enabled by default. **The store's concrete shape (Redis cache + DB table + invalidation on `SubscriptionActivated`) is deferred to the expansion phase, designed with billing (session 10) — GAP-09 part C.**
- [ ] `platform/http/rate-limit.ts` — Redis-backed global IP limiter + strict per-route limiters on `/auth/*`, keyed by IP **and** phone. **Offline-replay carve-out (GAP-23):** the strict `/auth/*` limiter is **separate** from the authenticated-mutation limiter (a reconnecting device's replay burst hits the latter, not `/auth`); a **repeat `Idempotency-Key`** (served from the store) **does not count** against the limit; size the authenticated-mutation **burst allowance** (token bucket) to a plausible offline-queue drain so a legitimate week-long replay isn't throttled as abuse.
- [ ] `platform/http/idempotency.ts` — `Idempotency-Key` middleware for mutations. **Durable, per `offline-sync-contract.md` (GAP-02):** DB-backed store keyed by **(userId, key)**, storing the original response, with **≥30-day retention** (offline windows are a week+, so Redis-TTL-only is insufficient); Redis as an optional fast-path in front.
- [ ] **Service / machine authentication for `/internal/*` (GAP-09)** — how a caller proves the `service` role. **Two classes:** (a) **our own infra** (the GAP-05 K8s CronJob → `/internal/jobs/*`, the relay, future split-out services) mints a **short-lived service JWT** from a machine credential (`role=service`), verified via the **same JWKS path** — no new verification mechanism; (b) **external orchestrators** (n8n, payment provider) use **HMAC-signed requests** — signature over `timestamp + body`, **reject on clock-skew > N min**, **nonce stored in Redis (TTL) to block replay** (replay protection beyond bare HMAC). Signing secrets / machine creds via validated env, **rotatable with an overlap window**; `/internal/*` is **never publicly routable** (network policy) *on top of* the role guard; least-privilege per integration.

### Auth module port (`modules/auth`)
- [ ] Port send-otp / verify-otp behind the new repository + contract layers.
- [ ] **OTP hardening + SMS-pumping defense**: server-enforced 60s resend cooldown, max sends/phone/hour, max verify attempts → temporary lockout (all Redis-backed); **libphonenumber-js** validation accepting only valid PH mobile prefixes (reject landline/premium/invalid); CAPTCHA/Turnstile after N attempts; Semaphore spend cap + alert hook.
- [ ] Preserve the `isNewUser` contract (drives onboarding vs home nav).
- [ ] **Logout / logout-all-devices (GAP-10)** — logout revokes the current refresh token (Redis); logout-all **bumps the user's token-version** (invalidating all outstanding access tokens) and clears their refresh tokens. Reuses the token-version claim already in `jwt.ts`.
- [ ] **Phone change & recovery (GAP-22, `identity-phone-change-recovery.md`) — designed, timing TBD ("review & planning"):** verified in-app **phone change** (OTP old + new → swap the phone credential on the **same `userId`**, bump token-version, audit + notify both numbers); **lost-number recovery** via a **pre-set recovery mechanism** (recovery code hashed at rest + optional secondary contact, enrolled in advance; recovery = credential + new-number OTP → migrate number, force re-setup, heavy rate-limit + alert). **Number-recycling guard:** dormancy step-up re-verification. Account **merge out of scope** (Phase 2). *The **identity invariant** (`userId` = identity, phone = mutable credential) is enforced now regardless of when these flows ship.*
- [ ] `auth.events.ts` — emit auth events to the (session 03) audit sink.

## Files (new)

`apps/api-core/src/platform/auth/{jwt.ts,current-user.ts,rbac.ts,policy.ts}`,
`apps/api-core/src/platform/http/{rate-limit.ts,idempotency.ts}`,
`apps/api-core/src/modules/auth/{auth.routes.ts,auth.service.ts,auth.repository.ts,auth.model.ts,auth.contract.ts,auth.events.ts,auth.unit.test.ts,auth.integration.test.ts}`.

## Reuse

- Auth derive/JWT logic + role resolution: `apps/api-elysia/src/lib/auth.ts`.
- OTP flow + `otp-sender` abstraction: `apps/api-elysia/src/modules/auth/` + `src/lib/otp-sender.ts`.

## Acceptance / verification

- Boot fails if `JWT_*` unset (already from 01; confirm auth path uses env, no fallback).
- send-otp → verify-otp issues a short access token + refresh; refresh rotates; revoked token-version rejected.
- Exceed OTP send limit → **429**; landline/invalid PH number → **400/422**; CAPTCHA challenge after N attempts.
- `requireRole` blocks wrong-role tokens (**403**).
- `policy.ts` blocks access to another user's object by id (**403**) — the reference the modules session reuses.
- **Tenancy axes:** retailer A cannot read retailer B's row (**403**); `assertLinked` blocks a retailer not linked to a consumer (**403**), and succeeds after an `ACTIVE` link.
- **RLS backstop:** a query with its tenant `where` clause removed still returns only the caller's rows; a raw cross-tenant read with no session variable set is denied.
- Duplicate mutation with same `Idempotency-Key` → single effect.
- Unit + integration tests green; `tsc -b` clean.

## Decisions to make here

- Refresh-token model: Redis rotation vs DB table. **Lifetime must exceed the offline window (GAP-02) — pick a concrete value (30/60/90d).**
- CAPTCHA provider (hCaptcha vs Cloudflare Turnstile).
- Idempotency store + retention (DB vs Redis+DB; default 30d) — per `offline-sync-contract.md`.
