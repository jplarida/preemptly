# LPG Usage Tracking & Reorder App — Phase 1 MVP Implementation Plan (v2)

> Updated: 2026-03-23
> Changes from v1: Backend migrated from NestJS → Elysia/Bun. Web framework TBD (Next.js → possibly SvelteKit).

## Context

Building the Phase 1 MVP of the LPG (cooking gas) usage tracking and reorder app as described in `LPG_App_Product_Strategy_Document.md`. The app helps Philippine households and businesses avoid running out of gas by estimating consumption, sending alerts, and enabling easy reordering — while giving retailers demand visibility.

**Tech stack:**
- Mobile: **Flutter** (iOS + Android)
- Backend: **Elysia + Bun** (migrated from NestJS)
- Database: **PostgreSQL on Neon** (serverless)
- Retailer Dashboard: **TBD** (currently Next.js, considering SvelteKit)
- ORM: **Prisma**
- Notifications: **Firebase Cloud Messaging**

**Scope:** Full Phase 1 MVP — consumer mobile app + retailer web dashboard + backend API.

---

## Project Structure

```
preemptly/
  apps/
    mobile/          # Flutter consumer app
    web/             # Retailer dashboard (currently Next.js, may migrate to SvelteKit)
    api/             # NestJS backend (legacy, maintained)
    api-elysia/      # Elysia/Bun backend (active, primary)
  packages/
    shared-types/    # TypeScript types shared between api and web
  prisma/            # Prisma schema and migrations
  documents/         # Strategy & planning docs
  .gitignore
  package.json       # Root npm workspaces
```

No Turborepo/Nx — simple npm workspaces to keep overhead low for a 2-3 person team.

---

## Implementation Phases

### Phase 0: Project Scaffolding (Days 1-2) ✅ DONE

1. **Initialize git repo**
2. **Create root `package.json`** with npm workspaces: `apps/api`, `apps/web`, `packages/shared-types`
3. **Scaffold NestJS**: `npx @nestjs/cli new apps/api`
4. **Scaffold Next.js**: `npx create-next-app@latest apps/web --typescript --tailwind --app --src-dir`
5. **Scaffold Flutter**: `flutter create --org com.preemptly --project-name preemptly_mobile apps/mobile`
6. **Create shared-types package**: `packages/shared-types/src/index.ts`
7. **Init Prisma**: Install in `apps/api`, move `prisma/` dir to project root
8. **Create `.env.example`** with: `DATABASE_URL`, `JWT_SECRET`, `OTP_SERVICE_API_KEY`, Firebase keys
9. **Create `.gitignore`** for node_modules, .env, build outputs, .dart_tool, etc.

**Verify:** API boots on :3000, Next.js boots on :3001, Flutter runs on emulator.

---

### Phase 1: Database Schema (Days 2-4) ✅ DONE

**File: `prisma/schema.prisma`**

Core models:
- **User** — id, name, phone (unique), region (default "PH")
- **Location** — id, userId, address, type (HOME/BUSINESS), timezone
- **Tank** — id, locationId, capacityKg, unit, model (EXCHANGE/REFILL), usageLevel (LIGHT/MODERATE/HEAVY/VERY_HEAVY), lastRefillDate, isActive
- **Estimation** — id, tankId (unique), timeBasedEstimate, correctionFactor, calibratedEstimate, confidence (LOW/MEDIUM/HIGH), currentAdjustment (COOKED_MORE/COOKED_LESS/NORMAL), adjustmentExpiresAt
- **RefillLog** — id, tankId, refillDate, actualCycleDays, isOutlier, confirmedByUser
- **Retailer** — id, businessName, ownerName, phone (unique), address, city, inviteCode (unique), inviteLink (unique), isActive
- **RetailerSettings** — id, retailerId, pricing (JSON), discountTiers (JSON), preemptlyZoneDays, discountsEnabled
- **Rider** — id, retailerId, name, phone, isActive
- **CustomerRetailerLink** — id, customerId, retailerId, linkedVia (INVITE_LINK/QR_CODE/MANUAL_CODE), status (ACTIVE/INACTIVE), isPrimary, unique on [customerId, retailerId]
- **Order** — id, tankId, customerId, retailerId, riderId, status (PENDING/PENDING_SMS/CONFIRMED/ASSIGNED/OUT_FOR_DELIVERY/DELIVERED/CANCELLED_BY_CUSTOMER/CANCELLED_BY_RETAILER/REJECTED), basePrice, discountAmount, finalAmount, deliveryAddress, confirmationMethod, confirmationCode, paymentStatus, paymentMethod, note, needsReview
- **AccuracyLog** — id, tankId, predictedDays, actualDays, errorDays, userFeedback
- **InviteStat** — id, retailerId, linkClicks, joins, date, unique on [retailerId, date]
- **OtpCode** — id, phone, code, expiresAt, verified
- **DeviceToken** — id, userId, token (unique), platform (ios/android/web)

**File: `packages/shared-types/src/index.ts`** — TypeScript enums and interfaces mirroring Prisma models + API DTOs

**File: `prisma/seed.ts`** — Seed test data (consumer: +639170000001, retailer: +639170000002)

**Verify:** `npx prisma migrate dev` succeeds, `npx prisma studio` shows tables, seed runs.

---

### Phase 2: Backend API — Elysia/Bun (Days 4-14) ✅ DONE

> Migrated from NestJS to Elysia/Bun for better performance and lighter footprint. NestJS implementation maintained as legacy.

**Module structure under `apps/api-elysia/src/`:**

```
modules/
  auth/            → OTP send/verify, JWT (consumer + retailer + rider)
  users/           → GET/PATCH /users/me
  locations/       → CRUD /locations
  tanks/           → CRUD /tanks, GET /tanks/:id/prediction, POST /tanks/:id/adjust
  estimation/      → EstimationEngine (core logic)
  refills/         → Refill logging with outlier detection
  orders/          → Full order lifecycle (create, confirm, reject, assign, discount override, manual)
  retailers/       → Registration, dashboard stats, customer list, riders, pricing, preemptly zone
  riders/          → Rider management
  linking/         → Link/unlink customer↔retailer, resolve invite code, manage primary
  discounts/       → Discount calculation and tier management
  notifications/   → Firebase Cloud Messaging wrapper
  health/          → Health check endpoint
lib/
  auth-middleware.ts → JWT verification middleware
  errors.ts         → Custom error classes
  otp-sender.ts     → Pluggable OTP sender (console/Semaphore)
  prisma.ts         → Prisma client instance
```

#### Key API Endpoints

**Auth:**
- `POST /auth/send-otp` → Generate 6-digit code, store with 5-min expiry, log to console (dev) / send via Semaphore (prod)
- `POST /auth/verify-otp` → Verify code, create user if new, return JWT + `{ isNewUser, user }`
- `POST /auth/retailer/verify-otp` → Retailer OTP verification
- `POST /auth/rider/verify-otp` → Rider OTP verification

**Tanks:**
- `POST /tanks` → Create tank with initial time-based estimation
- `GET /tanks` → List all tanks with location + estimation
- `GET /tanks/:id` → Tank detail with location + estimation + last 10 refills
- `PATCH /tanks/:id` → Update tank
- `DELETE /tanks/:id` → Delete tank
- `GET /tanks/:id/prediction` → Returns: daysElapsed, estimatedTotalDays, estimatedRemainingDays, displayRange {low, high}, confidence, refillCount, currentAdjustment
- `POST /tanks/:id/adjust` → Set COOKED_MORE/COOKED_LESS/NORMAL, auto-expires after 7 days

**Refills:**
- `POST /refills` → Log refill, detect outlier, recalculate estimation
- `GET /refills/tank/:tankId` → Refill history
- `PATCH /refills/:id/confirm` → Confirm outlier refill

**Orders:**
- `POST /orders` → Create order, notify retailer
- `GET /orders` → List orders (role-aware: customer vs retailer)
- `GET /orders/:id` → Order detail
- `PATCH /orders/:id/cancel` → Cancel order (customer)
- `PATCH /orders/:id/confirm` → Confirm order (retailer)
- `PATCH /orders/:id/reject` → Reject with reason (retailer)
- `PATCH /orders/:id/assign` → Assign rider (retailer)
- `PATCH /orders/:id/discount` → Override discount (retailer)
- `POST /orders/manual` → Manual order for offline purchases (retailer)

**Retailers:**
- `POST /retailers/register` → Register new retailer (no auth)
- `GET /retailers/me` → Retailer profile
- `PATCH /retailers/me` → Update profile
- `GET /retailers/me/dashboard` → Stats: customerCount, pendingOrders, runningLowCount, newThisMonth
- `GET /retailers/me/customers` → List with status (running_low/okay/new)
- `GET /retailers/me/orders` → Filtered order list
- `GET /retailers/me/invite-stats` → Invite link analytics
- `PUT /retailers/me/pricing` → Set pricing per capacity
- `PUT /retailers/me/preemptly-zone` → Set alert days
- `GET /retailers/me/riders` → List riders
- `POST /retailers/me/riders` → Add rider
- `DELETE /retailers/me/riders/:id` → Remove rider

**Linking:**
- `GET /link/retailer/:code` → Resolve code to retailer preview
- `POST /link/retailer` → Link customer to retailer
- `GET /link/retailers` → List linked retailers
- `DELETE /link/retailer/:retailerId` → Unlink
- `PATCH /link/retailer/:retailerId/primary` → Set primary retailer

**Discounts:**
- `GET /discounts/tiers` → Get discount tiers and settings
- `PUT /discounts/tiers` → Update tiers
- `PATCH /discounts/toggle` → Enable/disable discounts

**Notifications:**
- `POST /notifications/device-token` → Register device token
- `DELETE /notifications/device-token/:token` → Remove token

#### Estimation Engine — Core Business Logic

**File: `apps/api-elysia/src/modules/estimation/engine.ts`**

Implements the hybrid estimation system:

1. **Time-based estimate (cold start):** Uses usage profiles — HOME/LIGHT: 0.20-0.25 kg/day, HOME/MODERATE: 0.25-0.35, HOME/HEAVY: 0.35-0.45, BUSINESS profiles 2-8 kg/day
2. **History-based calibration:** `correction_factor = avg(actual_cycles) / time_based_midpoint`. Valid logs weight 1.0, outliers weight 0.3.
3. **Confidence levels:** 0 refills = LOW (±30%), 1-2 refills = MEDIUM (±20%), 3+ refills = HIGH (±10%)
4. **Adjustments:** COOKED_MORE = ×0.85, COOKED_LESS = ×1.15
5. **Outlier detection:** Flag if new cycle < 50% of average
6. **Display range:** `estimatedDays × (1 ± confidenceMargin)`

#### Scheduled Job

Daily cron (8:00 AM Manila): check all active tanks, send push notification if estimated remaining ≤ 5 days or ≤ 15% of cycle.

**Verify:** API boots on :3000, full auth→tank→refill→order flow works, estimation engine produces correct predictions.

---

### Phase 3: Consumer Mobile App — Flutter (Days 14-24) 🔧 IN PROGRESS

**Architecture:** Feature-based with Riverpod (state management) + GoRouter (navigation) + Dio (HTTP) + sqflite (offline cache).

**Key dependencies:** `flutter_riverpod`, `go_router`, `dio`, `flutter_secure_storage`, `sqflite`, `firebase_messaging`, `connectivity_plus`, `pin_code_fields`, `mobile_scanner`, `percent_indicator`, `freezed`, `json_serializable`

**Current state:** Core scaffolding complete (24 Dart files). Auth, dashboard, onboarding, orders, linking, settings screens exist.

**Structure under `apps/mobile/lib/`:**

```
core/
  constants/     → api_constants.dart (Base URL config)
  network/       → api_client.dart (Dio + JWT), offline_queue.dart (SQLite queue)
  storage/       → secure_storage.dart (token storage)
  providers/     → core_providers.dart (Riverpod providers)
  theme/         → app_theme.dart (Material3), app_colors.dart
  router/        → app_router.dart (GoRouter with auth guards)
  models/        → Freezed Dart models (TO DO)
  services/      → notification_service.dart, connectivity_service.dart (TO DO)
features/
  auth/          → Phone input screen, OTP verification screen ✅
  onboarding/    → Tank setup 3-step wizard ✅
  dashboard/     → Home screen with circular indicator ✅
  refill/        → Refill logging, outlier confirmation (TO DO)
  orders/        → Order creation ✅, order history ✅, order detail (TO DO)
  retailer_link/ → Code entry ✅, QR scanner (TO DO)
  settings/      → Basic settings ✅, full profile (TO DO)
shared/
  widgets/       → Reusable widgets (TO DO)
```

**Remaining work:**
- [ ] Define freezed Dart models matching API response shapes
- [ ] Refill feature (dedicated screen + outlier confirmation)
- [ ] Order detail screen with timeline view
- [ ] QR scanner for retailer linking
- [ ] Connectivity service + offline banner
- [ ] Shared widgets (loading overlay, error states, empty states)
- [ ] Bottom navigation shell (Home | Orders | Profile)
- [ ] Deep link handling for invite URLs
- [ ] FCM notification setup + handling
- [ ] Cache-then-network strategy implementation
- [ ] Polish: pull-to-refresh, loading states, error handling

**See also:** `MOBILE_APP_DEEP_DIVE.md` for detailed wireframes, models, and offline strategy.

**Verify:** Auth flow works, tank setup completes, dashboard shows prediction, refill logging improves prediction, ordering works, offline mode shows cached data, push notifications received.

---

### Phase 4: Retailer Web Dashboard (Days 20-28) 🔧 NEEDS REVIEW

> Currently built with Next.js 16 + React 19 + Tailwind CSS v4. Considering migration to SvelteKit — decision pending.

**Current implementation (Next.js) under `apps/web/src/app/`:**

```
login/page.tsx              → Phone + OTP login ✅
register/page.tsx           → Multi-step retailer registration ✅
dashboard/
  page.tsx                  → Stats overview ✅
  customers/page.tsx        → Customer table with status badges ✅
  orders/page.tsx           → Order management with actions ✅
  invite/page.tsx           → Invite link, QR code, stats ✅
  settings/page.tsx         → Pricing, discounts, preemptly zone ✅
lib/
  api.ts                    → HTTP client ✅
  hooks/use-auth.ts         → Auth hook ✅
```

**If migrating to SvelteKit, considerations:**
- Rewrite pages from React → Svelte components
- Replace React Query polling with SvelteKit load functions or stores
- Replace shadcn/ui (React) with Skeleton UI or Melt UI (Svelte)
- JWT auth pattern remains the same
- API contracts unchanged

**Key pages (framework-agnostic):**

**Dashboard** — Stat cards: Total Customers, Pending Orders, Running Low, New This Month.

**Customer List** — Table: name, tank size, status badge, days remaining (range), last refill, linked date. Filters by status, search by name/phone.

**Order Management** — Table: order ID, customer, tank size, status badge, date, actions. Full lifecycle: Confirm, Reject (with reason), Assign Rider, Override Discount.

**Invite System** — Copy-able invite link, QR code (render + download/print), manual code display, invite stats (clicks, joins, conversion).

**Settings** — Business profile, pricing tiers per tank size, discount tiers (days before empty → discount amount), preemptly zone days, discount toggle.

**Real-time:** Polling at 30-second intervals on orders page. Browser Notification API for new orders.

**Verify:** Retailer registration works, dashboard stats correct, customer statuses accurate, order actions work, QR code scannable.

---

### Phase 5: Integration & Deployment (Days 25-30) ⏳ NOT STARTED

1. **Firebase setup** — Create project, enable FCM, add `google-services.json` + `GoogleService-Info.plist` to Flutter, Firebase Admin SDK key to backend
2. **Deep linking** — Android intent filters + iOS associated domains for `app.preemptly.com/join/{code}`
3. **OTP SMS** — Integrate Semaphore (Philippine SMS gateway, ~PHP 0.50/SMS) via pluggable `OtpSender` interface. Console sender for dev.
4. **Neon DB config** — Production branch, dev branch, connection pooling, `sslmode=require`
5. **Deploy backend** — Railway/Render/Fly.io (~$7-15/month), Dockerfile with multi-stage build
6. **Deploy web** — Vercel (if Next.js) or Cloudflare Pages / Vercel (if SvelteKit)
7. **Build mobile** — `flutter build apk --release` + `flutter build ipa --release`, publish to Play Store / TestFlight
8. **End-to-end testing** — Full consumer journey (setup → track → refill → order), retailer journey (register → invite → manage orders), offline resilience

---

### Phase 6: Polish & Launch Prep (Days 28-35) ⏳ NOT STARTED

- Loading states (shimmer), error states with retry, empty states
- Rate limiting on auth (5 OTP/phone/hour)
- CORS, Helmet, input sanitization
- Sentry error tracking (backend + mobile)
- Health check endpoint: `GET /health` ✅ (already implemented)
- API documentation (Swagger/scalar)

---

## Timeline Summary

| Phase | Days | Status |
|-------|------|--------|
| Phase 0: Scaffolding | 2 | ✅ Done |
| Phase 1: Database | 2 | ✅ Done |
| Phase 2: Backend API (Elysia) | 10 | ✅ Done |
| Phase 3: Mobile App (Flutter) | 10 | 🔧 In progress |
| Phase 4: Web Dashboard (TBD framework) | 8 | 🔧 Functional, framework under review |
| Phase 5: Integration & Deployment | 5 | ⏳ Not started |
| Phase 6: Polish & Launch Prep | 5 | ⏳ Not started |

**Total: ~5-6 weeks with 2 developers** (Phases 3+4 overlap)

---

## Monthly Infrastructure Costs

| Service | Cost |
|---------|------|
| Neon PostgreSQL | Free–$19/mo |
| Backend hosting (Elysia/Bun) | ~$7-15/mo |
| Web hosting (Vercel/Cloudflare) | Free |
| Firebase (FCM) | Free (up to 10K notifs/mo) |
| Semaphore SMS | ~$10-50/mo |
| **Total** | **~$35-85/mo** |

---

## Critical Files

1. `prisma/schema.prisma` — Foundation of the entire data model
2. `apps/api-elysia/src/modules/estimation/engine.ts` — Core business logic (hybrid estimation)
3. `apps/mobile/lib/features/dashboard/presentation/screens/home_screen.dart` — Consumer's primary screen
4. `apps/api-elysia/src/modules/auth/index.ts` — OTP + JWT authentication
5. `apps/web/src/app/dashboard/orders/page.tsx` — Retailer order management

---

## Key Technical Decisions

1. **Elysia/Bun over NestJS** — Faster, lighter, simpler. NestJS maintained as legacy.
2. **No Turborepo/Nx** — Simple npm workspaces for a small team. Overhead not justified.
3. **Prisma at root level** — Schema shared as reference. Web dashboard talks to API, not DB directly.
4. **Polling (not WebSockets) for retailer dashboard** — 30-second intervals. At MVP scale, polling is fine.
5. **SQLite for mobile offline** — Handles structured data and offline queue pattern better than key-value stores.
6. **Riverpod over BLoC** — Simpler, less boilerplate, good enough for MVP complexity.
7. **JWT-only auth (no refresh tokens)** — 30-day expiry. Add refresh tokens in Phase 2 if needed.
8. **Single retailer per consumer (Phase 1)** — Schema supports multi-retailer for future.
9. **Console OTP for dev, Semaphore for prod** — Pluggable OtpSender interface for easy swap.
10. **Web framework TBD** — Next.js functional, SvelteKit under consideration. Decision pending.

---

## Related Documents

- `MOBILE_APP_PLAN.md` — High-level mobile app plan
- `MOBILE_APP_DEEP_DIVE.md` — Detailed wireframes, models, navigation, offline strategy
- `LPG_App_Product_Strategy_Document.md` — Product strategy and roadmap
- `ARCHITECTURE_DECISION_ANALYSIS.md` — Architecture analysis

---

*Document created: 2026-02-16 (v1)*
*Updated: 2026-03-23 (v2 — Elysia migration, status updates, web framework TBD)*
*Based on: LPG_App_Product_Strategy_Document.md, LPG_App_Strategy_and_Roadmap.pdf*
