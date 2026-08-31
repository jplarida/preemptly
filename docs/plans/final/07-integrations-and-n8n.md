# Session 07 — Integrations & n8n

> Part of the PreEmptly API final plan. See `00-README-index.md`. **Depends on:** 03 (bus/outbox/relay), 05 (modules + events).
> Layered integrations plus the optional n8n edge orchestration. n8n is **optional for launch**.

## Goal

Add the developer-experience/analytics integrations and stand up n8n as an event-driven orchestration layer for outbound comms and ops automation — without moving any system-of-record logic out of the API.

## Tasks

### Integrations
- [ ] **OpenAPI + Eden Treaty** — publish the generated OpenAPI (from 01's swagger) and wire **Eden Treaty** into the Next.js web app for an end-to-end type-safe client (zero codegen). Targets the **`/v1`** base already in place from session 01 (GAP-04) — no re-pathing.
- [ ] **PostHog** (OSS) — event capture for reorder funnels (does "preempty" nudging drive earlier reorders — the core hypothesis) + per-retailer **feature flags** for discount tiers.
- [ ] **Comms redundancy** — second SMS provider (Twilio/Vonage) behind the existing `otpSender` abstraction; transactional email (Resend/SES) when retailer email is introduced. **Full channel/routing/fallback contract in `notifications-comms-spec.md`.**
- [ ] **Geocoding/delivery** *(Phase 2, scaffold only)* — pick provider (Google Maps/Mapbox or OSS Nominatim+Photon/OpenRouteService) for address validation, rider routing, delivery-zone polygons.

### n8n edge orchestration
- [ ] `platform/events/outbound-webhook.ts` — HMAC-signed adapter that ships selected bus/outbox events to n8n webhook triggers. **Carry `traceparent`/`correlationId` (GAP-09)** so the trace spans API→n8n→API.
- [ ] `service`-role `/internal/*` endpoints (RBAC from 02) for n8n → API callbacks; not exposed publicly. **Auth per the service-token mechanism (GAP-09, session 02):** n8n (external) uses **HMAC + timestamp-skew + Redis nonce** replay protection; our own infra uses a short-lived service JWT.
- [ ] Move **notification delivery** (FCM/SMS/email fan-out) and **ops automation** (retailer digests, refill reconciliation, onboarding, dead-letter alerts) into n8n workflows.
- [ ] Store workflows version-controlled in `ops/n8n/*.json`.
- [ ] Optionally swap the in-memory bus → **BullMQ** for durable dispatch to n8n.

### Boundary (must hold)
- System of record stays in the API (auth, orders, discount locking, estimation, all critical mutations).
- **n8n reacts to events and calls external services; it never owns truth.**
- Idempotent workflows (n8n retries) · off the critical path (down n8n never blocks orders/deliveries) · HMAC-signed webhooks · dedicated `service` identity.

## Files (new)

`apps/api-core/src/platform/events/outbound-webhook.ts`,
`apps/api-core/src/modules/*/…/internal` routes (or a dedicated `modules/internal/`),
`ops/n8n/*.json`,
web app: Eden client wiring (in `apps/web`).

## Acceptance / verification

- Placing an order emits `OrderPlaced` → n8n receives the HMAC-signed webhook → sends notifications; **stopping n8n does not break order placement** (events queue/retry).
- n8n → `/internal/*` calls rejected without the `service` token; HMAC verification rejects tampered payloads.
- Web app compiles against the Eden-typed client; a schema change surfaces as a type error.
- Workflows restore from `ops/n8n/*.json`.

## Notes

- Uses the exact seam that enables service extraction — adopting n8n costs nothing not already built in 03.
- Decide launch-vs-defer and self-hosted-vs-Cloud (see index open items).
