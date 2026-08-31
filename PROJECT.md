# Preemptly - Project Documentation

> **LPG Usage Tracking & Reorder App**
> "Never run out of gas"
>
> Last updated: 2026-04-06

---

## Table of Contents

1. [What is Preemptly](#1-what-is-preemptly)
2. [Problem & Solution](#2-problem--solution)
3. [Target Market](#3-target-market)
4. [User Roles](#4-user-roles)
5. [Core Features](#5-core-features)
6. [Tech Stack](#6-tech-stack)
7. [Project Structure](#7-project-structure)
8. [Database Schema](#8-database-schema)
9. [API Reference](#9-api-reference)
10. [Estimation Engine](#10-estimation-engine)
11. [Discount & Pricing System](#11-discount--pricing-system)
12. [Order Lifecycle](#12-order-lifecycle)
13. [Mobile App (Flutter)](#13-mobile-app-flutter)
14. [Retailer Web Dashboard (Next.js)](#14-retailer-web-dashboard-nextjs)
15. [Offline Strategy](#15-offline-strategy)
16. [Authentication](#16-authentication)
17. [Notifications](#17-notifications)
18. [Development Status](#18-development-status)
19. [Getting Started](#19-getting-started)
20. [Environment Variables](#20-environment-variables)
21. [Infrastructure & Deployment](#21-infrastructure--deployment)
22. [Business Model](#22-business-model)
23. [Phase Roadmap](#23-phase-roadmap)
24. [Known Gaps & Blockers](#24-known-gaps--blockers)
25. [Related Documents](#25-related-documents)

---

## 1. What is Preemptly

Preemptly is a mobile-first platform that helps **households and businesses track their LPG (cooking gas) usage** and reorder before running out, while giving **retailers demand visibility and customer retention tools**.

- **For Consumers:** "This app helps you understand and manage your LPG consumption"
- **For Retailers:** "A free LPG usage & reorder assistant for your customers"
- **Core Principle:** "We help LPG users understand and manage their consumption -- we don't tell them where to buy"

The app predicts when a tank will run empty using a hybrid estimation system (time-based + history-calibrated), then nudges the customer to reorder early through a "preemptly zone" -- a configurable window (default 5 days) before the tank is predicted to run out. Retailers can offer discounts within this zone to incentivize early orders.

**Distribution model:** Retailer-led (B2B2C). Retailers onboard, distribute the app to their customers for free, and gain demand visibility in return.

---

## 2. Problem & Solution

### The Problem

- Most LPG households have **no visibility** into how much gas is left
- Reordering is **reactive** -- customers wait until the tank is empty
- Retailers have **no demand forecasting**, leading to inefficient deliveries
- Existing solutions are either enterprise-focused, hardware-dependent, or supplier-locked

### The Solution

A **no-hardware, usage-first** platform that:

1. Estimates remaining LPG days from usage patterns (no sensors needed for MVP)
2. Alerts customers when they're entering the "preemptly zone"
3. Enables one-tap reorders to their linked retailer
4. Gives retailers a dashboard with running-low visibility and order management
5. Learns and improves predictions with each refill cycle

---

## 3. Target Market

**Phase 1 focus:** Philippines (Philippine Peso, Tagalog/English, Semaphore SMS)

| Segment | Description | LPG Model | App Value |
|---------|-------------|-----------|-----------|
| Households | Residential, 1-2 tanks (11kg typical) | Cylinder exchange | Avoid empty tank, alerts, convenience |
| SMBs | Restaurants, catering, canteens | Exchange or refill | Usage tracking, cost optimization, multi-tank |
| Retailers | LPG suppliers/distributors | N/A | Customer retention, demand visibility, order management |

**Consumption reference (11kg tank, Philippine context):**

| Usage Level | Daily Rate | Days per 11kg Tank |
|-------------|------------|-------------------|
| Light (1-2 meals/day) | 0.20-0.25 kg/day | 44-55 days |
| Moderate (2-3 meals/day) | 0.25-0.35 kg/day | 31-44 days |
| Heavy (3+ meals, large family) | 0.35-0.45 kg/day | 24-31 days |
| Very Heavy | 0.45+ kg/day | <24 days |

---

## 4. User Roles

Three distinct user roles, each with their own auth flow and interface:

| Role | Interface | Auth Endpoint | Description |
|------|-----------|---------------|-------------|
| **Consumer** | Mobile app (Flutter) | `POST /auth/verify-otp` | Tracks tanks, receives predictions, places orders |
| **Retailer** | Web dashboard (Next.js) | `POST /auth/retailer/verify-otp` | Manages customers, orders, riders, pricing, discounts |
| **Rider** | Mobile app (Flutter, planned) | `POST /auth/rider/verify-otp` | Delivers orders, onboards new customers, confirms delivery |

All roles authenticate via phone number + OTP. No email or password.

---

## 5. Core Features

### Consumer (Mobile App)

- **Tank setup:** 2-minute onboarding wizard (tank size, exchange/refill model, usage level)
- **Dashboard:** Circular gas gauge showing estimated days remaining with confidence range
- **Prediction:** Hybrid estimation that improves with each refill cycle
- **Adjustments:** "Cooked more / Cooked less" buttons to temporarily adjust predictions
- **Refill logging:** Record when a tank was refilled; outlier detection for unusual cycles
- **One-tap reorder:** Place order to linked retailer with discount applied
- **Retailer linking:** Connect to retailer via invite link, QR code, or manual code
- **Offline support:** Cached data + offline queue for orders and refill logs

### Retailer (Web Dashboard)

- **Dashboard stats:** Customer count, pending orders, running-low count, new this month
- **Customer list:** Filterable by status (running_low / okay / new)
- **Order management:** Full lifecycle (confirm, reject, assign rider, mark delivered)
- **Rider management:** Add/remove riders, assign to orders
- **Pricing:** Base price per LPG size, retailer-configurable
- **Discount system:** Tiered discounts within the preemptly zone, fully customizable
- **Invite system:** Unique invite links/codes, QR codes, conversion stats
- **Manual order entry:** For orders received via SMS, phone call, or walk-in

### Rider (Mobile App, Planned)

- **Today's deliveries:** Active assigned orders
- **Upcoming prospects:** Customers entering preemptly zone, sorted by urgency
- **New customer registration:** Onboard customers via QR code generation
- **Delivery confirmation:** QR scan, 4-digit code, or manual confirm with photo
- **Delivery history**

---

## 6. Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Mobile** | Flutter (iOS + Android) | Riverpod, GoRouter, Dio, sqflite |
| **Backend** | Elysia + Bun | TypeBox validation, ~300K req/s, ~100ms cold start |
| **Backend (legacy, retained)** | NestJS + Node.js | Fully functional, kept as reference/fallback |
| **Database** | PostgreSQL on Neon | Serverless, connection pooling |
| **ORM** | Prisma | Shared schema at project root |
| **Retailer Dashboard** | Next.js (React) | SvelteKit migration under consideration |
| **Shared Types** | TypeScript package | `@preemptly/shared-types` (22 interfaces, 9 enums) |
| **SMS/OTP** | Semaphore | Philippine SMS gateway (~PHP 0.50/SMS) |
| **Push Notifications** | Firebase Cloud Messaging | Stubbed in dev, FCM for production |
| **State Management** | Riverpod (Flutter) | Reactive, no BLoC boilerplate |
| **Auth** | JWT (HS256, 30-day expiry) | OTP-based, no passwords |

### Why Elysia (Finalized)

Elysia/Bun was evaluated against NestJS and **approved as the primary backend** (decision finalized 2026-03-01). The NestJS codebase is retained in `apps/api/` as a reference and fallback but is not actively developed.

| Factor | NestJS (legacy) | Elysia (primary) |
|--------|--------|--------|
| Runtime | Node.js | Bun |
| Throughput | ~30K req/s | ~300K+ req/s |
| Cold start | ~2-3s | ~100ms |
| Dependencies | ~25 packages | ~5 packages |
| Validation | class-validator (runtime) | TypeBox (compile-time) |
| Type safety | Manual DTOs | End-to-end via Eden treaty |

Both backends share the same Prisma schema and maintain identical route paths and response shapes, so the NestJS version can be spun up as a drop-in replacement if ever needed.

---

## 7. Project Structure

```
preemptly/
  apps/
    api-elysia/          # Elysia/Bun backend (ACTIVE - 57 files)
      src/
        index.ts         # App entry, CORS, error handler, module composition
        lib/
          prisma.ts      # PrismaClient singleton
          errors.ts      # HttpError class
          auth.ts        # JWT plugin + auth derive middleware (3 roles)
          otp-sender.ts  # OtpSender interface + ConsoleOtpSender
        modules/
          auth/          # OTP send/verify for all 3 roles
          users/         # User profile CRUD
          locations/     # Location CRUD
          tanks/         # Tank CRUD + prediction + adjustment
          estimation/    # Prediction engine + scheduler + tests
          refills/       # Refill logging + outlier handling
          orders/        # Full order lifecycle (9 states)
          retailers/     # Retailer profile, dashboard, customers
          riders/        # Rider management + delivery endpoints
          linking/       # Customer-retailer linking
          discounts/     # Discount tier configuration
          notifications/ # Push notification service
          health/        # Health check
        test/            # Integration tests

    api/                 # NestJS backend (LEGACY, retained as fallback - 58 files)
      src/               # Not actively developed; same routes & response shapes
        auth/  users/  locations/  tanks/  estimation/
        refills/  orders/  retailers/  linking/
        notifications/  health/  prisma/  common/

    web/                 # Retailer dashboard (Next.js - 12 files)
      src/
        app/
          login/         # Phone + OTP login
          register/      # Retailer registration
          dashboard/
            page.tsx     # Stats overview
            customers/   # Customer list with status filters
            orders/      # Order management (full lifecycle)
            invite/      # Invite link/QR/stats
            settings/    # Pricing, discounts, preemptly zone
        lib/
          api.ts         # API client
          hooks/use-auth.ts

    mobile/              # Flutter consumer app (22 files)
      lib/
        core/
          constants/     # API base URL, endpoints
          network/       # Dio client + offline queue
          providers/     # Riverpod core providers
          storage/       # flutter_secure_storage wrapper
          theme/         # Colors + theme data
        features/
          auth/          # Phone input + OTP screens
          dashboard/     # Home screen with gas gauge
          onboarding/    # 3-step tank setup wizard
          orders/        # Create order + order history
          retailer_link/ # Manual code entry screen
          settings/      # Basic settings screen
        router/          # GoRouter configuration

  packages/
    shared-types/        # TypeScript interfaces & enums

  prisma/
    schema.prisma        # 14 models, 8 enums
    prisma.config.ts
    seed.ts              # Test data (1 user + 1 retailer)

  documents/
    preemptly/            # All planning & strategy docs
```

**Monorepo approach:** Simple npm workspaces. No Turborepo or Nx -- appropriate for a 2-3 person team.

---

## 8. Database Schema

14 models and 8 enums in Prisma, running on Neon PostgreSQL.

### Models

```
User ──< Location ──< Tank ──< Estimation (1:1)
  │                     │──< RefillLog
  │                     │──< Order
  │                     └──< AccuracyLog
  │──< Order (as customer)
  │──< CustomerRetailerLink >── Retailer
  └──< DeviceToken                │──< RetailerSettings (1:1)
                                  │──< Rider ──< Order (as rider)
                                  │──< Order (as retailer)
                                  │──< InviteStat
                                  └──< CustomerRetailerLink

OtpCode (standalone)
```

### Key Models

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **User** | Consumer account | phone (unique), name, region |
| **Location** | Where tanks live | address, type (HOME/BUSINESS), timezone |
| **Tank** | Individual LPG tank | capacityKg, model (EXCHANGE/REFILL), usageLevel (LIGHT/MODERATE/HEAVY/VERY_HEAVY), lastRefillDate |
| **Estimation** | Current prediction state | timeBasedEstimate, correctionFactor, calibratedEstimate, confidence (LOW/MEDIUM/HIGH), currentAdjustment |
| **RefillLog** | Refill history | refillDate, actualCycleDays, isOutlier, confirmedByUser |
| **Retailer** | LPG retailer/store | businessName, phone, inviteCode (unique), inviteLink (unique) |
| **RetailerSettings** | Retailer config | pricing (JSON), discountTiers (JSON), preemptlyZoneDays (default 5) |
| **Rider** | Delivery rider | name, phone, belongs to retailer |
| **CustomerRetailerLink** | Customer-retailer relationship | linkedVia (INVITE_LINK/QR_CODE/MANUAL_CODE), status, isPrimary |
| **Order** | Reorder transaction | Full 9-state lifecycle, pricing, discount, confirmation method |
| **AccuracyLog** | Prediction accuracy tracking | predictedDays, actualDays, errorDays, userFeedback |
| **InviteStat** | Invite conversion tracking | linkClicks, joins, per date per retailer |
| **OtpCode** | Phone verification | phone, code, expiresAt, verified |
| **DeviceToken** | Push notification tokens | token, platform (ios/android) |

### Enums

| Enum | Values |
|------|--------|
| LocationType | HOME, BUSINESS |
| TankModel | EXCHANGE, REFILL |
| UsageLevel | LIGHT, MODERATE, HEAVY, VERY_HEAVY |
| Confidence | LOW, MEDIUM, HIGH |
| AdjustmentType | COOKED_MORE, COOKED_LESS, NORMAL |
| LinkMethod | INVITE_LINK, QR_CODE, MANUAL_CODE |
| LinkStatus | ACTIVE, INACTIVE |
| OrderStatus | PENDING, PENDING_SMS, CONFIRMED, ASSIGNED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED_BY_CUSTOMER, CANCELLED_BY_RETAILER, REJECTED |

---

## 9. API Reference

Base URL: `http://localhost:3000/api`

### Public Routes (no auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/auth/send-otp` | Send 6-digit OTP (5-min expiry) |
| POST | `/auth/verify-otp` | Verify OTP, return JWT + isNewUser |
| POST | `/auth/retailer/verify-otp` | Retailer OTP verification |
| POST | `/auth/rider/verify-otp` | Rider OTP verification |
| GET | `/link/retailer/:code` | Resolve invite code to retailer preview |
| POST | `/retailers/register` | Register new retailer |

### Consumer Routes (JWT required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/me` | Get current user profile |
| PATCH | `/users/me` | Update profile (name, region) |
| GET/POST | `/locations` | List/create locations |
| GET/PATCH/DELETE | `/locations/:id` | Get/update/delete location |
| GET/POST | `/tanks` | List/create tanks |
| GET/PATCH/DELETE | `/tanks/:id` | Get/update/delete tank |
| GET | `/tanks/:id/prediction` | Get prediction (daysElapsed, estimatedRemainingDays, displayRange, confidence) |
| POST | `/tanks/:id/adjust` | Submit adjustment (COOKED_MORE/COOKED_LESS/NORMAL, auto-expires 7 days) |
| POST | `/refills` | Log a refill |
| GET | `/refills/tank/:tankId` | Get refill history for tank |
| PATCH | `/refills/:id/confirm` | Confirm an outlier refill |
| POST | `/orders` | Create order |
| GET | `/orders` | List my orders |
| GET | `/orders/:id` | Get order detail |
| PATCH | `/orders/:id/cancel` | Cancel order (only PENDING/CONFIRMED) |
| POST | `/link/retailer` | Link to retailer |
| GET | `/link/retailers` | List linked retailers |
| DELETE | `/link/retailer/:retailerId` | Unlink retailer |
| PATCH | `/link/retailer/:retailerId/primary` | Set primary retailer |
| POST | `/notifications/device-token` | Register FCM device token |
| DELETE | `/notifications/device-token` | Remove device token |
| GET | `/discounts/calculate` | Calculate discount for an order |

### Retailer Routes (JWT required, retailer role)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/retailers/me` | Retailer profile |
| PATCH | `/retailers/me` | Update retailer profile |
| GET | `/retailers/me/dashboard` | Stats (customerCount, pendingOrders, runningLowCount, newThisMonth) |
| GET | `/retailers/me/customers` | Customer list with status (running_low/okay/new) |
| GET | `/retailers/me/orders` | All orders for this retailer |
| GET | `/retailers/me/invite-stats` | Invite conversion stats |
| PUT | `/retailers/me/pricing` | Set base prices per LPG size |
| PUT | `/retailers/me/preemptly-zone` | Set preemptly zone days |
| GET/POST/DELETE | `/retailers/me/riders` | Manage riders |
| PATCH | `/orders/:id/confirm` | Confirm order |
| PATCH | `/orders/:id/reject` | Reject order (with reason) |
| PATCH | `/orders/:id/assign` | Assign rider to order |
| PATCH | `/orders/:id/discount` | Override discount amount |
| POST | `/orders/manual` | Create order on behalf of customer (SMS/call/walk-in) |
| GET | `/discounts/tiers` | Get discount tier config |
| PUT | `/discounts/tiers` | Update discount tiers |
| PATCH | `/discounts/toggle` | Enable/disable discounts |

### Rider Routes (JWT required, rider role)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/rider/deliveries` | Today's assigned deliveries |
| GET | `/rider/prospects` | Upcoming preemptly zone customers |
| POST | `/rider/customers` | Register new customer (QR onboarding) |
| POST | `/rider/deliveries/:id/start` | Mark out for delivery |
| POST | `/rider/deliveries/:id/confirm` | Confirm delivery (QR/code/manual) |
| GET | `/rider/history` | Delivery history |

### Prediction Response Shape

```json
{
  "tankId": "clx...",
  "daysElapsed": 12,
  "estimatedTotalDays": 45,
  "estimatedRemainingDays": 33,
  "displayRange": { "low": 28, "high": 38 },
  "confidence": "LOW",
  "refillCount": 0,
  "currentAdjustment": null
}
```

---

## 10. Estimation Engine

**Location:** `apps/api-elysia/src/modules/estimation/engine.ts`

The core business logic -- a hybrid prediction system that combines time-based estimation with history-based calibration.

### How It Works

**1. Cold Start (0 refills, LOW confidence)**

Uses tank size + usage level to estimate daily consumption:

| Location | Usage Level | Daily Rate (kg/day) |
|----------|-------------|---------------------|
| HOME | LIGHT | 0.20-0.25 |
| HOME | MODERATE | 0.25-0.35 |
| HOME | HEAVY | 0.35-0.45 |
| BUSINESS | LIGHT | 2-3 |
| BUSINESS | MODERATE | 3-5 |
| BUSINESS | HEAVY | 5-8 |

Estimated days = `capacityKg / midpoint(dailyRate)`

**2. History-Calibrated (1+ refills)**

```
correctionFactor = weightedAvg(actualCycles) / timeBasedEstimate
calibratedEstimate = timeBasedEstimate * correctionFactor
```

- Valid refill logs: weight 1.0
- Outlier logs: weight 0.3

**3. Confidence Levels**

| Refill Count | Confidence | Margin |
|-------------|------------|--------|
| 0 | LOW | +/- 30-40% |
| 1 | MEDIUM | +/- 20-25% |
| 2 | MEDIUM-HIGH | +/- 15-20% |
| 3+ | HIGH | +/- 10-15% |

**4. User Adjustments**

- "Cooked more" = multiply estimate by 0.85 (shorter cycle)
- "Cooked less" = multiply estimate by 1.15 (longer cycle)
- Auto-expires after 7 days

**5. Display Range**

Always shown as a range, never false precision:
```
low  = estimatedDays * (1 - confidenceMargin)
high = estimatedDays * (1 + confidenceMargin)
```

**6. Outlier Detection**

A refill is flagged as an outlier if `actualCycleDays < 50% of averageCycle`. Outliers get reduced weight (0.3) in future calculations. User is asked to confirm.

**7. Graceful Degradation**

Even with zero engagement, the app shows "days since tank setup" and compares to population averages. The system never fully breaks, just becomes less precise.

### Scheduled Job

Daily at 8:00 AM Manila time (`@elysiajs/cron`): checks all active tanks, sends push notification if estimated remaining <= 5 days OR <= 15% of total cycle.

---

## 11. Discount & Pricing System

### Base Pricing

Retailers set base prices per LPG tank size (e.g., 11kg = 950 pesos). Stored as JSON in `RetailerSettings.pricing`.

### Preemptly Zone

A configurable window before the tank is predicted to run out. Default: 5 days. Range: 1-10 days. Retailer-configurable.

### Discount Tiers

Default tiers (all retailer-customizable):

| Days Before Empty | Discount |
|-------------------|----------|
| 5 days | 50 pesos |
| 4 days | 40 pesos |
| 3 days | 30 pesos |
| 2 days | 20 pesos |
| 1 day | 10 pesos |
| 0 days (empty) | 0 pesos |

- Discounts can be enabled/disabled per retailer
- Discount is **locked at order creation time** (no retroactive changes)
- Retailers can override discount on individual orders

### Payment (Phase 1)

Cash on Delivery only. Rider collects cash. Digital payments (GCash, Maya) planned for Phase 2.

---

## 12. Order Lifecycle

### Internal States

```
PENDING ──> CONFIRMED ──> ASSIGNED ──> OUT_FOR_DELIVERY ──> DELIVERED
  │             │
  │             └──> CANCELLED_BY_RETAILER
  │             └──> REJECTED
  └──> CANCELLED_BY_CUSTOMER
  └──> PENDING_SMS (offline/SMS orders)
```

### Role-Based Views

| Internal Status | Customer Sees | Retailer Sees | Rider Sees |
|----------------|---------------|---------------|------------|
| PENDING | Placed | New | -- |
| CONFIRMED | Confirmed | Accepted | -- |
| ASSIGNED | Confirmed | Assigned | Assigned |
| OUT_FOR_DELIVERY | On the Way | In Transit | In Transit |
| DELIVERED | Delivered | Delivered | Delivered |
| CANCELLED_BY_CUSTOMER | Cancelled | Cancelled | -- |
| CANCELLED_BY_RETAILER | Cancelled | Cancelled | -- |
| REJECTED | Declined | Rejected | -- |

### On Delivery Confirmation

When a delivery is confirmed (via QR scan, 4-digit code, or manual):

1. Order status = DELIVERED
2. Estimation resets to new full tank (lastRefillDate updated)
3. RefillLog entry created automatically
4. Discount applied to final amount
5. Both customer and retailer notified

### Order Channels

All channels converge to a single order record:

| Channel | Who Processes |
|---------|---------------|
| In-app (online) | System (API) |
| SMS (offline) | Retailer enters into web dashboard |
| Phone call | Retailer creates manual order |
| Walk-in | Retailer logs delivery after the fact |
| Offline queue | Auto-syncs when connectivity restored |

### Delivery Confirmation Methods

| Method | Trust Level | Flow |
|--------|-------------|------|
| QR Scan | Highest | Customer shows order QR, rider scans |
| 4-Digit Code | High | Customer gives code verbally to rider |
| Manual Confirm | Lower | Rider confirms with optional photo (flagged `needsReview`) |

---

## 13. Mobile App (Flutter)

### Architecture

- **State management:** Riverpod (reactive, no BLoC boilerplate)
- **Navigation:** GoRouter (declarative, deep link support)
- **HTTP:** Dio (JWT interceptor, retry, error handling)
- **Offline:** sqflite (structured cache + offline queue)
- **Secure storage:** flutter_secure_storage (JWT token)
- **Push:** firebase_messaging

### Navigation Structure

```
Splash (check JWT)
  ├── No token ──> Auth Flow
  │     Phone Input ──> OTP ──> New User: Tank Setup ──> Home
  │                          ──> Existing User: Home
  └── Valid token ──> Home

Bottom Navigation (3 tabs):
  Home    | Orders  | Profile
  ────────|─────────|──────────
  Tank    | Active  | User info
  gauge   | orders  | My tanks
  Refill  | Order   | Linked
  button  | history | retailers
  Order   |         | Settings
  button  |         | Log out
```

### Screen States (Dashboard)

| State | Display |
|-------|---------|
| New User (0 refills) | "Getting to know your usage", LOW confidence, adjustment prompt |
| Calibrated (3+ refills) | "Based on N refills", HIGH confidence, narrow range |
| Running Low (<=5 days) | Red indicator, "ORDER GAS NOW" prominent |

### Color Coding

- Green: >50% remaining
- Yellow: 25-50% remaining
- Orange: 10-25% remaining
- Red: <10% remaining

### Key Dependencies

```yaml
flutter_riverpod, go_router, dio, flutter_secure_storage,
sqflite, firebase_messaging, connectivity_plus, pin_code_fields,
mobile_scanner, percent_indicator, freezed, json_serializable
```

### Current File Count: 22 Dart files

See [Development Status](#18-development-status) for what's built vs missing.

---

## 14. Retailer Web Dashboard (Next.js)

### Pages

| Page | Route | Features |
|------|-------|----------|
| Login | `/login` | Phone + OTP |
| Register | `/register` | New retailer signup |
| Dashboard | `/dashboard` | 4 stat cards (customers, pending orders, running low, new) |
| Customers | `/dashboard/customers` | Filterable table, status badges (Running Low/Okay/New) |
| Orders | `/dashboard/orders` | Full lifecycle: Confirm/Reject/Assign/Complete, 30s auto-polling |
| Invite | `/dashboard/invite` | Copyable invite link, QR code display, conversion stats |
| Settings | `/dashboard/settings` | Business profile, pricing, discounts, preemptly zone config |

### Current State

- All pages built and functional
- Auth is client-side only (localStorage token check, no server-side middleware)
- No shared component library (inline JSX + Tailwind)
- Real-time: 30-second polling on orders page + Browser Notification API for new orders
- Framework migration to SvelteKit under consideration (API contracts are framework-agnostic)

### Current File Count: 12 files

---

## 15. Offline Strategy

### Architecture

```
UI ──> Repository Layer ──> ApiClient (HTTP)
                        ──> CacheStore (SQLite)
                        ──> OfflineQueue (SQLite)
```

### Cache TTLs

| Data | TTL | Strategy |
|------|-----|----------|
| Tank list | 1 hour | Cache-then-network |
| Prediction | 30 min | Cache-then-network |
| Orders | 15 min | Network-first |
| Refill history | 1 hour | Cache-then-network |
| Linked retailers | 6 hours | Cache-first |
| User profile | 24 hours | Cache-first |

### Offline Queue

- Mutations (refill logs, orders) queued when offline
- Auto-processed when connectivity restored (ordered by created_at, max 3 retries)
- NOT queueable: OTP send/verify, retailer lookup, retailer linking
- Deduplication on sync
- Cleanup after 24 hours

### UI Indicators

- Orange banner: "You're offline. Showing cached data."
- Queued actions show: "Queued -- Will send when back online"
- Max cache size: 10MB, evicts oldest entries when exceeded

---

## 16. Authentication

### Flow

1. User enters phone number (Philippines: +63, 10-digit)
2. `POST /auth/send-otp` -- sends 6-digit OTP (5-min expiry)
3. `POST /auth/verify-otp` -- returns JWT + `isNewUser` flag
4. JWT stored in flutter_secure_storage (mobile) or localStorage (web)
5. JWT included as `Authorization: Bearer <token>` on all requests
6. 401 response triggers re-login

### Configuration

- JWT algorithm: HS256
- JWT expiry: 30 days
- OTP expiry: 5 minutes
- OTP provider (dev): ConsoleOtpSender (logs to console)
- OTP provider (prod): SemaphoreOtpSender (Philippine SMS gateway)
- Switchable via `process.env.OTP_PROVIDER`

### Test Credentials

After seeding: Consumer `+639170000001`, Retailer `+639170000002`. OTP codes logged to console in dev.

### Security Gaps (Known)

- No rate limiting on OTP endpoint (brute force vulnerability -- needs max 5 OTP/phone/hour)
- Web dashboard auth is client-side only (no httpOnly cookies, no server middleware)
- No input sanitization or Helmet middleware yet

---

## 17. Notifications

### Triggers

| Event | Recipients | Channel |
|-------|-----------|---------|
| Entering preemptly zone | Customer | Push |
| New order placed | Retailer + assigned rider | Push |
| Order confirmed by retailer | Customer | Push |
| Rider assigned | Customer + rider | Push |
| Rider out for delivery | Customer | Push |
| Order delivered | Customer + retailer | Push |
| Order rejected | Customer | Push |
| Order cancelled | Retailer (if customer cancels) | Push |

### Implementation

- **Backend:** Firebase Admin SDK (currently stubbed -- logs to console in dev)
- **Mobile:** firebase_messaging (not yet initialized in `main.dart`)
- **Web:** Browser Notification API for new orders
- **Scheduled:** Daily 8:00 AM Manila -- preemptly zone alerts via `@elysiajs/cron`

---

## 18. Development Status

**Overall: ~65% complete** (as of 2026-03-23)

| Component | Status | Completion | File Count |
|-----------|--------|------------|------------|
| Database & Schema | Done | 100% | 14 models, 8 enums |
| Backend API (Elysia/Bun) | Done (active) | 100% | 57 files |
| Backend API (NestJS) | Done (legacy, retained as fallback) | 100% | 58 files |
| Retailer Web Dashboard | Functional | 90% | 12 files |
| Consumer Mobile App | Scaffolded | 50% | 22 files |
| Rider Mobile App | Not started | 0% | -- |
| Integration & Deployment | Not started | 0% | -- |
| Polish & Launch Prep | Not started | 0% | -- |

### Mobile App -- Built vs Missing

| Feature | Built | Missing |
|---------|-------|---------|
| Auth (phone + OTP) | Screens + repository | -- |
| Tank setup onboarding | 3-step wizard | -- |
| Dashboard / home | Circular gauge + prediction | Adjustment card, offline banner |
| Orders | Create + history screens | Order detail with timeline |
| Retailer linking | Manual code entry | QR scanner, deep link handling |
| Settings | Basic screen | Full profile, tank management |
| Refill logging | -- | Entire feature (screen, outlier confirm, repository) |
| Dart models (freezed) | -- | All models need proper definition |
| Bottom navigation | -- | ShellRoute with 3 tabs |
| Offline / caching | Queue exists but unwired | Cache-then-network, connectivity service, offline banner |
| Push notifications | -- | FCM setup + token registration |
| Shared widgets | -- | Loading, error, empty states |

### Web Dashboard -- Known Gaps

- Auth is client-side only (no server-side middleware)
- No shared component library (raw Tailwind, no shadcn/ui)
- Some pages missing loading skeletons
- Framework migration (SvelteKit) undecided

### Backend -- Known Gaps

- Firebase push notifications stubbed (console only)
- No rate limiting on OTP
- No Helmet / CORS hardening / input sanitization
- No Swagger/OpenAPI docs
- Shared types package (`@preemptly/shared-types`) exists but not consumed by API or web

### Infrastructure -- Not Started

- No Dockerfiles
- No CI/CD pipeline
- No production deployment
- No Neon production branch / connection pooling
- No Sentry error tracking

---

## 19. Getting Started

### Prerequisites

- Node.js >= 18
- Bun (for Elysia backend)
- Flutter SDK (for mobile app)
- PostgreSQL (or Neon account)

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, etc.

# Database setup
npx prisma migrate dev --schema=prisma/schema.prisma
npx prisma db seed

# Run backend (Elysia/Bun, port 3000)
npm run api-elysia:dev
# OR: bun --watch apps/api-elysia/src/index.ts

# Legacy NestJS backend if needed (same port 3000, don't run both)
# npm run api:dev

# Run web dashboard (port 3001)
npm run web:dev

# Run mobile app
cd apps/mobile && flutter pub get && flutter run

# Other useful commands
npm run db:studio    # Prisma Studio (visual DB browser)
npm run db:generate  # Regenerate Prisma client
```

---

## 20. Environment Variables

```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host.neon.tech/preemplty?sslmode=require"

# Auth
JWT_SECRET="your-jwt-secret-here"
JWT_EXPIRES_IN="30d"

# OTP SMS Service (Semaphore - Philippine SMS gateway)
OTP_SERVICE_API_KEY="your-semaphore-api-key"
OTP_SENDER_NAME="PreEmptly"

# Firebase Cloud Messaging
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_PRIVATE_KEY="your-firebase-private-key"
FIREBASE_CLIENT_EMAIL="your-firebase-client-email"

# App URLs
API_URL="http://localhost:3000"
WEB_URL="http://localhost:3001"
DEEP_LINK_DOMAIN="app.preemptly.com"

# Environment
NODE_ENV="development"
```

---

## 21. Infrastructure & Deployment

### Planned Architecture

| Service | Platform | Cost Estimate |
|---------|----------|---------------|
| Database | Neon PostgreSQL (serverless) | Free tier / $19/mo |
| Backend | Railway / Render / Fly.io | $5-20/mo |
| Web Dashboard | Vercel | Free tier |
| Push Notifications | Firebase Cloud Messaging | Free |
| SMS/OTP | Semaphore | ~PHP 0.50/SMS |
| Error Tracking | Sentry | Free tier |

**Estimated monthly cost:** $35-85/month

### Deployment Pipeline (Not Yet Built)

- Dockerfiles for backend
- GitHub Actions CI/CD
- Neon production branch with connection pooling
- Vercel auto-deploy for web
- APK/IPA builds for mobile

---

## 22. Business Model

### Phase Evolution

| Phase | Timeline | Model |
|-------|----------|-------|
| Phase 1 | 0-9 months | Free app, retailer-distributed |
| Phase 2 | 9-18 months | Freemium + retailer SaaS tiers |
| Phase 3 | 18-30 months | Full SaaS platform, global expansion |

### Revenue Streams (Phase 2+)

| Stream | Target | Price |
|--------|--------|-------|
| Consumer Premium | Households | $1-3/month (multi-tank, analytics, trends, data export) |
| SMB Analytics | Small businesses | $10-30/month |
| Retailer Standard | LPG retailers | $30-50/month (analytics, messaging, revenue tracking) |
| Retailer Premium | Large retailers | $75-100/month (demand forecasting, route optimization, reports) |

### Phase 2 Transition Criteria

- >= 5,000 active users
- >= 10 active retailers
- >= 3 avg refill cycles per user
- <= +/-20% prediction accuracy
- >= 35% 30-day retention
- >= 70% "accurate" ratings on predictions

### Phase 1 Kill Criteria

- App reorder rate < 10% after 9 months
- Weekly retention < 20% after 6 months
- Prediction accuracy > +/-45% after 6 months

---

## 23. Phase Roadmap

### Phase 1: Core MVP (Current)

**Consumer:** Hybrid estimation, refill logging, adjustments, low-LPG alerts, one-tap reorder, offline fallback, basic usage history.

**Retailer:** Registration, invite system, order notifications, customer list with running-low visibility, basic order management, pricing, discounts.

**Budget:** $15,000-30,000. Team: 2-3 people.

### Phase 2: Enhanced + Monetization (9-18 months)

**Consumer Premium:** Multi-tank support, usage analytics, historical trends, cost tracking, data export, sensor integration (BLE/WiFi scales), referral program.

**Retailer Tiers:** Analytics dashboard, customer messaging, revenue tracking, demand forecasting (7-day), delivery scheduling, route optimization, report export.

**Budget:** $50,000-100,000. Team: 4-6 people.

### Phase 3: National / Global Scale (18-30 months)

Multi-location management, enterprise dashboard, partner API, hardware integration SDK, advanced AI predictions, white-label option, multi-country support, localization.

**Geographic expansion:** City/local -> Metro/province -> Nationwide -> SEA -> LatAm -> India

**Budget:** $200,000-500,000. Team: 8-12 people.

---

## 24. Known Gaps & Blockers

### Blocking Launch (Priority Order)

1. **Mobile app completion** -- Biggest remaining effort
   - Refill logging feature (entire flow missing)
   - Freezed Dart models (all data is currently `Map<String, dynamic>`)
   - Bottom navigation (ShellRoute with 3 tabs)
   - Offline queue wiring + connectivity service
   - Push notifications (FCM init in main.dart)
   - QR scanner for retailer linking
   - Shared widgets (loading, error, empty states)
   - Order detail screen with status timeline

2. **Integration**
   - Firebase initialization (not called in Flutter main.dart)
   - Semaphore OTP sender for production
   - Deep link handling (`app.preemptly.com/join/{code}`)
   - Firebase Admin SDK for push notifications (backend currently stubs)

3. **Security**
   - Rate limiting on OTP endpoint
   - Server-side auth for web dashboard
   - CORS hardening, Helmet, input sanitization

4. **Deployment**
   - Dockerfiles
   - CI/CD pipeline
   - Neon production branch
   - App store / Play Store listings

### Open Decisions

- **Web framework:** Stay with Next.js or migrate to SvelteKit?
- **Shared types:** Consume `@preemptly/shared-types` package, or replace with Eden treaty (Elysia's end-to-end type system)?

---

## 25. Related Documents

All in `documents/preemptly/`:

| Document | Purpose |
|----------|---------|
| `LPG_App_Product_Strategy_Document.md` | Comprehensive product strategy, business model, market analysis, full feature spec across all phases |
| `preemptly.md` / `preemptly.txt` | Original brainstorm notes and idea sketch |
| `preemptly2.md` | Revised process flows v2 -- identified 16 flaws in original design and provided corrected flows |
| `IMPLEMENTATION_PLAN_v2.md` | 15-phase implementation plan with gap analysis |
| `PHASE1_MVP_IMPLEMENTATION_PLAN_v2.md` | Detailed Phase 1 technical plan (updated for Elysia migration) |
| `ELYSIA_MIGRATION_TECHNICAL_DOC.md` | NestJS to Elysia migration spec with concept mapping and code patterns |
| `MOBILE_APP_PLAN.md` | High-level mobile app plan with screen-to-API mapping |
| `MOBILE_APP_DEEP_DIVE.md` | Detailed wireframes, Dart models, navigation, API service layer, offline strategy |
| `PHASE1_MVP_BUILD_SUMMARY.md` | Summary of the initial build (Feb 2026) |
| `NEXT_SESSION_SUGGESTIONS.md` | Gap audit with prioritized session order |
| `DEVELOPMENT_STATUS.md` | Current development status snapshot |
| `ARCHITECTURE_DECISION_ANALYSIS.md` | Shared vs separate apps analysis (LPG vs Healthcare) |
| `LPG app Roadmap.docx` / `LPG_App_Strategy_and_Roadmap.pdf` | Original roadmap documents |

### Mobile App Completion Plan (Active)

The mobile app is being built in 7 sequential chunks. Each chunk is a self-contained session that leaves the app in a working state.

| Chunk | Focus | Status | Plan Doc |
|-------|-------|--------|----------|
| 1 | Auth guard + shared widgets + token cleanup | Planned | `MOBILE_CHUNK1_AUTH_GUARD_PLAN.md` |
| 2 | Bottom navigation (ShellRoute, 3 tabs) | Planned | `MOBILE_CHUNK2_BOTTOM_NAV_PLAN.md` |
| 3 | Firebase + connectivity + environment config | Planned | `MOBILE_CHUNK3_FIREBASE_CONNECTIVITY_PLAN.md` |
| 4 | Offline queue wiring + dashboard fixes | Planned | `MOBILE_CHUNK4_OFFLINE_DASHBOARD_PLAN.md` |
| 5 | Settings completion (tank edit + notifications) | Planned | `MOBILE_CHUNK5_SETTINGS_PLAN.md` |
| 6 | QR scanner + order detail screen | Planned | `MOBILE_CHUNK6_QR_ORDER_DETAIL_PLAN.md` |
| 7 | Freezed models + final polish | Blocked (needs 1-6 done first) | -- |

Chunks 5 and 6 have no file overlap and can be done in either order. All other chunks are sequential.

**Chunk 7 note:** This chunk is a codebase-wide migration from raw `Map<String, dynamic>` to typed freezed models (`UserModel`, `TankModel`, `PredictionModel`, `OrderModel`, etc.). It cannot be planned in detail until Chunks 1-6 are implemented, because the exact model shapes depend on the final code written in those chunks. Once Chunks 1-6 are complete, Chunk 7 will be planned as a refinement pass: define freezed models from the actual API usage patterns, replace all raw Map casts, convert manual `copyWith` state classes to `@freezed`, and run `dart run build_runner build`.
