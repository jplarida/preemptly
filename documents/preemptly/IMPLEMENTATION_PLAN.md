# PreEmptly — Implementation Plan

**Created:** 2026-03-01
**Status:** Draft — pending review
**Last Updated:** 2026-03-01

---

## Current State (as of Feb 17, 2026 audit)

| Area | Completeness | Notes |
|------|-------------|--------|
| Database Schema (Prisma) | 95% | 13 models, 8 enums, seed data |
| API Backend (NestJS) | 85% | 10 modules implemented |
| Estimation Engine | 100% | Core logic + 25 unit tests passing |
| Flutter Mobile App | 75% | All core screens built |
| Next.js Web Dashboard | 85% | All 8 pages functional |
| Shared Types Package | 90% | 9 enums, 22 interfaces |
| DevOps/CI | 0% | Nothing set up |
| Testing | 15% | Only estimation engine tested |

---

## Gap Analysis: preemptly.md Process Flow vs Current Build

The original business process flow (`preemptly.md`) reveals significant gaps in what's been built. The current app is a **self-service consumer app**, but the intended design is a **rider-mediated onboarding and delivery system** with QR codes, discounts, and SMS fallback.

### GAP 1: Rider Role — NOT BUILT
- The process flow describes a **rider** (delivery person) as a key actor
- Rider does initial customer interview and data input on first delivery
- Rider has their own app view with upcoming prospect reorders
- Rider scans customer QR to acknowledge orders
- Rider reports/updates records to the web app
- **Impact:** New user role, new screens, new API endpoints, schema changes

### GAP 2: QR Code Flow — NOT BUILT
- **First delivery:** Rider inputs customer data → generates QR code containing customer + retailer details → customer scans to onboard
- **Reorder:** Customer taps "preemptly" button → button replaced with QR code → rider scans to acknowledge
- **Acknowledgement:** Rider generates acknowledgement QR → customer scans to reset/unlock
- **Currently:** Uses manual invite code entry, no QR generation or scanning
- **Impact:** QR generation/scanning on both consumer and rider apps, new linking flow

### GAP 3: Discount System — NOT BUILT
- Early reorder incentive pricing:
  - 5 days early = less 50 pesos
  - 4 days early = less 50 pesos
  - 3 days early = less 50 pesos
  - 2 days early = less 50 pesos
  - 1 day early = less 50 pesos
  - 0 days = no discount
- Retailer can override discounts from web app (as long as still available)
- **Impact:** New pricing model in schema, discount calculation logic, API endpoints, UI on all apps

### GAP 4: SMS Fallback for Orders — NOT BUILT
- When offline, app composes a **formatted SMS** directly to the store phone number:
  ```
  Hello [store name]
  PREEMPTLY ORDER ON: [generated id]
  by: [customer name]
  address: [customer address]
  contact number: [customer phone]
  customer lpg size: [lpg size]
  ```
- This is a real SMS the store can read — not a queued API call
- Rider app can also parse incoming SMS as order references
- **Impact:** SMS intent integration in Flutter, formatted message templates, SMS parsing on rider side

### GAP 5: Onboarding Flow is Inverted
- **Document says:** Rider inputs data on first delivery → generates QR → customer scans to set up app
- **Currently built:** Customer self-registers, self-sets up tank, manually enters retailer code
- **Impact:** Rework of onboarding screens, new rider-side input flow

### GAP 6: "Very Heavy" Consumption Level — MISSING
- Document lists: light, regular, heavy, **very heavy**
- Current estimation engine: light, moderate, heavy (no very heavy)
- **Impact:** Minor — add enum value and usage profile

### GAP 7: Web App Rider Management — NOT BUILT
- Retailer web app should notify riders of prospect reorder lists
- Rider updates/reports flow back to web app
- **Impact:** New web dashboard pages, rider assignment logic

---

## Revised Implementation Phases

### Phase 1: Get It Bootable

**Goal:** Make the full stack runnable end-to-end.

- [ ] Run Prisma migrations against Neon database (`npx prisma migrate dev --name init`)
- [ ] Run seed script (`npx prisma db seed`)
- [ ] Fix Flutter auth guard — GoRouter currently allows unauthenticated access to `/home`
- [ ] Initialize Firebase in Flutter (`Firebase.initializeApp()` in `main.dart`)
- [ ] Verify API starts and connects to database
- [ ] Verify web dashboard starts and can hit API
- [ ] Verify mobile app builds and connects to API

---

### Phase 2: Rider Role & Schema Updates

**Goal:** Add the rider as a first-class user role across the system.

#### 2.1 Schema Changes
- [ ] Add `Rider` model to Prisma schema (linked to Retailer)
- [ ] Add `RIDER` to user role enum
- [ ] Add `riderId` to Order model for delivery assignment
- [ ] Add `Discount` model or discount fields to Order (days early, discount amount, override flag)
- [ ] Add `VERY_HEAVY` to `UsageLevel` enum
- [ ] Run migration

#### 2.2 API — Rider Endpoints
- [ ] Rider auth (OTP same as consumer/retailer, role-based)
- [ ] `GET /rider/prospects` — upcoming reorder prospect list
- [ ] `POST /rider/customers` — rider inputs customer data on first delivery
- [ ] `PATCH /rider/orders/:id/acknowledge` — rider acknowledges order
- [ ] `POST /rider/reports` — rider updates delivery records

#### 2.3 API — Discount Logic
- [ ] Discount calculation service (days-before-empty → discount amount)
- [ ] `GET /orders/:id/discount` — get applicable discount
- [ ] `PATCH /orders/:id/discount` — retailer override discount (web app)
- [ ] Include discount info in order creation and notification flows

---

### Phase 3: QR Code Flow

**Goal:** Replace manual invite codes with the QR-based linking and order flow.

#### 3.1 QR Generation & Scanning (Flutter)
- [ ] Add `qr_flutter` (generation) and `mobile_scanner` (scanning) packages
- [ ] First delivery QR: Rider generates QR containing customer + retailer details + unique ID
- [ ] Customer onboarding: Scan rider's QR to auto-populate profile and link to retailer
- [ ] Reorder QR: Customer taps "preemptly" → button replaced with QR code for rider to scan
- [ ] Acknowledgement QR: Rider generates ack QR → customer scans to reset order state

#### 3.2 API Support
- [ ] `POST /qr/generate` — generate QR payload with customer + retailer details
- [ ] `POST /qr/verify` — validate and process scanned QR data
- [ ] Update linking flow to support QR-based onboarding (replace or supplement invite codes)

#### 3.3 Rework Consumer Onboarding
- [ ] New onboarding path: scan rider QR → auto-setup (instead of manual self-setup)
- [ ] Keep manual setup as fallback option

---

### Phase 4: SMS Fallback & Offline Flow

**Goal:** Enable ordering via SMS when offline.

- [ ] Build formatted SMS composer in Flutter (using `url_launcher` or `flutter_sms`)
- [ ] SMS template with order details (store name, generated ID, customer info, LPG size)
- [ ] Trigger SMS fallback when no internet connection detected on "preemptly" button tap
- [ ] Rider-side: parse incoming SMS messages as order references (if feasible)
- [ ] Wire existing offline queue — connect `OfflineQueue` to `ApiClient` for API call replay
- [ ] Integrate `connectivity_plus` for network state detection

---

### Phase 5: Wire Remaining Integrations

**Goal:** Connect stubbed services to real implementations.

- [ ] Integrate Firebase Admin SDK in NestJS `NotificationsService` for push delivery
- [ ] Configure FCM in Flutter (receive and display notifications)
- [ ] Build `SemaphoreOtpSender` — Philippine SMS gateway
- [ ] Add rate limiting on OTP endpoints (max 5 requests/phone/hour)
- [ ] Add "very heavy" consumption profile to estimation engine

---

### Phase 6: Mobile App Polish

**Goal:** Complete Flutter app gaps.

- [ ] Build settings sub-screens (Tank Settings, Notifications)
- [ ] Add typed models using Freezed/JSON Serializable — replace `Map<String, dynamic>`
- [ ] Handle multi-tank edge case gracefully
- [ ] Add loading/error/empty states across all screens
- [ ] Rider app screens (prospect list, QR scanner, delivery reporting)

---

### Phase 7: Web Dashboard — Rider Management & Discounts

**Goal:** Add rider and discount management to retailer dashboard.

- [ ] Rider list page — view/manage riders linked to retailer
- [ ] Prospect reorder list — notify riders of upcoming orders
- [ ] Discount management — view/override discounts on orders
- [ ] SMS reminder to customers in preemptly state
- [ ] Set up shadcn/ui component library
- [ ] Extract reusable components (buttons, cards, badges, tables)
- [ ] Add loading skeletons and error states

---

### Phase 8: Security & Production Readiness

**Goal:** Harden for production.

- [ ] Add Helmet middleware for HTTP security headers
- [ ] Harden CORS configuration
- [ ] Input sanitization across all endpoints
- [ ] Server-side auth for web dashboard (Next.js middleware / httpOnly cookies)
- [ ] Swagger API docs (`@nestjs/swagger` at `/api/docs`)

---

### Phase 9: Testing

**Goal:** Reasonable test coverage before launch.

- [ ] API integration tests — auth, refill, order lifecycle, rider endpoints, discount logic
- [ ] Flutter widget tests — dashboard, auth, QR flow
- [ ] Offline queue + SMS fallback tests
- [ ] E2E tests:
  - Consumer journey: scan QR → track → preemptly reorder → rider acknowledgement
  - Rider journey: input customer → deliver → scan orders → report
  - Retailer journey: register → manage riders → manage orders → override discounts

---

### Phase 10: DevOps & Deployment

**Goal:** CI/CD pipeline and production infrastructure.

- [ ] Dockerfile for NestJS API (multi-stage build)
- [ ] Neon DB production branch + connection pooling (`pgbouncer=true`)
- [ ] API deployment (Railway/Render/Fly.io)
- [ ] Web deployment (Vercel)
- [ ] Mobile builds (APK + IPA)
- [ ] GitHub Actions CI/CD pipeline
- [ ] Sentry error tracking (backend + mobile)

---

### Phase 11: Launch Prep

**Goal:** Final validation and release.

- [ ] Full E2E testing on staging environment
- [ ] Performance testing
- [ ] Security audit
- [ ] App store listing prep (screenshots, descriptions)
- [ ] Play Store / TestFlight submission

---

## Estimated Monthly Costs

| Service | Cost |
|---------|------|
| Neon PostgreSQL | Free–$19/mo |
| Backend hosting | ~$7-15/mo |
| Vercel (Next.js) | Free |
| Firebase (FCM) | Free (up to 10K notifs/mo) |
| Semaphore SMS | ~$10-50/mo |
| **Total** | **~$35-85/mo** |

---

## Future Considerations

### API Framework Migration: NestJS → Elysia (Bun)
- Elysia on Bun significantly outperforms NestJS on Node.js in raw throughput and latency
- Not worth doing now — existing 10-module NestJS API works, and the bottleneck is database I/O, not framework overhead
- Revisit when: scaling beyond initial user base, or if a major API rewrite is needed for other reasons
- Benefits: faster cold starts, lower latency, Eden treaty for end-to-end type safety
- Risks: younger ecosystem, Prisma/Bun edge cases, migration effort

---

*This plan is a draft and will be updated based on further review.*
