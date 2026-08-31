# Phase 1 MVP Build Summary

**Date:** February 16, 2026
**Status:** Implementation Complete

---

## Overview

Full Phase 1 MVP of the LPG Usage Tracking & Reorder App (PreEmptly) has been implemented. The app helps Philippine households and businesses avoid running out of cooking gas by estimating consumption, sending alerts, and enabling easy reordering — while giving retailers demand visibility.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Flutter (iOS + Android) |
| Backend | NestJS + TypeScript |
| Database | PostgreSQL (Prisma ORM) |
| Retailer Dashboard | Next.js (React) |
| ORM | Prisma v7 |
| Notifications | Firebase Cloud Messaging (stubbed for dev) |
| State Management (Mobile) | Riverpod |
| Navigation (Mobile) | GoRouter |
| HTTP Client (Mobile) | Dio |

---

## Project Structure

```
C:\Personal\Projects\preemptly\
├── apps/
│   ├── api/              # NestJS backend (10 modules)
│   ├── mobile/           # Flutter consumer app
│   └── web/              # Next.js retailer dashboard
├── packages/
│   └── shared-types/     # TypeScript types shared between api and web
├── prisma/
│   ├── schema.prisma     # Database schema (13 models, 8 enums)
│   ├── prisma.config.ts  # Prisma v7 config
│   └── seed.ts           # Test data seeder
├── documents/            # Strategy docs and this summary
├── .env                  # Local dev environment variables
├── .env.example          # Template for environment variables
├── .gitignore
└── package.json          # Root npm workspaces
```

---

## What Was Built

### Phase 0: Project Scaffolding
- Git repo initialized
- Root `package.json` with npm workspaces (`apps/api`, `apps/web`, `packages/shared-types`)
- NestJS API scaffolded via `@nestjs/cli`
- Next.js web dashboard scaffolded via `create-next-app` (TypeScript + Tailwind + App Router)
- Flutter mobile app scaffolded via `flutter create`
- Shared TypeScript types package
- `.gitignore`, `.env.example`, `.env` for local dev

### Phase 1: Database Schema
- **`prisma/schema.prisma`** — 13 models + 8 enums:
  - User, Location, Tank, Estimation, RefillLog
  - Retailer, CustomerRetailerLink, Order
  - AccuracyLog, InviteStat, OtpCode, DeviceToken
  - Enums: LocationType, TankModel, UsageLevel, Confidence, AdjustmentType, LinkMethod, LinkStatus, OrderStatus
- **`prisma/seed.ts`** — Seeds 1 test user, 1 location, 1 tank, 1 retailer, 1 customer-retailer link
- **`packages/shared-types/src/index.ts`** — All TypeScript enums + API request/response interfaces

### Phase 2: NestJS Backend API (10 modules, ~60 files)

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **Auth** | `POST /auth/send-otp`, `POST /auth/verify-otp`, `POST /auth/retailer/verify-otp` | OTP-based auth with JWT, pluggable OtpSender interface |
| **Users** | `GET /users/me`, `PATCH /users/me` | User profile management |
| **Locations** | Full CRUD on `/locations` | Location management with ownership checks |
| **Tanks** | CRUD + `GET /tanks/:id/prediction` + `POST /tanks/:id/adjust` | Tank management with estimation integration |
| **Estimation** | Internal service (no direct endpoints) | Core hybrid estimation engine (see below) |
| **Refills** | `POST /refills`, `GET /refills/tank/:tankId`, `PATCH /refills/:id/confirm` | Refill logging with outlier detection |
| **Orders** | `POST /orders`, `GET /orders`, `PUT /orders/:id/status` | Order creation with retailer link verification |
| **Retailers** | `POST /retailers/register`, `GET /retailers/me/*` | Registration, dashboard stats, customer list |
| **Linking** | `GET /link/retailer/:code`, `POST /link/retailer` | Customer-retailer linking with invite tracking |
| **Notifications** | `POST /notifications/device-token` | FCM wrapper (console logging for dev) |
| **Health** | `GET /health` | Database health check |

#### Estimation Engine (Core Business Logic)
File: `apps/api/src/estimation/estimation.engine.ts`

1. **Time-based estimate (cold start):** Uses usage profiles — HOME/LIGHT: 0.225 kg/day, HOME/MODERATE: 0.30, HOME/HEAVY: 0.40, BUSINESS profiles 3-7 kg/day
2. **History-based calibration:** `correction_factor = weighted_avg(actual_cycles) / time_based_estimate`. Valid logs weight 1.0, outliers weight 0.3
3. **Confidence levels:** 0 refills = LOW (±30%), 1-2 refills = MEDIUM (±20%), 3+ refills = HIGH (±10%)
4. **Adjustments:** COOKED_MORE = ×0.85, COOKED_LESS = ×1.15 (auto-expires after 7 days)
5. **Outlier detection:** Flags cycles < 50% of historical average
6. **Display range:** `estimatedDays × (1 ± confidenceMargin)`

**25 unit tests — all passing** (`apps/api/src/estimation/estimation.engine.spec.ts`)

#### Daily Scheduled Job
File: `apps/api/src/estimation/estimation.scheduler.ts`
- Runs daily at midnight UTC
- Checks all active tanks
- Sends push notification if estimated remaining <= 5 days or <= 15% of cycle

### Phase 3: Flutter Consumer Mobile App (~20 files)

| Feature | Screens | Description |
|---------|---------|-------------|
| **Core** | — | Dio API client with JWT interceptor, offline SQLite queue, secure storage, Material 3 theme |
| **Auth** | Phone Input, OTP Verification | PH phone number validation, 6-digit PIN entry |
| **Onboarding** | Tank Setup (3 steps) | Size → Type → Intensity selection, under 2 minutes |
| **Dashboard** | Home Screen | Circular gas progress indicator, days remaining range, adjustment prompts, refill logging, order button |
| **Orders** | Create Order, Order History | Retailer selection, optional note, status-coded history |
| **Retailer Link** | Link Retailer | Manual code entry with retailer preview |
| **Settings** | Settings | Tank settings, notifications, linked retailers, logout |

Architecture: Feature-based with Riverpod (state management) + GoRouter (navigation) + Dio (HTTP) + sqflite (offline cache)

### Phase 4: Next.js Retailer Web Dashboard (~12 files)

| Page | Route | Description |
|------|-------|-------------|
| **Login** | `/login` | Two-step OTP authentication |
| **Register** | `/register` | Multi-field retailer registration |
| **Dashboard** | `/dashboard` | Stat cards: customers, pending orders, running low, new this month |
| **Customers** | `/dashboard/customers` | Filterable table with status badges (Running Low/Okay/New) |
| **Orders** | `/dashboard/orders` | Order table with Confirm/Cancel/Complete actions, 30s auto-polling |
| **Invite** | `/dashboard/invite` | Copyable invite link, invite code, conversion stats |
| **Settings** | `/dashboard/settings` | Business profile edit form |

Architecture: App Router, Tailwind CSS, sidebar layout with auth guard

---

## Build Verification

| Check | Result |
|-------|--------|
| Prisma schema validation | Passed (client generated) |
| NestJS compilation (`nest build`) | 0 errors |
| Estimation engine tests (`jest`) | 25/25 passing |
| npm workspaces install | Successful |

---

## File Count

- **155 total source files** (`.ts`, `.tsx`, `.dart`, `.prisma`)
- 60+ NestJS backend files across 10 modules
- 20+ Flutter mobile app files
- 12 Next.js web dashboard files
- Shared types package

---

## How to Run

### Prerequisites
- Node.js >= 18
- Flutter SDK >= 3.7
- PostgreSQL database (or Neon serverless)

### Setup

```bash
# 1. Install dependencies
cd C:\Personal\Projects\preemptly
npm install

# 2. Configure environment
# Edit .env with your DATABASE_URL (PostgreSQL connection string)

# 3. Run database migration
npx prisma migrate dev --schema=prisma/schema.prisma

# 4. Seed test data
npx prisma db seed

# 5. Start API (port 3000)
npm run api:dev

# 6. Start web dashboard (port 3001)
npm run web:dev

# 7. Start mobile app
cd apps/mobile
flutter pub get
flutter run
```

### Test Users (after seeding)
- **Consumer:** +639170000001
- **Retailer:** +639170000002
- OTP codes are logged to console in dev mode

---

## Remaining Work (Phase 5-6 from plan)

### Phase 5: Integration & Deployment
- [ ] Firebase project setup + FCM configuration
- [ ] Deep linking (Android intent filters + iOS associated domains)
- [ ] Semaphore SMS integration (Philippine SMS gateway)
- [ ] Neon DB production branch + connection pooling
- [ ] Backend deployment (Railway/Render/Fly.io)
- [ ] Web deployment (Vercel)
- [ ] Mobile builds (APK + IPA)
- [ ] End-to-end testing

### Phase 6: Polish & Launch Prep
- [ ] Loading states (shimmer), error states with retry, empty states
- [ ] Rate limiting on auth (5 OTP/phone/hour)
- [ ] CORS hardening, Helmet, input sanitization
- [ ] Sentry error tracking (backend + mobile)
- [ ] Swagger API docs at `/api/docs`

---

## Monthly Infrastructure Costs (Estimated)

| Service | Cost |
|---------|------|
| Neon PostgreSQL | Free–$19/mo |
| Backend hosting | ~$7-15/mo |
| Vercel (Next.js) | Free |
| Firebase (FCM) | Free (up to 10K notifs/mo) |
| Semaphore SMS | ~$10-50/mo |
| **Total** | **~$35-85/mo** |

---

## Critical Files Reference

1. `prisma/schema.prisma` — Foundation of the entire data model
2. `apps/api/src/estimation/estimation.engine.ts` — Core business logic (hybrid estimation)
3. `apps/api/src/estimation/estimation.engine.spec.ts` — Tests for the estimation engine
4. `apps/mobile/lib/features/dashboard/presentation/screens/home_screen.dart` — Consumer's primary screen
5. `apps/api/src/auth/auth.service.ts` — OTP + JWT authentication
6. `apps/web/src/app/dashboard/orders/page.tsx` — Retailer order management
