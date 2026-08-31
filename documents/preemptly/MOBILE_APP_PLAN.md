# Preemptly Mobile App Plan (Consumer - Flutter)

> Planning session: 2026-03-17

---

## 1. App Screens & Features

| Screen | Purpose | API Endpoints Used |
|--------|---------|-------------------|
| **Onboarding / Auth** | Phone + OTP login | `POST /auth/send-otp`, `POST /auth/verify-otp` |
| **Tank Setup** | Add tank: size, model (exchange/refill), usage level | `POST /tanks` |
| **Dashboard (Home)** | Circular gauge showing days remaining, confidence, adjustment buttons | `GET /tanks`, `GET /tanks/:id/prediction` |
| **Refill Log** | 1-tap "I refilled" + outlier confirmation | `POST /refills` |
| **Adjustment** | "Cooked more/less today" buttons | `POST /tanks/:id/adjust` |
| **Order Flow** | Select tank → confirm retailer → place order → track status | `POST /orders`, `GET /orders` |
| **Order History** | Past orders with status | `GET /orders` |
| **Retailer Linking** | QR scanner, deep link handler, manual code entry | `GET /link/retailer/:code`, `POST /link/retailer` |
| **Profile / Settings** | Name, phone, manage locations, notification prefs | `GET /users/me`, `PATCH /users/me` |
| **Notifications** | Push notification list (low gas alerts, order updates) | Device token via `POST /notifications/register-device` |

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Flutter | Cross-platform iOS/Android, single codebase |
| **State Management** | Riverpod | Reactive, testable, recommended for Flutter |
| **Navigation** | GoRouter | Declarative routing, deep link support (needed for retailer invite links) |
| **HTTP Client** | Dio | Interceptors for JWT auth, retry logic |
| **Local Storage** | sqflite | Offline cache for tank data & predictions |
| **Push Notifications** | firebase_messaging | FCM already integrated on backend |
| **QR Scanning** | mobile_scanner | For retailer linking via QR codes |
| **Charts/Gauge** | fl_chart or custom painter | For the circular gas remaining indicator |

---

## 3. Data Models & API Contracts

### Core Dart Models

**User**
- id, name, phone, region

**Tank**
- id, locationId, capacityKg, model (EXCHANGE/REFILL), usageLevel (LIGHT/MODERATE/HEAVY), lastRefillDate, isActive

**Prediction**
- tankId, daysElapsed, estimatedTotalDays, estimatedRemainingDays, displayRange (low, high), confidence (LOW/MEDIUM/HIGH), refillCount, currentAdjustment

**Order**
- id, tankId, customerId, retailerId, status, basePrice, discountAmount, finalAmount, deliveryAddress, confirmationCode, paymentMethod, note

**Retailer (preview)**
- businessName, ownerName, address, city, inviteCode

**RefillLog**
- id, tankId, refillDate, actualCycleDays, isOutlier, confirmedByUser

**Location**
- id, userId, address, type (HOME/BUSINESS), timezone

### Offline Strategy

- Cache predictions and tank data in sqflite
- Queue refill logs and orders for replay when back online
- No new API endpoints needed for Phase 1 mobile — everything exists already

---

## 4. Navigation Structure

```
App Launch
├── Splash → check JWT
│   ├── No token → Auth Flow
│   │   ├── Phone Entry
│   │   └── OTP Verification
│   │       ├── New User → Tank Setup Flow
│   │       │   ├── Location Setup (address, type)
│   │       │   └── Tank Setup (size, model, usage level)
│   │       └── Existing User → Home
│   └── Valid token → Home
│
├── Home (Dashboard)
│   ├── Tank Card(s) — tap for detail
│   │   ├── Tank Detail → prediction, gauge, history
│   │   ├── "I Refilled" → Refill Confirmation
│   │   └── "Cooked More/Less" → Adjustment
│   └── "Order Gas" → Order Flow
│       ├── Select Tank
│       ├── Confirm Retailer (or link one)
│       └── Place Order → Order Tracking
│
├── Orders Tab — order history + active orders
│
├── Link Retailer (accessible from order flow or settings)
│   ├── QR Scanner
│   ├── Manual Code Entry
│   └── Deep Link Handler (app.preemptly.com/link/*)
│
└── Profile Tab
    ├── Edit Name
    ├── Manage Locations & Tanks
    └── Notification Settings
```

**Bottom Navigation:** Home | Orders | Profile (3 tabs)

---

## 5. API Endpoints Reference

### Auth
- `POST /auth/send-otp` — Send 6-digit OTP code
- `POST /auth/verify-otp` — Verify OTP → returns JWT + isNewUser flag

### Users
- `GET /users/me` — Get current user profile
- `PATCH /users/me` — Update profile (name, region)

### Tanks
- `POST /tanks` — Create tank with initial estimation
- `GET /tanks` — List all tanks for user
- `GET /tanks/:id` — Get specific tank
- `PATCH /tanks/:id` — Update tank details
- `DELETE /tanks/:id` — Delete tank
- `GET /tanks/:id/prediction` — Get gas consumption prediction
- `POST /tanks/:id/adjust` — Set adjustment (COOKED_MORE/LESS/NORMAL)

### Refills
- `POST /refills` — Log a refill
- `GET /refills/:tankId` — Get refill history

### Orders
- `POST /orders` — Create order
- `GET /orders` — List orders
- `GET /orders/:id` — Get order details
- `PATCH /orders/:id/cancel` — Cancel order

### Linking
- `GET /link/retailer/:code` — Resolve invite code to retailer preview
- `POST /link/retailer` — Link customer to retailer

### Notifications
- `POST /notifications/register-device` — Register Firebase device token

### Discounts
- `GET /discounts/calculate` — Calculate discount for tank/retailer
