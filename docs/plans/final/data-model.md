# Data Model — `prisma/schema.prisma` shape

> Part of the PreEmptly API final plan. See `00-README-index.md`. Consolidates the schema implied by the plan + all resolved gaps into one reference. **Landed in session 01** (baseline migration) and extended per session. Polymorphic core per `domain-packs.md`; a clean baseline (pre-launch, no migration — GAP-01).
> **Layers:** kernel/platform tables · core-domain (vertical-agnostic) · pack-lpg (LPG-specific) · billing (Phase-2 seam). Packaging (one schema vs `multiSchema`) is an open decision.

## Column conventions (apply to every table)

| Concern | Rule | Reflects |
|---|---|---|
| **IDs** | `UUIDv7` PK; **client-suppliable** on offline-creatable entities (`asset`, `service_request`) so offline mutations replay with no remap | GAP-02 |
| **Money** | integer **minor units** (`*_minor`, centavos) + `currency` (default `PHP`); **never floats** | GAP-24 |
| **Time** | all `timestamptz` (**UTC**); day-granular math computed in **Asia/Manila** | GAP-21 |
| **PII** | sensitive columns (phone, name, address) **encrypted at rest with a per-user key** (crypto-shred = delete key) | GAP-06/08 |
| **Discriminators** | polymorphic tables carry real `vertical` + `type` columns + JSONB `attributes` (validated per type on write) | domain-packs |
| **Tenancy** | tenant = **provider**; scope key **`providerId`** (generic — **GAP-16 resolved**; "retailer" is the LPG-facing label only); consumer-owned via `userId` | tenancy, GAP-16 |
| **Audit** | `audit_log` stores **IDs + event types only, no PII** | GAP-06/25 |
| **Erasure** | `status='erased'` tombstone + crypto-shredded/nulled PII; `userId` retained | GAP-06 |

## Kernel / platform tables (infra)

| Table | Key columns | Reflects |
|---|---|---|
| `outbox` | id, type, payload, **traceContext** (traceparent/correlationId/causationId), createdAt, deliveredAt, attempts | session 03, GAP-09 |
| `audit_log` | id, event, actorUserId, targetId, meta (**no PII**), prevHash, hash, createdAt | session 03, GAP-06/08/25 |
| `idempotency` | (userId, key) PK, response, method, createdAt, **expiresAt (≥30d)** | GAP-02 (durable) |
| `saga_state` | id, correlationId (=serviceRequestId), lifecycleKey, state, context JSON, updatedAt | session 09 |
| `processed_event` | (consumer, eventId) — handler dedup ledger (or natural idempotency) | GAP-25 |

## Core-domain tables (vertical-agnostic)

| Table | Key columns | Reflects |
|---|---|---|
| `User` (identity) | **id (userId, PK, stable)**, **phone (unique, MUTABLE credential)**, role, tokenVersion, phoneEnc/nameEnc (PII), recoveryCodeHash?, secondaryContact?, consentVersion/consentAt, status(active\|erased), createdAt | GAP-22 (identity), GAP-10 (tokenVersion), GAP-06 (PII/erase), session 08 (consent) |
| `Provider` (← Retailer) | id, name, settings (preempty threshold, discount tiers), branding?, createdAt — **gas-free** | tenancy; RULE-EST-02 (threshold) |
| `Place` (← Location) | id, userId (owner), label, addressEnc (PII), geo?, createdAt | consumer-owned |
| `Asset`* (← Tank) | **id (UUIDv7, client-suppliable)**, userId (owner), placeId?, **vertical, type**, **attributes JSONB**, generated cols (e.g. `lpg_capacity_kg`), createdAt/updatedAt | domain-packs, GAP-02/20 |
| `ServiceRequest`* (← Order) | **id (UUIDv7, client-suppliable)**, providerId (tenant), customerUserId, **vertical, type, lifecycleKey, status**, **attributes JSONB**, amount_minor/discount_minor/currency, **clientCreatedAt + receivedAt**, createdAt — **no required tank FK** | domain-packs, GAP-02/20/24; RULE-ORDER-01/02 |
| `Link` (← CustomerRetailerLink) | id, userId, providerId, status(ACTIVE\|…), isPrimary, qrRef, createdAt | tenancy axis 3; RULE-QR-01 |
| `PredictionLog` (← AccuracyLog) | id, assetId, vertical, predictedAt, predictedDays, actualDays?, confidenceTier | GAP-07; RULE-EST-01 |
| `DeviceToken` | id, userId, token, platform, lastSeenAt — owned by `notifications`; multi-device; pruned on FCM-unregister | GAP-10 |
| `Notification` | id, userId, type, payload, sentAt/status — delivery record | session 05 |
| `OtpCode` | phone, codeHash, expiresAt, attempts — **or Redis** (open decision) | RULE-AUTH-01 |

\* Polymorphic core tables. LPG rows are `vertical='lpg'` with LPG fields in `attributes`; **no LPG columns on these tables** (RULE-PACK; GAP-20 per-field ruling).

## pack-lpg tables (LPG-specific)

| Table | Key columns | Reflects |
|---|---|---|
| `RefillLog` (refills) | id, assetId, userId, refilledAt, source(delivery\|manual), amount — the depletion-cycle history prediction calibrates on | session 05; RULE-EST-01 |
| `Rider` (← riders) | id, providerId, name/phone, status — LPG delivery **fulfiller** (generalizes later, GAP-17) | GAP-17 (deferred) |

> LPG's `Tank`/`Order`/gas-enums are **not** tables — they're `Asset`/`ServiceRequest` rows. Discounts/preempty logic = core `pricing` rules + a pack `job` emitting `TankEnteredPreemptyZone` (edge-triggered, PH-day boundaries — GAP-05/21).

## Billing tables (core-domain, Phase-2 seam)

`Plan`, `Subscription`, `Entitlement`, `Invoice`, `Payment`, `WebhookEvent(providerEventId unique)` — per `10-billing-checkout.md`. Entitlement store shape deferred (GAP-09-C). Seam only in Phase 1.

## Indexes, generated columns, RLS

- **GIN index** on `attributes`; promote hot JSON fields to **Postgres generated columns** + index (e.g. `lpg_capacity_kg`) rather than JSON scans.
- FKs on `userId`/`providerId`/`assetId`; partial indexes on `status`/`lifecycleKey` for queues.
- **RLS** on provider-scoped + consumer-owned tables **and** `asset`/`service_request` (keyed by tenant + `vertical`) — one policy set all verticals; `SET LOCAL app.current_provider`/`app.current_user`; `service`/`BYPASSRLS` for relay/jobs. RLS ships in the **same migration** as each new table (GAP-03).
- Entitlement has **no RLS backstop yet** (GAP-19, deferred).

## Phase-1 vs seam

- **Phase-1 [Now]:** kernel tables, all core-domain tables, `Asset`/`ServiceRequest`/`PredictionLog`, pack-lpg (`RefillLog`/`Rider`), RLS.
- **Seam/Phase-2:** `saga_state` (session 09), billing tables (10), entitlement store (09-C), per-pack side-tables (only behind an explicit exception).

## Open decisions

- ~~`retailerId` vs `providerId` (GAP-16)~~ — **DECIDED: generic `providerId`** (2026-07-19; pulled forward, GAP-16 resolved). "Retailer" is the LPG-facing label only.
- **Prisma layout:** single schema vs `multiSchema` (`core` + per-pack) — aligns with the split-ready seam.
- **Refresh tokens / OTP:** Redis vs DB table (`OtpCode`, refresh) — session 02 open item.
- **Pure-JSON vs pack side-table:** JSONB-first; a typed side-table only behind an explicit exception (needs the `migrations` contract slot, GAP-18).
- **Money width:** `int` centavos (sufficient for PH LPG amounts) vs `bigint` — pick per max amount.
- **`RefillLog` as a table vs derived** from `service_request` completions + manual entries (kept as a table here for the manual-refill + cycle-history path).
