# PreEmptly API — Enhancements & Hardening Backlog

> **⚠️ SUPERSEDED (2026-07-16)** — consolidated into `../api-backend-final-plan.md`. Kept for provenance; **do not treat as current** — read the final plan instead.
>
> **Status:** Draft · **Date:** 2026-07-16 · **Coverage:** preempty:default
> Companion to `api-backend-greenfield-plan.md`. Advanced security, 3rd-party/OSS integrations, and reliability patterns to layer onto the greenfield `apps/api-core` plan.
> Real code lives at `D:\Personal\projects\preempty`.
>
> **Priority tags:** **[Now]** = Phase-1, do it · **[Seam now, build later]** = design/wire the seam in the scaffold, implement later · **[Phase 2+/optional]**.

---

## A. Security — deepening beyond the base plan

### A1. Object-level authorization (BOLA/IDOR) — [Now] — highest priority
OWASP API #1, and already a **live gap**: `apps/api-elysia/src/modules/orders/index.ts` has `GET /:id → OrdersService.findOne(params.id)` with **no ownership/tenant check** — any authenticated user can read any order by ID. RBAC (role checks) ≠ object authorization (does *this* user own *this* row).
- Add a systematic **policy layer**: every fetch-by-id receives `currentUser` and asserts ownership / retailer-tenancy in the repository, not ad hoc per route.
- Consider Postgres **Row-Level Security (RLS)** as defense-in-depth for retailer tenancy.
- **Action item:** fix the `findOne` IDOR when porting the `orders` module.

### A2. SMS-pumping / OTP toll fraud — [Now] — PH-specific money risk
Phone-OTP systems are prime targets: attackers hammer `send-otp` to drain the Semaphore balance / pump premium numbers.
- **libphonenumber-js** validation — accept only valid PH **mobile** prefixes (Globe/Smart/DITO), reject landlines/premium/invalid numbers.
- Velocity caps per phone **and** IP **and** device; exponential backoff.
- **CAPTCHA / proof-of-work** (hCaptcha / Cloudflare Turnstile) after N attempts.
- Semaphore **spend cap + alert**; hard daily send ceiling.
- New-device login notification.

### A3. PH Data Privacy Act (NPC / RA 10173) compliance + PII handling — [Now-ish] — legal
Phone numbers + addresses are PII.
- Consent capture; documented **retention policy**; **data export & delete** endpoints (right to erasure).
- Field-level encryption or at-rest encryption for sensitive columns.
- Phase-2 GCash/Maya: keep PCI scope near-zero via **hosted checkout** (never handle wallet/card creds directly).

### A4. Supply-chain & static security in CI — [Now] — cheap / high value (folds into CI plan)
- **gitleaks / trufflehog** secret scanning (CI + husky pre-commit hook).
- **Semgrep** (SAST) + GitHub **CodeQL**.
- **Dependabot / Renovate** + `bun audit`; **Trivy** container scan; **SBOM** generation.
- **Schemathesis** — property-based fuzzing off the OpenAPI spec (see B4). Optional **OWASP ZAP** baseline DAST.

### A5. Edge protection (WAF) — [Now] — mostly free
**Cloudflare** in front: DDoS, bot mitigation, edge rate-limit, **geo-restrict to PH** (Phase 1 is +63 only). Blocks a whole class of attacks before Bun.

### A6. Asymmetric JWTs + JWKS rotation — [Seam now, build later]
Base plan pins the algorithm — good. Go further to **EdDSA / RS256** so future split-out services *verify* with a public key and never hold the signing secret. Publish a JWKS endpoint; enables key rotation. (Or **PASETO** for a safer token format.)

### A7. Tamper-evident audit log — [Seam now]
Audit log covers discount overrides + order transitions (financial-dispute surfaces). Make it **append-only + hash-chained** (each row hashes the previous) so it is tamper-evident.

---

## B. Open-source / 3rd-party services & libraries

### B1. Redis (Upstash serverless) — [Now] — foundational
Base plan's rate-limit / OTP throttle / refresh-token store are **in-memory** — which silently breaks the moment you run 2 instances or split services (the exact thing the architecture targets). Move all shared security state to **Redis**. Also provides a cache layer + pub/sub. Upstash serverless free tier pairs well with Neon.

### B2. Durable queue: BullMQ (Redis) — [Seam now] — high value
An in-memory event bus **loses events on crash** and cannot retry. For delivery-critical async work (SMS/FCM sends, n8n dispatch), back it with **BullMQ**: durable jobs, retry-with-backoff, dead-letter queue, scheduled/repeatable jobs (the cron becomes a repeatable job). Clean bridge to the future worker/NATS split. Pairs with the **outbox pattern** (C1).

### B3. Sentry + OpenTelemetry — [Now]
**Sentry** (self-hostable) for error tracking = highest-ROI observability add. **OpenTelemetry** traces/metrics → Grafana Cloud (free tier) / Axiom / Better Stack. **Pino** for fast structured logs (fits the logging plan).

### B4. Elysia OpenAPI (@elysiajs/swagger) + Eden typed client — [Now] — leverages the stack
Auto-generate the OpenAPI spec from TypeBox schemas → free API docs, enables Schemathesis fuzzing (A4), and **Eden Treaty** gives the Next.js web app an **end-to-end type-safe client** with zero codegen. Big DX win + fewer contract bugs across the 3 clients.

### B5. Geocoding / delivery — [Phase 2, pick early]
LPG is physical delivery. Address validation + rider routing needs maps: **Google Maps / Mapbox**, or fully OSS **Nominatim + Photon** (self-host) / **OpenRouteService**. Enables retailer "delivery zone" polygons.

### B6. Product analytics & feature flags: PostHog — [Now-ish]
PostHog (OSS, self-hostable) covers **both** funnels (does "preempty" nudging actually drive earlier reorders? — the core business hypothesis) **and** feature flags to roll out discount tiers per retailer without redeploy. **Unleash** if flags-only OSS is preferred.

### B7. Transactional email + SMS redundancy — [Phase 1 if retailer email added]
**Resend / AWS SES / Postmark** for transactional email. Add a **second SMS provider** (Twilio / Vonage) behind the `otpSender` abstraction so auth is not single-vendor-fragile.

### B8. Testing tooling — [Wire into CI later]
**k6** load testing; **Playwright** web e2e; **Pact** consumer-driven contract tests across mobile / web / API.

---

## C. Advanced implementations

### C1. Transactional Outbox pattern — [Seam now] — the big one
Write the domain event to an `outbox` table **in the same DB transaction** as the state change; a relay ships it to the bus/queue/n8n. Guarantees "state changed ⟺ event emitted" (no lost or ghost events on crash). This is what makes the split-ready bus and n8n integration *actually* reliable rather than best-effort. Cheap up front, painful to retrofit.

### C2. Idempotency keys — [Now]
The offline mobile queue **will** double-submit on flaky networks. An `Idempotency-Key` header + dedup table on all mutations (especially `POST /orders`) prevents duplicate orders. Also required for at-least-once event/queue delivery.

### C3. Order → delivery → refill saga — [Seam now]
The lifecycle (place → confirm → assign → out-for-delivery → delivered → RefillLog → estimation reset → notify) is a multi-step process with failure/compensation. Model it explicitly as a **process manager** over the events. **Temporal** (durable workflows) is the heavyweight option (retries/timeouts/human steps handled for you) — likely Phase 2, but design events so it drops in.

### C4. Estimation-engine evaluation harness — [Now-ish] — protects the core IP
The `accuracyLog` table already exists — build the loop that uses it: **backtesting + offline eval** of predicted-vs-actual cycles, so estimation strategies can be A/B'd and accuracy proven. This is the differentiator; instrument it before it grows. (Later: feature store + a real model behind the same interface.)

### C5. Serverless DB hygiene — [Now]
Neon + Prisma from a long-lived Bun server: use **Neon's pooled connection** (PgBouncer) or **Prisma Accelerate** to avoid connection exhaustion; add read-replica routing later for retailer dashboards.

### C6. API versioning + min-version gating — [Now]
Mobile users can't be force-updated instantly. Ship `/v1` and a **minimum-supported-app-version** check to retire old contracts gracefully.

### C7. Ops hardening — [Now]
Liveness/readiness probes; **graceful shutdown** (drain in-flight requests, flush the bus/queue); circuit breakers + timeouts around Semaphore/FCM (**Cockatiel** / **p-retry**).

### C8. Real-time order tracking — [Phase 2]
Elysia WebSocket/SSE for live status + rider location during delivery.

---

## Top 6 (if nothing else)

1. **Object-level auth (fix the IDOR)** — active vuln. *[A1]*
2. **Redis-backed** rate-limit / OTP / refresh state — security controls otherwise break on scale. *[B1]*
3. **Transactional outbox + BullMQ** — turns the event architecture from best-effort into reliable; what n8n/split rely on. *[C1, B2]*
4. **SMS-pumping defenses** — direct money-loss risk for PH phone-OTP. *[A2]*
5. **CI security scanning** (Semgrep + gitleaks + Trivy + Dependabot) — cheap, folds into planned CI. *[A4]*
6. **OpenAPI + Eden client + Sentry** — typed clients, docs, security fuzzing, error visibility. *[B3, B4]*

## Design-in-now, implement-later (cheap now, painful retrofit)

`outbox` (C1) · `Idempotency-Key` (C2) · Redis-backed shared state (B1) · object-level auth policy layer (A1) · asymmetric JWT + JWKS (A6). Reserve the seams in the first scaffold even if the full implementation lands in a later PR.
