---
name: codebase-invariants
description: Cross-cutting rules and non-obvious invariants for the PreEmplty codebase. Read this before diagnosing bugs or making structural changes.
type: reference
last_updated: 2026-07-19
---

## How to use this file

Each entry is a **load-bearing rule** — something true across the codebase that you'll miss if you're only reading one file. When a bug contrasts two paths ("works on web, broken on mobile"), check here first.

---

## Authentication

### RULE-AUTH-01: Phone OTP only — no password auth
**What**: Auth is phone number + 6-digit OTP (via Semaphore SMS). JWT issued on verify. Philippines (+63) only in Phase 1.
**Why it matters**: do not introduce password flows or email auth. All auth screens assume phone-first.
**Invariant**: `isNewUser` flag in the verify-otp response determines onboarding vs home navigation.

### RULE-AUTH-02: Three separate auth roles
**What**: Consumer, Retailer, and Rider are separate auth flows with separate JWT scopes.
**Why it matters**: a consumer JWT cannot access retailer endpoints and vice versa. Middleware enforces role.

### RULE-AUTH-03: userId is the identity; phone is a mutable credential
**What**: The stable identity is **`userId`** (PK). The phone number is a **unique but *mutable* credential**, never an identity or foreign key. JWT **`sub = userId`** (not phone). Every ownership/tenancy FK references `userId`.
**Why it matters**: PH prepaid SIM churn is high — a phone-number change must be a one-column update that keeps all data (tanks/orders/links) intact, and lost-number recovery must migrate the number on the same `userId`. Using phone as identity/FK anywhere breaks phone-change/recovery (GAP-22).
**Invariant**: no table uses `phone` as a FK or primary identity. Scope: **`api-core`** (the current `apps/api-elysia` may resolve identity by phone — this is the fix). Full design: `docs/plans/final/identity-phone-change-recovery.md`.

---

## Orders & Status

### RULE-ORDER-01: Single DB status, role-specific labels
**What**: The database has one canonical status per order (PENDING, CONFIRMED, ASSIGNED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED_BY_CUSTOMER, CANCELLED_BY_RETAILER, REJECTED). Each role (customer, retailer, rider) sees a different label for the same status.
**Why it matters**: never expose raw DB enum to customers. Always map via `statusLabel` or the client-side label map.
**Invariant**: PENDING_SMS is a mobile-app-only local state for offline queued orders — it is never persisted to the DB.

### RULE-ORDER-02: Discount is locked at order creation
**What**: The discount amount is calculated and locked when the customer taps "Place Order". It does not change if delivery is delayed or retailer settings change afterwards.
**Invariant**: retailer can only override (increase/decrease) a specific order's discount from the web dashboard, within configured bounds.

---

## Estimation Engine

### RULE-EST-01: Three confidence tiers — cold start is always first
**What**: Estimation uses three tiers in priority order:
1. **LOW / cold-start** (0 refills) — profile-based: Light ~45d, Regular ~37d, Heavy ~28d, Very Heavy ~20d for 11kg
2. **MEDIUM** (1–2 refills) — calibrated with correction factor
3. **HIGH** (3+ refills) — history-based rolling average

**Why it matters**: for new users, estimates are ±30% — never present them as precise. Show confidence badge.
**Invariant**: the `confidence` field on `Estimation` model drives UI colour coding and copy.

### RULE-EST-02: Preempty zone is retailer-configurable
**What**: The "preempty zone" threshold (default 5–7 days before estimated empty) is set per-retailer on the web dashboard. The discount tier structure auto-scales to this threshold.
**Why it matters**: do not hardcode 5 or 7 anywhere in the mobile app. Always read from the API response.

---

## Offline / Mobile

### RULE-OFFLINE-01: PENDING_SMS is a local-only state
**What**: When a customer places an order while offline, the app opens the SMS composer pre-filled and sets local status to PENDING_SMS. Once back online, the queued order syncs to the API.
**Why it matters**: PENDING_SMS should never appear in API responses. If you see it on the server, something went wrong with the sync deduplication.

### RULE-OFFLINE-02: Mutations queue in SQLite, reads fall back to cache
**What**: Offline queue (`offline_queue` table) stores mutations (POST/PATCH/DELETE). Read cache (`cache` table) stores API responses with TTL. Cache-then-network is the default read strategy; network-first for orders (change frequently).
**Invariant**: on connectivity restore, process the offline queue in `created_at ASC` order before refreshing caches.

### RULE-OFFLINE-03: freezed models require build_runner
**What**: Dart models use `freezed` + `json_serializable`. Generated files (`.freezed.dart`, `.g.dart`) must be regenerated with `flutter pub run build_runner build` after any model change.
**Why it matters**: missing generated files will prevent compilation. Do not commit without running build_runner.

---

## QR Codes

### RULE-QR-01: Hybrid QR — reference ID + minimal offline fields only
**What**: QR codes contain the link reference ID + minimal offline-essential fields (retailer name, store phone, LPG size). Full customer/order details are NOT embedded — they're fetched by ID when online.
**Why it matters**: embedding full data makes QR dense, hard to scan, and stale on data change. Reference ID is the canonical key.

---

## Payments

### RULE-PAY-01: Phase 1 is COD only
**What**: Cash on Delivery is the only payment method in Phase 1. GCash/Maya are Phase 2.
**Why it matters**: do not wire up any payment gateway integration yet. The `paymentMethod` field exists in the schema but is not active.

---

## Platform / Domain Packs

> The full `RULE-PACK-*` series (01 tier-boundary/extension-law · 02 determination tests · 03 skeleton-in-core/variation-in-pack · 04 promotion timing · 05 acid-test/Trace · 06 process archetypes) is defined in `docs/plans/final/core-vs-pack-decision-guide.md` (in the `api-core` greenfield plan). Stubbed here so the IDs are citable from code review. Applies to `apps/api-core` / `packages/{platform-kernel,core-domain,pack-*}`; not to the current `apps/api-elysia`.

### RULE-PACK-06: Process archetypes — one lifecycle template per archetype
**What**: Process-bearing verticals instantiate a shared `lifecycleTemplate` (archetype) that sits above `service_request.lifecycleKey`; multiple keys share one template (LPG `delivery` and healthcare `home-visit` are both the `visit` archetype). The template owns the state graph, transitions, timers/SLAs, and saga persistence; a pack registers **deltas only** — states added, guards, actor (`fulfiller`) role, the on-site `perform` handler, compensations, required `attributes`.
**Why it matters**: never copy a state machine per vertical, and never put `switch (vertical)` / `if (vertical === …)` inside a template (that is a RULE-PACK-01 violation). One template per archetype (`visit` / `monitoring` / `booking` / `case`) — do not force a monitoring flow through `visit`.
**Invariant**: build the seam now, extract the shared template on the **second real caller** (RULE-PACK-04); regulatory/clinical constraints (credentialing, consent) fill the template's guard/required-attributes slots — they do not justify a fork. Full spec, the archetype test, and the archetype ledger live in `core-vs-pack-decision-guide.md`. Realized in build session 09.
