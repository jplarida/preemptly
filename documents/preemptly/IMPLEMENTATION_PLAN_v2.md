# PreEmptly — Implementation Plan v2

**Created:** 2026-03-01
**Aligned with:** `preemptly2.md` (Revised Process Flow v2)
**Status:** Draft — pending review

---

## Current Build vs Required (Gap Summary)

| Area | Built | Required by preemptly2.md | Gap |
|------|-------|--------------------------|-----|
| User roles | Consumer, Retailer | Consumer, Retailer, **Rider** | Rider role missing |
| Onboarding | Customer self-registers | Rider-mediated, QR-based | Flow inverted |
| QR codes | None | Hybrid QR (link ID + offline essentials) | Not built |
| Estimation engine | 3 levels (light/moderate/heavy) | 4 levels (+ very heavy) | Minor |
| Discount system | None | Tiered, retailer-customizable, preemptly zone | Not built |
| Order lifecycle | Simple (pending/confirmed/delivered/cancelled) | Role-segregated (8 internal states) | Needs rework |
| SMS fallback | None | Formatted SMS composer + confirmation reply | Not built |
| Offline queue | Class exists, not wired | Wired + SMS fallback + sync dedup | Partially built |
| Delivery acknowledgement | None | QR scan / confirmation code / rider confirm | Not built |
| Multi-retailer | Single link only | Multiple links, primary selection, unlinking | Not built |
| Pricing | None | Base price per size, COD payment tracking | Not built |
| Rider app | None | Dashboard, prospects, deliveries, customer reg | Not built |
| Rider management (web) | None | Assign/manage riders, notify, performance | Not built |
| Fallback channels | None | SMS, missed call, manual call, walk-in entry | Not built |

---

## Phase 1: Get It Bootable

**Goal:** Make the existing stack runnable end-to-end before adding new features.

- [ ] Run Prisma migrations against database (`npx prisma migrate dev --name init`)
- [ ] Run seed script (`npx prisma db seed`)
- [ ] Fix Flutter auth guard — GoRouter allows unauthenticated access to `/home`
- [ ] Initialize Firebase in Flutter (`Firebase.initializeApp()` in `main.dart`)
- [ ] Verify API starts and connects to database
- [ ] Verify web dashboard starts and can hit API
- [ ] Verify mobile app builds and connects to API

---

## Phase 2: Schema Overhaul

**Goal:** Align the database with preemptly2.md requirements.

### 2.1 New Models
- [ ] `Rider` — linked to Retailer, has user account, phone, name, status (active/inactive)
- [ ] `DiscountTier` — retailer-specific discount configuration (day threshold, amount)
- [ ] `RetailerPricing` — base price per LPG size per retailer
- [ ] `DeliveryAcknowledgement` — method used (QR/code/rider-confirm), photo (optional), timestamp

### 2.2 Model Updates
- [ ] `User` — add `RIDER` to role enum
- [ ] `Order` — add fields:
  - `riderId` (assigned rider)
  - `basePricePesos` (snapshot at order time)
  - `discountPesos` (locked at order time)
  - `discountOverridePesos` (retailer override, nullable)
  - `finalPricePesos` (computed)
  - `paymentStatus` (UNPAID / PAID)
  - `acknowledgementMethod` (QR_SCAN / CONFIRMATION_CODE / RIDER_CONFIRM)
  - `orderChannel` (IN_APP / SMS / MANUAL_ENTRY / WALK_IN)
  - `smsOrderId` (for deduplication)
- [ ] `OrderStatus` enum — expand to: `PENDING`, `PENDING_SMS`, `CONFIRMED`, `ASSIGNED`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED_BY_CUSTOMER`, `CANCELLED_BY_RETAILER`, `REJECTED`
- [ ] `UsageLevel` enum — add `VERY_HEAVY`
- [ ] `CustomerRetailerLink` — add `isPrimary` flag for multi-retailer support
- [ ] `Retailer` — add settings fields:
  - `preemptlyZoneDays` (1–10, default 5)
  - `discountsEnabled` (boolean)
  - `maxDiscountCapPesos` (nullable)
- [ ] `Tank` — ensure `VERY_HEAVY` usage profile is supported

### 2.3 Migration
- [ ] Create and run migration
- [ ] Update seed data with rider, pricing, and discount tiers

---

## Phase 3: Rider Role & API Endpoints

**Goal:** Make rider a first-class user in the system.

### 3.1 Rider Auth
- [ ] Rider OTP auth (same flow as consumer/retailer, role-based JWT)
- [ ] Rider registration by retailer (web app creates rider account)

### 3.2 Rider API Endpoints
- [ ] `GET /rider/deliveries` — today's assigned orders (status, address, LPG size)
- [ ] `GET /rider/prospects` — customers in preemptly zone, sorted by urgency
- [ ] `POST /rider/customers` — register new customer on first delivery
- [ ] `POST /rider/deliveries/:id/start` — mark OUT_FOR_DELIVERY
- [ ] `POST /rider/deliveries/:id/confirm` — confirm delivery (method: QR/code/manual)
- [ ] `GET /rider/history` — past deliveries

### 3.3 Order Assignment
- [ ] `PATCH /orders/:id/assign` — retailer assigns rider to order
- [ ] Push notification to rider on assignment

---

## Phase 4: Discount & Pricing System

**Goal:** Implement retailer-customizable discounts and pricing.

### 4.1 Retailer Settings API
- [ ] `GET /retailers/me/pricing` — get base prices per LPG size
- [ ] `PUT /retailers/me/pricing` — set/update base prices
- [ ] `GET /retailers/me/discounts` — get discount tier configuration
- [ ] `PUT /retailers/me/discounts` — set/update discount tiers + preemptly zone (1–10 days, default 5)
- [ ] `PATCH /retailers/me/discounts/toggle` — enable/disable discounts

### 4.2 Discount Calculation Service
- [ ] Calculate applicable discount at order creation based on:
  - Retailer's preemptly zone threshold
  - Retailer's discount tiers
  - Customer's estimated days remaining
- [ ] Lock discount at order creation time
- [ ] `PATCH /orders/:id/discount` — retailer override on individual order

### 4.3 Estimation Engine Update
- [ ] Add `VERY_HEAVY` usage profile (~20 days for 11kg)
- [ ] Make preemptly zone threshold retailer-configurable (not hardcoded)
- [ ] Update scheduler to use retailer-specific thresholds for notifications

---

## Phase 5: QR Code System

**Goal:** Implement hybrid QR for onboarding and delivery acknowledgement.

### 5.1 QR Generation
- [ ] Add `qr_flutter` package to Flutter
- [ ] Onboarding QR payload (hybrid): link ID, retailer ID, retailer name, store phone, LPG size
- [ ] Order QR payload: order ID + confirmation code
- [ ] QR generation API endpoint for web app (retailer store QR for invite)

### 5.2 QR Scanning
- [ ] Add `mobile_scanner` package to Flutter
- [ ] Customer: scan rider's onboarding QR → auto-link + pre-fill profile
- [ ] Rider: scan customer's order QR → confirm delivery

### 5.3 Confirmation Code (non-QR fallback)
- [ ] Generate 4-digit confirmation code per order
- [ ] Display code in customer app when order is OUT_FOR_DELIVERY
- [ ] Rider enters code to confirm delivery
- [ ] Rider-side "Mark Delivered" with optional photo (lowest trust fallback)

### 5.4 Rework Consumer Onboarding
- [ ] New path: scan rider QR → auto-setup (retailer linked, profile pre-filled)
- [ ] Setup-later path: manual link code (6 chars) or scan saved QR
- [ ] Keep existing manual setup as additional fallback

---

## Phase 6: Order Lifecycle Rework

**Goal:** Implement role-segregated order states and full lifecycle.

### 6.1 Internal Order States
- [ ] `PENDING` — customer placed order (online)
- [ ] `PENDING_SMS` — customer sent SMS order (offline)
- [ ] `CONFIRMED` — retailer accepted
- [ ] `ASSIGNED` — rider assigned
- [ ] `OUT_FOR_DELIVERY` — rider started delivery
- [ ] `DELIVERED` — delivery confirmed
- [ ] `CANCELLED_BY_CUSTOMER` — customer cancelled (before OUT_FOR_DELIVERY)
- [ ] `CANCELLED_BY_RETAILER` — retailer cancelled
- [ ] `REJECTED` — retailer rejected (with reason)

### 6.2 Role-Based Views
- [ ] Customer API responses map to: Placed, Confirmed, On the Way, Delivered, Cancelled, Declined
- [ ] Retailer API responses map to: New, Accepted, Assigned, In Transit, Delivered, Rejected, Cancelled
- [ ] Rider API responses map to: Assigned, In Transit, Delivered

### 6.3 Order Actions
- [ ] Customer: place order, cancel order (before OUT_FOR_DELIVERY)
- [ ] Retailer: confirm, reject (with reason), assign rider, adjust discount, cancel, enter manual/SMS order
- [ ] Rider: start delivery, confirm delivery (QR/code/manual)

### 6.4 Notifications per State Change
- [ ] CONFIRMED → push to customer
- [ ] ASSIGNED → push to rider
- [ ] OUT_FOR_DELIVERY → push to customer ("Rider is on the way")
- [ ] DELIVERED → push to customer + retailer
- [ ] REJECTED → push to customer (with reason)
- [ ] CANCELLED_BY_CUSTOMER → push to retailer + rider (if assigned)

### 6.5 Auto-actions on DELIVERED
- [ ] Reset customer's estimation (new full tank)
- [ ] Create refill log automatically
- [ ] Record payment (COD: base price - discount = final amount)

---

## Phase 7: SMS & Offline Order Flow

**Goal:** Enable offline ordering and SMS fallback.

### 7.1 SMS Composer (Flutter)
- [ ] Build formatted SMS template with order details
- [ ] Use `url_launcher` to open SMS composer (pre-filled, user taps send)
- [ ] Store SMS order locally with `PENDING_SMS` status

### 7.2 Offline Queue Wiring
- [ ] Connect `OfflineQueue` to `ApiClient` — auto-queue on network failure
- [ ] Integrate `connectivity_plus` for network state detection
- [ ] Replay queued orders when back online
- [ ] Deduplicate: if SMS was sent and API order created for same order ID, merge records

### 7.3 SMS Confirmation (Retailer → Customer)
- [ ] When retailer enters SMS order into web app, system sends confirmation SMS to customer via Semaphore
- [ ] SMS template: "Your PreEmptly order [ID] has been received by [store name]. Discount: [amount] pesos."

### 7.4 Manual Order Entry (Web App)
- [ ] "Enter Order" form on retailer dashboard for SMS/call/walk-in orders
- [ ] Fields: customer (search/select), LPG size, channel (SMS/call/walk-in), optional notes
- [ ] Creates standard order record, proceeds through normal lifecycle

---

## Phase 8: Rider Mobile App Screens

**Goal:** Build rider experience in the Flutter app.

### 8.1 Rider Navigation & Auth
- [ ] Role-based routing: rider login → rider dashboard (separate from consumer flow)
- [ ] Rider-specific bottom navigation

### 8.2 Screens
- [ ] **Today's Deliveries** — assigned orders list, status, address, LPG size, navigation link
- [ ] **Delivery Detail** — order info, "Start Delivery" / confirm actions, QR scanner, code entry
- [ ] **Upcoming Prospects** — preemptly zone customers sorted by urgency
- [ ] **New Customer Registration** — input form, QR generation for customer
- [ ] **Delivery History** — past deliveries with dates, amounts
- [ ] **Rider Settings** — profile, sync status

### 8.3 Offline Support
- [ ] Queue delivery confirmations and customer registrations when offline
- [ ] Sync when connection restored

---

## Phase 9: Web Dashboard Updates

**Goal:** Add rider management, discount settings, and manual order entry to retailer dashboard.

### 9.1 New Pages
- [ ] **Rider Management** — add/remove riders, view performance, assign to orders
- [ ] **Pricing & Discounts** — set base price per LPG size, configure discount tiers, set preemptly zone threshold (1–10 days, default 5), enable/disable, max cap
- [ ] **Manual Order Entry** — form for SMS/call/walk-in orders

### 9.2 Updated Pages
- [ ] **Orders** — add role-segregated status labels, assign rider action, reject with reason, adjust discount
- [ ] **Customers** — show preemptly zone status using retailer's configured threshold
- [ ] **Settings** — add preemptly zone config, pricing section

### 9.3 UI Improvements
- [ ] Set up shadcn/ui component library
- [ ] Extract reusable components (buttons, cards, badges, tables, status chips)
- [ ] Add loading skeletons and error states across all pages

---

## Phase 10: Multi-Retailer Support

**Goal:** Allow customers to link with multiple retailers.

- [ ] `isPrimary` flag on CustomerRetailerLink
- [ ] Customer app: link additional retailers (scan QR / enter code)
- [ ] Customer app: select retailer when placing order
- [ ] Customer app: manage linked retailers in settings (unlink, switch primary)
- [ ] Retailer web app: remove customer from list (preserves order history)
- [ ] API: enforce that orders go to the selected retailer's pricing/discount config

---

## Phase 11: Production Auth & Security

**Goal:** Replace dev stubs, harden for production.

- [ ] Build `SemaphoreOtpSender` — Philippine SMS gateway (`POST https://api.semaphore.co/api/v4/otp`)
- [ ] Add rate limiting on OTP endpoints (max 5 requests/phone/hour)
- [ ] Add Helmet middleware for HTTP security headers
- [ ] Harden CORS configuration
- [ ] Input sanitization across all endpoints
- [ ] Server-side auth for web dashboard (Next.js middleware / httpOnly cookies)

---

## Phase 12: Firebase & Push Notifications

**Goal:** Wire up real push notifications.

- [ ] Firebase project setup + FCM configuration
- [ ] Integrate Firebase Admin SDK in NestJS `NotificationsService`
- [ ] Initialize Firebase in Flutter (`main.dart`)
- [ ] Configure FCM in Flutter — receive and display notifications
- [ ] Notification triggers:
  - Customer enters preemptly zone → push to customer
  - New order → push to retailer
  - Order confirmed → push to customer
  - Rider assigned → push to rider
  - Rider on the way → push to customer
  - Delivered → push to customer + retailer
  - Rejected → push to customer (with reason)
  - Cancelled → push to affected parties
- [ ] Rider app: prospect list notifications from retailer

---

## Phase 13: Testing

**Goal:** Reasonable test coverage before launch.

### 13.1 API Tests
- [ ] Auth flow (consumer, retailer, rider)
- [ ] Order lifecycle (all state transitions, role-based actions)
- [ ] Discount calculation (tiers, edge cases, retailer overrides)
- [ ] Rider endpoints (prospects, deliveries, customer registration)
- [ ] Delivery acknowledgement (QR, code, manual)
- [ ] Multi-retailer linking/unlinking
- [ ] SMS order deduplication

### 13.2 Flutter Tests
- [ ] Consumer: dashboard, order flow, QR scan, offline SMS
- [ ] Rider: delivery flow, customer registration, QR generation
- [ ] Offline queue sync + dedup
- [ ] Confirmation code entry

### 13.3 E2E Tests
- [ ] **Consumer journey:** scan QR → track gas → enter preemptly zone → order (online + offline/SMS) → receive delivery → estimation resets
- [ ] **Rider journey:** receive assignment → start delivery → confirm (QR/code/manual) → record syncs
- [ ] **Retailer journey:** register → add riders → receive order → accept/reject → assign rider → manage discounts → enter SMS order manually

---

## Phase 14: DevOps & Deployment

**Goal:** CI/CD pipeline and production infrastructure.

- [ ] Dockerfile for NestJS API (multi-stage build)
- [ ] Neon DB production branch + connection pooling (`pgbouncer=true`)
- [ ] API deployment (Railway/Render/Fly.io)
- [ ] Web deployment (Vercel)
- [ ] Mobile builds (APK + IPA)
- [ ] GitHub Actions CI/CD pipeline
- [ ] Sentry error tracking (backend + mobile)
- [ ] Swagger API docs (`@nestjs/swagger` at `/api/docs`)

---

## Phase 15: Launch Prep

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
- Not worth doing now — existing NestJS API works, bottleneck is database I/O
- Revisit when: scaling beyond initial user base, or if a major API rewrite is needed
- Benefits: faster cold starts, lower latency, Eden treaty for end-to-end type safety
- Risks: younger ecosystem, Prisma/Bun edge cases, migration effort

### Digital Payments (Phase 2)
- GCash / Maya integration
- In-app payment before delivery
- Payment confirmation triggers delivery dispatch

### Viber/Messenger Bot
- Automated order channel via chat bot
- High penetration in PH market
- Could handle ordering, status checks, and notifications

### Missed Call Ordering
- Customer gives missed call to designated store number
- System logs as order intent
- Common pattern in PH/SEA markets

---

*This plan is a draft and will be updated based on further review.*
