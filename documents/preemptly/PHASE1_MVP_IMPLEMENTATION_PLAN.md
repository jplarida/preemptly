# LPG Usage Tracking & Reorder App — Phase 1 MVP Implementation Plan

## Context

Building the Phase 1 MVP of the LPG (cooking gas) usage tracking and reorder app as described in `LPG_App_Product_Strategy_Document.md`. The app helps Philippine households and businesses avoid running out of gas by estimating consumption, sending alerts, and enabling easy reordering — while giving retailers demand visibility.

**Tech stack chosen:**
- Mobile: **Flutter** (iOS + Android)
- Backend: **NestJS + TypeScript**
- Database: **PostgreSQL on Neon** (serverless)
- Retailer Dashboard: **Next.js** (React)
- ORM: **Prisma**
- Notifications: **Firebase Cloud Messaging**

**Scope:** Full Phase 1 MVP — consumer mobile app + retailer web dashboard + backend API.

---

## Project Structure

```
preemptly/
  apps/
    mobile/          # Flutter consumer app
    web/             # Next.js retailer dashboard
    api/             # NestJS backend
  packages/
    shared-types/    # TypeScript types shared between api and web
  prisma/            # Prisma schema and migrations
  documents/         # Existing strategy docs
  .gitignore
  package.json       # Root npm workspaces
```

No Turborepo/Nx — simple npm workspaces to keep overhead low for a 2-3 person team.

---

## Implementation Phases

### Phase 0: Project Scaffolding (Days 1-2)

1. **Initialize git repo**
2. **Create root `package.json`** with npm workspaces: `apps/api`, `apps/web`, `packages/shared-types`
3. **Scaffold NestJS**: `npx @nestjs/cli new apps/api`
4. **Scaffold Next.js**: `npx create-next-app@latest apps/web --typescript --tailwind --app --src-dir`
5. **Scaffold Flutter**: `flutter create --org com.preemptly --project-name preemptly_mobile apps/mobile`
6. **Create shared-types package**: `packages/shared-types/src/index.ts`
7. **Init Prisma**: Install in `apps/api`, move `prisma/` dir to project root
8. **Create `.env.example`** with: `DATABASE_URL`, `JWT_SECRET`, `OTP_SERVICE_API_KEY`, Firebase keys
9. **Create `.gitignore`** for node_modules, .env, build outputs, .dart_tool, etc.

**Verify:** NestJS boots on :3000, Next.js boots on :3001, Flutter runs on emulator.

---

### Phase 1: Database Schema (Days 2-4)

**File: `prisma/schema.prisma`**

Core models:
- **User** — id, name, phone (unique), region (default "PH")
- **Location** — id, userId, address, type (HOME/BUSINESS), timezone
- **Tank** — id, locationId, capacityKg, unit, model (EXCHANGE/REFILL), usageLevel (LIGHT/MODERATE/HEAVY), lastRefillDate, isActive
- **Estimation** — id, tankId (unique), timeBasedEstimate, correctionFactor, calibratedEstimate, confidence (LOW/MEDIUM/HIGH), currentAdjustment (COOKED_MORE/COOKED_LESS/NORMAL), adjustmentExpiresAt
- **RefillLog** — id, tankId, refillDate, actualCycleDays, isOutlier, confirmedByUser
- **Retailer** — id, businessName, ownerName, phone (unique), address, city, inviteCode (unique), inviteLink (unique), isActive
- **CustomerRetailerLink** — id, customerId, retailerId, linkedVia (INVITE_LINK/QR_CODE/MANUAL_CODE), status (ACTIVE/INACTIVE), unique on [customerId, retailerId]
- **Order** — id, tankId, customerId, retailerId, status (PENDING/CONFIRMED/COMPLETED/CANCELLED), note
- **AccuracyLog** — id, tankId, predictedDays, actualDays, errorDays, userFeedback
- **InviteStat** — id, retailerId, linkClicks, joins, date, unique on [retailerId, date]
- **OtpCode** — id, phone, code, expiresAt, verified
- **DeviceToken** — id, userId, token (unique), platform (ios/android/web)

All tables use snake_case with `@@map()`. Timestamps via `@default(now())` and `@updatedAt`.

**File: `packages/shared-types/src/index.ts`** — TypeScript enums and interfaces mirroring Prisma models + API DTOs (PredictionResponse, CreateOrderRequest, etc.)

**File: `prisma/seed.ts`** — Seed 1 test user, 1 location, 1 tank, 1 retailer, 1 link.

**Verify:** `npx prisma migrate dev` succeeds, `npx prisma studio` shows tables, seed runs.

---

### Phase 2: Backend API — NestJS (Days 4-14)

**Module structure under `apps/api/src/`:**

```
prisma/          → PrismaService (global module)
common/          → Guards, decorators, filters, interceptors, pipes
auth/            → OTP send/verify, JWT strategy, pluggable OtpSender interface
users/           → GET/PATCH /users/me
locations/       → CRUD /locations
tanks/           → CRUD /tanks, POST /tanks/:id/refill, GET /tanks/:id/prediction, POST /tanks/:id/adjust
estimation/      → EstimationEngine (core logic), EstimationService, scheduled alert checker
refills/         → Refill logging with outlier detection, accuracy logging
orders/          → CRUD /orders, PUT /orders/:id/status
retailers/       → Registration, dashboard stats, customer list, invite management
linking/         → Link/unlink customer↔retailer, resolve invite code, track clicks
notifications/   → Firebase Cloud Messaging wrapper
```

#### Key API Endpoints

**Auth:**
- `POST /auth/send-otp` → Generate 6-digit code, store with 5-min expiry, log to console (MVP) / send via Semaphore (prod)
- `POST /auth/verify-otp` → Verify code, create user if new, return JWT + `{ isNewUser }`

**Tanks:**
- `POST /tanks` → Create tank with initial time-based estimation
- `GET /tanks/:id/prediction` → Returns: daysElapsed, estimatedTotalDays, estimatedRemainingDays, displayRange {low, high}, confidence, refillCount
- `POST /tanks/:id/refill` → Log refill, detect outlier, recalculate estimation, log accuracy
- `POST /tanks/:id/adjust` → Set COOKED_MORE/COOKED_LESS/NORMAL, auto-expires after 7 days

**Orders:**
- `POST /orders` → Verify customer has active retailer link, create PENDING order, notify retailer
- `PUT /orders/:id/status` → Retailer updates status, notify customer

**Retailers:**
- `POST /retailers/register` → Separate registration with OTP
- `GET /retailers/me/customers` → List with prediction status (running_low / okay / new)
- `GET /retailers/me/dashboard` → Stats: customerCount, pendingOrders, runningLowCount
- `GET /retailers/me/orders` → Filtered order list

**Linking:**
- `GET /link/retailer/:code` → Resolve code to retailer preview
- `POST /link/retailer` → Link customer to retailer via code

#### Estimation Engine — Core Business Logic

**File: `apps/api/src/estimation/estimation.engine.ts`**

This is the most critical file. Implements the hybrid estimation system from the strategy doc:

1. **Time-based estimate (cold start):** Uses usage profiles — HOME/LIGHT: 0.20-0.25 kg/day, HOME/MODERATE: 0.25-0.35, HOME/HEAVY: 0.35-0.45, BUSINESS profiles 2-8 kg/day
2. **History-based calibration:** `correction_factor = avg(actual_cycles) / time_based_midpoint`. Valid logs weight 1.0, outliers weight 0.3.
3. **Confidence levels:** 0 refills = LOW (±30%), 1-2 refills = MEDIUM (±20%), 3+ refills = HIGH (±10%)
4. **Adjustments:** COOKED_MORE = ×0.85, COOKED_LESS = ×1.15
5. **Outlier detection:** Flag if new cycle < 50% of average
6. **Display range:** `estimatedDays × (1 ± confidenceMargin)`

#### Scheduled Job

**File: `apps/api/src/estimation/estimation.scheduler.ts`**

Daily cron (8:00 AM Manila): check all active tanks, send push notification if estimated remaining ≤ 5 days or ≤ 15% of cycle.

#### Unit Tests (Critical)

**File: `apps/api/src/estimation/estimation.engine.spec.ts`**

Test: cold start for all profiles, calibration with 1/2/3+ logs, outlier detection, adjustment application, display ranges, edge cases.

**Verify:** `npm test` passes, API boots, full auth→tank→refill→order flow works via curl.

---

### Phase 3: Consumer Mobile App — Flutter (Days 14-24)

**Architecture:** Feature-based with Riverpod (state management) + GoRouter (navigation) + Dio (HTTP) + sqflite (offline cache).

**Key dependencies:** `flutter_riverpod`, `go_router`, `dio`, `flutter_secure_storage`, `sqflite`, `firebase_messaging`, `connectivity_plus`, `pin_code_fields`, `qr_code_scanner`, `percent_indicator`

**Structure under `apps/mobile/lib/`:**

```
core/
  network/       → api_client.dart (Dio), offline_queue.dart
  storage/       → secure_storage.dart (JWT), local_database.dart (SQLite cache)
  services/      → notification_service.dart, connectivity_service.dart
  theme/         → app_theme.dart, app_colors.dart
features/
  auth/          → Phone input screen, OTP verification screen
  onboarding/    → Tank setup (size → usage type → intensity → optional retailer link)
  dashboard/     → Home screen (main), gas progress indicator, days remaining, adjustment prompt
  refill/        → 1-tap refill logging, refill history, outlier confirmation dialog
  orders/        → Order creation, order history, order detail
  retailer_link/ → Link via code entry, QR scan, deep link handling
  settings/      → Tank settings, notification preferences
router/          → app_router.dart (GoRouter config with auth guards)
```

#### Key Screens

**Dashboard (home_screen.dart)** — The primary screen:
- Circular progress indicator (days elapsed / estimated total)
- "~X-Y days remaining" range text (never false precision)
- Confidence badge ("Based on N refills" or "Getting to know your usage...")
- Adjustment prompt card (dismissible): "Cooked more / Cooked less / Normal"
- Refill prompt (near estimated date): "Did you get a new tank?"
- "Order Now" button (prominent)
- Pull-to-refresh, offline indicator when cached

**Tank Setup (onboarding)** — Under 2 minutes:
1. Tank size: visual selector (2.7kg, 11kg, 22kg, 50kg, Other)
2. Usage type: Home / Business cards
3. Cooking intensity: Light / Moderate / Heavy with plain language descriptions
4. Optional retailer link

**Refill Logging** — 1-tap flow:
- "Just now" = today's date, immediate log
- "A few days ago" = quick date picker
- Outlier confirmation dialog if unusual cycle length
- Dashboard updates with improved prediction

**Ordering** — Shows linked retailer info, optional note, confirm button, order tracking.

**Retailer Linking** — Three methods: deep link handling (`app.preemptly.com/join/{code}`), QR scanner, manual code entry.

#### Offline Support
- SQLite cache for tank data, predictions, order statuses
- Offline queue for mutations (refill logs, orders, adjustments)
- Auto-replay on reconnect
- "Offline" indicator on dashboard, shows cached data

#### Graceful Degradation (per strategy doc)
- Full engagement → tight ranges, all features
- Partial → wider ranges, mixed estimation
- Minimal → time-based only, very wide ranges
- Zero → simple "X days since setup" counter

**Verify:** Auth flow works, tank setup completes, dashboard shows prediction, refill logging improves prediction, ordering works, offline mode shows cached data, push notifications received.

---

### Phase 4: Retailer Web Dashboard — Next.js (Days 20-28)

**Runs in parallel with late Phase 3.** Uses shadcn/ui components + TanStack React Query.

**Structure under `apps/web/src/app/`:**

```
(auth)/
  login/page.tsx          → Phone + OTP login
  register/page.tsx       → Multi-step retailer registration
(dashboard)/
  layout.tsx              → Sidebar shell (nav: Dashboard, Customers, Orders, Invite, Settings)
  page.tsx                → Stats overview (customer count, pending orders, running low)
  customers/page.tsx      → Customer table with status badges (Running Low=red, Okay=green, New=blue)
  orders/page.tsx         → Order table with actions (Confirm, Complete, Cancel)
  invite/page.tsx         → Invite link, QR code (qrcode.react), manual code, invite stats
  settings/page.tsx       → Business profile, notification preferences
```

#### Key Pages

**Dashboard** — Stat cards: Total Customers, Pending Orders, Running Low, New This Month. Quick list of low-gas customers.

**Customer List** — Table: name, tank size, status badge, days remaining (range), last refill, linked date. Filters by status, search by name/phone.

**Order Management** — Table: order ID, customer, tank size, status badge, date, actions. PENDING → Confirm/Cancel, CONFIRMED → Mark Completed. Status updates trigger push to customer.

**Invite System** — Copy-able invite link, QR code (render + download/print), manual code display, invite stats (clicks, joins, conversion).

**Real-time:** Polling via React Query `refetchInterval: 30000` on orders page. Browser Notification API for new orders.

**Verify:** Retailer registration works, dashboard stats correct, customer statuses accurate, order actions work, QR code scannable.

---

### Phase 5: Integration & Deployment (Days 25-30)

1. **Firebase setup** — Create project, enable FCM, add `google-services.json` + `GoogleService-Info.plist` to Flutter, Firebase Admin SDK key to backend
2. **Deep linking** — Android intent filters + iOS associated domains for `app.preemptly.com/join/{code}`
3. **OTP SMS** — Integrate Semaphore (Philippine SMS gateway, ~PHP 0.50/SMS) via pluggable `OtpSender` interface. Console sender for dev.
4. **Neon DB config** — Production branch, dev branch, connection pooling, `sslmode=require`
5. **Deploy backend** — Railway/Render/Fly.io (~$7-15/month), Dockerfile with multi-stage build
6. **Deploy web** — Vercel (free tier, native Next.js)
7. **Build mobile** — `flutter build apk --release` + `flutter build ipa --release`, publish to Play Store / TestFlight
8. **End-to-end testing** — Full consumer journey (setup → track → refill → order), retailer journey (register → invite → manage orders), offline resilience

---

### Phase 6: Polish & Launch Prep (Days 28-35)

- Loading states (shimmer), error states with retry, empty states
- Rate limiting on auth (5 OTP/phone/hour)
- CORS, Helmet, input sanitization
- Sentry error tracking (backend + mobile)
- Health check endpoint: `GET /health`
- Swagger docs at `/api/docs`

---

## Timeline Summary

| Phase | Days | Can Parallelize |
|-------|------|-----------------|
| Phase 0: Scaffolding | 2 | — |
| Phase 1: Database | 2 | — |
| Phase 2: Backend API | 10 | — |
| Phase 3: Mobile App | 10 | Yes, with Phase 4 |
| Phase 4: Web Dashboard | 8 | Yes, with Phase 3 |
| Phase 5: Integration | 5 | — |
| Phase 6: Polish | 5 | — |

**Total: ~5-6 weeks with 2 developers** (Phases 3+4 overlap)

---

## Monthly Infrastructure Costs

| Service | Cost |
|---------|------|
| Neon PostgreSQL | Free–$19/mo |
| Backend hosting | ~$7-15/mo |
| Vercel (Next.js) | Free |
| Firebase (FCM) | Free (up to 10K notifs/mo) |
| Semaphore SMS | ~$10-50/mo |
| **Total** | **~$35-85/mo** |

---

## Critical Files

1. `prisma/schema.prisma` — Foundation of the entire data model
2. `apps/api/src/estimation/estimation.engine.ts` — Core business logic (hybrid estimation)
3. `apps/api/src/estimation/estimation.engine.spec.ts` — Tests for the estimation engine
4. `apps/mobile/lib/features/dashboard/presentation/screens/home_screen.dart` — Consumer's primary screen
5. `apps/api/src/auth/auth.service.ts` — OTP + JWT authentication
6. `apps/web/src/app/(dashboard)/orders/page.tsx` — Retailer order management

---

## Key Technical Decisions

1. **No Turborepo/Nx** — Simple npm workspaces for a small team. Overhead not justified.
2. **Prisma at root level** — Schema shared as reference. Web dashboard talks to API, not DB directly.
3. **Polling (not WebSockets) for retailer dashboard** — 30-second intervals via React Query. At MVP scale, polling is fine.
4. **SQLite for mobile offline** — Handles structured data and offline queue pattern better than key-value stores.
5. **Riverpod over BLoC** — Simpler, less boilerplate, good enough for MVP complexity.
6. **JWT-only auth (no refresh tokens)** — 7-day expiry for consumers. Add refresh tokens in Phase 2 if needed.
7. **Single retailer per consumer (Phase 1)** — As per strategy doc. Schema supports multi-retailer for future.
8. **Console OTP for dev, Semaphore for prod** — Pluggable OtpSender interface for easy swap.

---

*Document created: 2026-02-16*
*Based on: LPG_App_Product_Strategy_Document.md, LPG_App_Strategy_and_Roadmap.pdf*
*Status: Approved for implementation*
