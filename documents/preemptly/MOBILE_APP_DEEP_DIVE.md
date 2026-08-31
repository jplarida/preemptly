# Preemptly Mobile App — Deep Dive Document

> Date: 2026-03-17
> Status: Planning Phase
> Scope: Consumer-facing Flutter app (iOS + Android)

---

## Table of Contents

1. [Screen Wireframes & UX Detail](#1-screen-wireframes--ux-detail)
2. [Flutter Project Scaffold & Navigation](#2-flutter-project-scaffold--navigation)
3. [Dart Models & API Service Layer](#3-dart-models--api-service-layer)
4. [Offline & Caching Strategy](#4-offline--caching-strategy)

---

## 1. Screen Wireframes & UX Detail

### 1.1 Splash Screen

```
┌─────────────────────────────────┐
│                                 │
│                                 │
│         🔥 PreEmptly            │
│      Never run out of gas       │
│                                 │
│           [spinner]             │
│                                 │
│                                 │
└─────────────────────────────────┘
```

**Behavior:**
- Check for stored JWT in `flutter_secure_storage`
- Valid token → navigate to `/home`
- No token or expired → navigate to `/login`
- Duration: 1.5s max (don't block on slow network)

---

### 1.2 Auth: Phone Input Screen

```
┌─────────────────────────────────┐
│  ←                              │
│                                 │
│  What's your phone number?      │
│                                 │
│  We'll send you a code to       │
│  verify your account.           │
│                                 │
│  ┌─────────────────────────┐    │
│  │ +63 │ 917 000 0001      │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │      Send OTP Code      │    │
│  └─────────────────────────┘    │
│                                 │
│  By continuing, you agree to    │
│  our Terms & Privacy Policy     │
│                                 │
└─────────────────────────────────┘
```

**Details:**
- Country code fixed to +63 (Philippines) for Phase 1
- Input validation: 10 digits after country code
- Button disabled until valid number entered
- On submit: `POST /auth/send-otp` → navigate to OTP screen
- Error states: network error, rate limit, invalid number

---

### 1.3 Auth: OTP Verification Screen

```
┌─────────────────────────────────┐
│  ←                              │
│                                 │
│  Enter verification code        │
│                                 │
│  We sent a 6-digit code to      │
│  +63 917 000 0001               │
│                                 │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐│
│  │  │ │  │ │  │ │  │ │  │ │  ││
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘│
│                                 │
│  Didn't get a code?             │
│  Resend in 0:45                 │
│                                 │
│  ┌─────────────────────────┐    │
│  │        Verify           │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

**Details:**
- 6-digit PIN input using `PinCodeTextField`
- Auto-submit when 6 digits entered
- Resend timer: 60 seconds countdown
- On verify: `POST /auth/verify-otp`
  - `isNewUser: true` → navigate to `/onboarding`
  - `isNewUser: false` → navigate to `/home`
- Store JWT + userId in secure storage

---

### 1.4 Onboarding: Tank Setup (3-Step Wizard)

**Step 1 — Tank Size**
```
┌─────────────────────────────────┐
│                                 │
│  What size is your LPG tank?    │
│                                 │
│  ┌─────────┐  ┌─────────┐      │
│  │  2.7 kg │  │  11 kg  │      │
│  │  (small)│  │ (common)│      │
│  └─────────┘  └─────────┘      │
│  ┌─────────┐  ┌─────────┐      │
│  │  22 kg  │  │  50 kg  │      │
│  │ (large) │  │(commerc)│      │
│  └─────────┘  └─────────┘      │
│                                 │
│  Model: ○ Exchange  ○ Refill    │
│                                 │
│  Step 1 of 3           [Next →] │
└─────────────────────────────────┘
```

**Step 2 — Location Type**
```
┌─────────────────────────────────┐
│  ←                              │
│  Where do you use this tank?    │
│                                 │
│  ┌─────────────────────────┐    │
│  │  🏠  Home               │    │
│  │  For household cooking   │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │  🏢  Business            │    │
│  │  Restaurant, canteen,    │    │
│  │  food stall, etc.        │    │
│  └─────────────────────────┘    │
│                                 │
│  Address (optional):            │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
│  Step 2 of 3           [Next →] │
└─────────────────────────────────┘
```

**Step 3 — Usage Intensity**
```
┌─────────────────────────────────┐
│  ←                              │
│  How much do you cook?          │
│                                 │
│  ┌─────────────────────────┐    │
│  │  Light                  │    │
│  │  1-2 meals/day,         │    │
│  │  simple dishes           │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │  Moderate               │    │
│  │  2-3 meals/day,         │    │
│  │  regular cooking         │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │  Heavy                  │    │
│  │  3+ meals/day, heavy     │    │
│  │  cooking, large family   │    │
│  └─────────────────────────┘    │
│                                 │
│  Step 3 of 3      [Start →]    │
└─────────────────────────────────┘
```

**On completion:**
1. `POST /tanks` with locationId, capacityKg, model, usageLevel
2. Creates location + tank + initial estimation on backend
3. Navigate to `/home`

---

### 1.5 Home / Dashboard Screen

**New User (0 refills, LOW confidence)**
```
┌─────────────────────────────────┐
│  PreEmptly             ⚙️  🔔   │
│─────────────────────────────────│
│                                 │
│        ┌───────────┐            │
│       ╱    12/45    ╲           │
│      │   days used   │          │
│      │               │          │
│       ╲  ~33 days   ╱           │
│        └───────────┘            │
│        remaining                │
│                                 │
│  📊 Estimated cycle: 35–55 days │
│  ⚪ Getting to know your usage  │
│  🛢️ 11 kg • Home • Moderate     │
│                                 │
│  ┌─────────────────────────┐    │
│  │  Anything unusual?      │    │
│  │  [More] [Less] [Normal] │ ✕  │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │    🔄 I Refilled!       │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │    🛒 Order Gas          │    │
│  └─────────────────────────┘    │
│                                 │
│─────────────────────────────────│
│   🏠 Home    📦 Orders   👤 Me  │
└─────────────────────────────────┘
```

**Calibrated User (3+ refills, HIGH confidence)**
```
┌─────────────────────────────────┐
│  PreEmptly             ⚙️  🔔   │
│─────────────────────────────────│
│                                 │
│        ┌───────────┐            │
│       ╱    35/43    ╲           │
│      │   days used   │          │
│      │  ██████████░  │          │
│       ╲   ~8 days   ╱           │
│        └───────────┘            │
│        remaining                │
│                                 │
│  📊 Refill window: 7–10 days    │
│  🟢 Based on 5 refills          │
│  🛢️ 11 kg • Home • Moderate     │
│                                 │
│  ┌─────────────────────────┐    │
│  │    🔄 I Refilled!       │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │    🛒 Order Gas          │    │
│  └─────────────────────────┘    │
│                                 │
│─────────────────────────────────│
│   🏠 Home    📦 Orders   👤 Me  │
└─────────────────────────────────┘
```

**Running Low State (≤ 5 days or ≤ 15% remaining)**
```
┌─────────────────────────────────┐
│  PreEmptly             ⚙️  🔔   │
│─────────────────────────────────│
│                                 │
│  ⚠️ Running Low!                │
│                                 │
│        ┌───────────┐            │
│       ╱    40/43    ╲           │
│      │   days used   │          │
│      │  ████████████ │  (RED)   │
│       ╲   ~3 days   ╱           │
│        └───────────┘            │
│        remaining                │
│                                 │
│  📊 Estimated: 1–5 days left    │
│  🟢 Based on 5 refills          │
│                                 │
│  ┌─────────────────────────┐    │
│  │   🛒 ORDER GAS NOW      │    │  (prominent, red/orange)
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │    🔄 I Already Refilled │    │
│  └─────────────────────────┘    │
│                                 │
│─────────────────────────────────│
│   🏠 Home    📦 Orders   👤 Me  │
└─────────────────────────────────┘
```

**Key UI Elements:**
- Circular progress indicator (`percent_indicator` package)
- Color coding: Green (>50%), Yellow (25-50%), Orange (10-25%), Red (<10%)
- Pull-to-refresh to re-fetch prediction
- Offline indicator banner when no connection (shows cached data)
- Adjustment prompt: dismissible card, only shown when no active adjustment

---

### 1.6 Refill Logging Flow

**Step 1 — When did you refill?**
```
┌─────────────────────────────────┐
│  ←  Log a Refill                │
│─────────────────────────────────│
│                                 │
│  When did you get a new tank?   │
│                                 │
│  ┌─────────────────────────┐    │
│  │  ✅ Just now (today)     │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │  📅 A few days ago...    │    │
│  └─────────────────────────┘    │
│                                 │
│                                 │
│  (If "A few days ago" tapped,   │
│   show date picker)             │
│                                 │
└─────────────────────────────────┘
```

**Step 2 — Outlier Confirmation (conditional)**
```
┌─────────────────────────────────┐
│  ←  Log a Refill                │
│─────────────────────────────────│
│                                 │
│  ⚠️ That's earlier than usual!  │
│                                 │
│  Your typical cycle is 40–45    │
│  days, but this was only 15     │
│  days.                          │
│                                 │
│  ┌─────────────────────────┐    │
│  │  Yes, this is correct   │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │  Let me fix the date    │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

Only shown when `actualCycleDays < average * 0.5` (outlier detected).

**Step 3 — Success**
```
┌─────────────────────────────────┐
│                                 │
│         ✅ Refill Logged!       │
│                                 │
│  Your estimate has been         │
│  updated. It'll get more        │
│  accurate over time.            │
│                                 │
│  Cycle: 44 days                 │
│  Confidence: Medium → High      │
│                                 │
│  ┌─────────────────────────┐    │
│  │    Back to Dashboard     │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

**API calls:**
1. `POST /refills` with `{ tankId, refillDate?, confirmOutlier? }`
2. Response includes updated estimation and outlier flag
3. Dashboard auto-refreshes prediction on return

---

### 1.7 Order Flow

**Step 1 — Select Tank (if multiple)**
```
┌─────────────────────────────────┐
│  ←  Order Gas                   │
│─────────────────────────────────│
│                                 │
│  Which tank needs a refill?     │
│                                 │
│  ┌─────────────────────────┐    │
│  │ ○ 11 kg • Home          │    │
│  │   ~3 days remaining      │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ ○ 22 kg • Business      │    │
│  │   ~12 days remaining     │    │
│  └─────────────────────────┘    │
│                                 │
│                       [Next →]  │
└─────────────────────────────────┘
```

Skipped if user has only one tank.

**Step 2 — Confirm Retailer**
```
┌─────────────────────────────────┐
│  ←  Order Gas                   │
│─────────────────────────────────│
│                                 │
│  Order from:                    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ 🏪 Gas Express Makati   │    │
│  │ Brgy. San Antonio        │    │
│  │ Quezon City              │    │
│  └─────────────────────────┘    │
│                                 │
│  Delivery address:              │
│  ┌─────────────────────────┐    │
│  │ 123 Main St, Makati     │    │
│  └─────────────────────────┘    │
│                                 │
│  Note (optional):               │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │    Place Order           │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

If no linked retailer → redirect to `/link-retailer`.

**Step 3 — Order Confirmation**
```
┌─────────────────────────────────┐
│                                 │
│         ✅ Order Placed!        │
│                                 │
│  Your retailer has been         │
│  notified and will confirm      │
│  your order shortly.            │
│                                 │
│  Order #abc123                  │
│  11 kg tank                     │
│  Gas Express Makati             │
│                                 │
│  ┌─────────────────────────┐    │
│  │   View Order Status      │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │   Back to Dashboard      │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

---

### 1.8 Order History / Orders Tab

```
┌─────────────────────────────────┐
│  Orders                    🔔   │
│─────────────────────────────────│
│  Active                         │
│  ┌─────────────────────────┐    │
│  │ 🟡 CONFIRMED            │    │
│  │ 11 kg • Gas Express      │    │
│  │ Mar 15, 2026             │    │
│  │ ₱450                    │ →  │
│  └─────────────────────────┘    │
│                                 │
│  Past                           │
│  ┌─────────────────────────┐    │
│  │ ✅ DELIVERED             │    │
│  │ 11 kg • Gas Express      │    │
│  │ Feb 10, 2026             │    │
│  │ ₱430 (₱20 discount)    │ →  │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ ❌ CANCELLED             │    │
│  │ 11 kg • Gas Express      │    │
│  │ Jan 5, 2026              │    │
│  └─────────────────────────┘    │
│                                 │
│─────────────────────────────────│
│   🏠 Home    📦 Orders   👤 Me  │
└─────────────────────────────────┘
```

**Order Detail Screen (tap an order):**
```
┌─────────────────────────────────┐
│  ←  Order Details               │
│─────────────────────────────────│
│                                 │
│  Status: 🟡 CONFIRMED          │
│                                 │
│  ── Timeline ──                 │
│  ● Placed       Mar 15, 10:30  │
│  ● Confirmed    Mar 15, 10:45  │
│  ○ Assigned                     │
│  ○ Out for delivery             │
│  ○ Delivered                    │
│                                 │
│  ── Details ──                  │
│  Tank: 11 kg                    │
│  Retailer: Gas Express Makati   │
│  Address: 123 Main St           │
│  Price: ₱450                    │
│  Discount: -₱20                 │
│  Total: ₱430                    │
│  Payment: COD                   │
│                                 │
│  ┌─────────────────────────┐    │
│  │    Cancel Order          │    │  (only for PENDING/CONFIRMED)
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

**Status color mapping:**
| Status | Color | Label |
|--------|-------|-------|
| PENDING | ⚪ Gray | Waiting for confirmation |
| CONFIRMED | 🟡 Yellow | Confirmed by retailer |
| ASSIGNED | 🔵 Blue | Rider assigned |
| OUT_FOR_DELIVERY | 🟣 Purple | On the way |
| DELIVERED | 🟢 Green | Delivered |
| CANCELLED_BY_CUSTOMER | ❌ Red | You cancelled |
| CANCELLED_BY_RETAILER | ❌ Red | Cancelled by retailer |
| REJECTED | ❌ Red | Rejected |

---

### 1.9 Link Retailer Screen

```
┌─────────────────────────────────┐
│  ←  Link to a Retailer          │
│─────────────────────────────────│
│                                 │
│  Enter the invite code from     │
│  your LPG retailer:             │
│                                 │
│  ┌─────────────────────────┐    │
│  │  GASEXP01               │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │      Look Up             │    │
│  └─────────────────────────┘    │
│                                 │
│  ── or ──                       │
│                                 │
│  ┌─────────────────────────┐    │
│  │  📷 Scan QR Code         │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

**After lookup — Retailer Preview:**
```
┌─────────────────────────────────┐
│  ←  Link to a Retailer          │
│─────────────────────────────────│
│                                 │
│  ┌─────────────────────────┐    │
│  │ 🏪 Gas Express Makati   │    │
│  │ Quezon City              │    │
│  └─────────────────────────┘    │
│                                 │
│  Link to this retailer?         │
│  You'll be able to order gas    │
│  directly through the app.      │
│                                 │
│  ┌─────────────────────────┐    │
│  │   Yes, Link Me           │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │   Cancel                 │    │
│  └─────────────────────────┘    │
│                                 │
└─────────────────────────────────┘
```

**Deep Link Handling:**
- URL pattern: `app.preemptly.com/join/{code}`
- If app installed: open directly to linking screen with code pre-filled
- If not installed: redirect to app store, then handle on first open

---

### 1.10 Profile / Settings Tab

```
┌─────────────────────────────────┐
│  Profile                        │
│─────────────────────────────────│
│                                 │
│  👤 Juan Dela Cruz              │
│  +63 917 000 0001               │
│  [Edit Profile]                 │
│                                 │
│  ── My Tanks ──                 │
│  ┌─────────────────────────┐    │
│  │ 🛢️ 11 kg • Home         │    │
│  │ Moderate • Exchange     │ →  │
│  └─────────────────────────┘    │
│  [+ Add Another Tank]           │
│                                 │
│  ── Linked Retailers ──         │
│  ┌─────────────────────────┐    │
│  │ 🏪 Gas Express Makati   │    │
│  │ ⭐ Primary              │ →  │
│  └─────────────────────────┘    │
│  [+ Link Another Retailer]      │
│                                 │
│  ── Settings ──                 │
│  Notifications             →    │
│  About                     →    │
│                                 │
│  [Log Out]                      │
│                                 │
│─────────────────────────────────│
│   🏠 Home    📦 Orders   👤 Me  │
└─────────────────────────────────┘
```

---

## 2. Flutter Project Scaffold & Navigation

### 2.1 Current State (Already Built)

The Flutter project already has significant scaffolding:

```
apps/mobile/lib/
├── main.dart                          ✅ Entry point with ProviderScope
├── core/
│   ├── constants/
│   │   └── api_constants.dart         ✅ Base URL config
│   ├── network/
│   │   ├── api_client.dart            ✅ Dio + JWT interceptor
│   │   └── offline_queue.dart         ✅ SQLite offline queue
│   ├── storage/
│   │   └── secure_storage.dart        ✅ Token storage
│   ├── providers/
│   │   └── core_providers.dart        ✅ Riverpod providers
│   ├── theme/
│   │   ├── app_theme.dart             ✅ Material3 theme
│   │   └── app_colors.dart            ✅ Color constants
│   └── router/
│       └── app_router.dart            ✅ GoRouter (8 routes)
└── features/
    ├── auth/
    │   ├── data/
    │   │   └── auth_repository.dart   ✅ OTP send/verify
    │   └── presentation/
    │       ├── providers/
    │       │   └── auth_provider.dart  ✅ AuthState notifier
    │       └── screens/
    │           ├── phone_input_screen.dart ✅
    │           └── otp_screen.dart     ✅
    ├── dashboard/
    │   ├── data/
    │   │   └── dashboard_repository.dart ✅ Tanks + prediction
    │   └── presentation/
    │       ├── providers/
    │       │   └── dashboard_provider.dart ✅
    │       └── screens/
    │           └── home_screen.dart    ✅ Circular indicator
    ├── onboarding/
    │   └── presentation/
    │       └── screens/
    │           └── tank_setup_screen.dart ✅ 3-step wizard
    ├── orders/
    │   ├── data/
    │   │   └── orders_repository.dart ✅
    │   └── presentation/
    │       └── screens/
    │           ├── create_order_screen.dart ✅
    │           └── order_history_screen.dart ✅
    ├── retailer_link/
    │   └── presentation/
    │       └── screens/
    │           └── link_retailer_screen.dart ✅
    └── settings/
        └── presentation/
            └── screens/
                └── settings_screen.dart ✅
```

### 2.2 What's Missing / Needs to Be Added

```
apps/mobile/lib/
├── core/
│   ├── network/
│   │   └── connectivity_service.dart  ❌ NEEDED - monitor online/offline
│   ├── models/                        ❌ NEEDED - shared Dart models (freezed)
│   │   ├── user.dart
│   │   ├── tank.dart
│   │   ├── prediction.dart
│   │   ├── order.dart
│   │   ├── retailer.dart
│   │   ├── refill_log.dart
│   │   ├── location.dart
│   │   └── enums.dart
│   └── services/
│       └── notification_service.dart  ❌ NEEDED - FCM setup + handling
├── features/
│   ├── dashboard/
│   │   └── presentation/
│   │       └── widgets/               ❌ NEEDED
│   │           ├── gas_gauge_widget.dart    — circular progress indicator
│   │           ├── tank_card_widget.dart    — tank summary card
│   │           ├── adjustment_card.dart     — cooked more/less prompt
│   │           └── offline_banner.dart      — "Using cached data" banner
│   ├── refill/                        ❌ NEEDED - dedicated refill feature
│   │   ├── data/
│   │   │   └── refill_repository.dart
│   │   └── presentation/
│   │       ├── providers/
│   │       │   └── refill_provider.dart
│   │       └── screens/
│   │           ├── refill_screen.dart      — date selection
│   │           └── outlier_confirm_screen.dart — outlier handling
│   ├── orders/
│   │   └── presentation/
│   │       └── screens/
│   │           └── order_detail_screen.dart ❌ NEEDED - timeline view
│   └── retailer_link/
│       └── presentation/
│           └── screens/
│               └── qr_scanner_screen.dart  ❌ NEEDED - camera QR scan
└── shared/
    └── widgets/                       ❌ NEEDED
        ├── loading_overlay.dart
        ├── error_widget.dart
        └── empty_state_widget.dart
```

### 2.3 Navigation Structure (GoRouter)

**Current routes (8):**
| Route | Screen | Auth Required |
|-------|--------|--------------|
| `/login` | PhoneInputScreen | No |
| `/otp` | OtpScreen | No |
| `/onboarding` | TankSetupScreen | Yes |
| `/home` | HomeScreen | Yes |
| `/orders/create` | CreateOrderScreen | Yes |
| `/orders/history` | OrderHistoryScreen | Yes |
| `/link-retailer` | LinkRetailerScreen | Yes |
| `/settings` | SettingsScreen | Yes |

**Routes to add:**
| Route | Screen | Auth Required |
|-------|--------|--------------|
| `/` | SplashScreen | No |
| `/refill` | RefillScreen | Yes |
| `/refill/confirm-outlier` | OutlierConfirmScreen | Yes |
| `/orders/:id` | OrderDetailScreen | Yes |
| `/link-retailer/qr` | QRScannerScreen | Yes |
| `/profile` | ProfileScreen (rename settings) | Yes |
| `/profile/edit` | EditProfileScreen | Yes |
| `/tank/:id` | TankDetailScreen | Yes |
| `/tank/add` | TankSetupScreen (reuse) | Yes |

**Updated Router with Shell Route for Bottom Nav:**

```dart
GoRouter(
  initialLocation: '/',
  redirect: (context, state) {
    final isLoggedIn = /* check auth state */;
    final isAuthRoute = state.matchedLocation == '/login'
        || state.matchedLocation == '/otp';

    if (!isLoggedIn && !isAuthRoute) return '/login';
    if (isLoggedIn && isAuthRoute) return '/home';
    return null;
  },
  routes: [
    // Splash
    GoRoute(path: '/', builder: (_, __) => SplashScreen()),

    // Auth (no bottom nav)
    GoRoute(path: '/login', builder: (_, __) => PhoneInputScreen()),
    GoRoute(path: '/otp', builder: (_, state) => OtpScreen(...)),
    GoRoute(path: '/onboarding', builder: (_, __) => TankSetupScreen()),

    // Main app with bottom navigation shell
    ShellRoute(
      builder: (_, state, child) => MainShell(child: child),
      routes: [
        GoRoute(
          path: '/home',
          builder: (_, __) => HomeScreen(),
          routes: [
            GoRoute(path: 'refill', builder: (_, __) => RefillScreen()),
            GoRoute(path: 'refill/confirm', builder: (_, __) => OutlierConfirmScreen()),
            GoRoute(path: 'tank/:id', builder: (_, state) => TankDetailScreen(...)),
            GoRoute(path: 'tank/add', builder: (_, __) => TankSetupScreen()),
          ],
        ),
        GoRoute(
          path: '/orders',
          builder: (_, __) => OrderHistoryScreen(),
          routes: [
            GoRoute(path: 'create', builder: (_, __) => CreateOrderScreen()),
            GoRoute(path: ':id', builder: (_, state) => OrderDetailScreen(...)),
          ],
        ),
        GoRoute(
          path: '/profile',
          builder: (_, __) => ProfileScreen(),
          routes: [
            GoRoute(path: 'edit', builder: (_, __) => EditProfileScreen()),
            GoRoute(path: 'link-retailer', builder: (_, __) => LinkRetailerScreen()),
            GoRoute(path: 'link-retailer/qr', builder: (_, __) => QRScannerScreen()),
          ],
        ),
      ],
    ),
  ],
);
```

**Bottom Navigation (MainShell):**
```dart
class MainShell extends StatelessWidget {
  final Widget child;

  // 3 tabs:
  // Index 0: Home (/home)
  // Index 1: Orders (/orders)
  // Index 2: Profile (/profile)

  BottomNavigationBar(
    items: [
      BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
      BottomNavigationBarItem(icon: Icon(Icons.receipt_long), label: 'Orders'),
      BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Me'),
    ],
  )
}
```

**Deep Link Configuration:**
```dart
GoRouter(
  // Handle app.preemptly.com/join/{code}
  routes: [
    GoRoute(
      path: '/join/:code',
      redirect: (context, state) {
        final code = state.pathParameters['code'];
        return '/profile/link-retailer?code=$code';
      },
    ),
  ],
)
```

---

## 3. Dart Models & API Service Layer

### 3.1 Enums

```dart
// lib/core/models/enums.dart

enum LocationType { HOME, BUSINESS }

enum TankModel { EXCHANGE, REFILL }

enum UsageLevel { LIGHT, MODERATE, HEAVY, VERY_HEAVY }

enum Confidence { LOW, MEDIUM, HIGH }

enum AdjustmentType { COOKED_MORE, COOKED_LESS, NORMAL }

enum LinkMethod { INVITE_LINK, QR_CODE, MANUAL_CODE }

enum LinkStatus { ACTIVE, INACTIVE }

enum OrderStatus {
  PENDING,
  PENDING_SMS,
  CONFIRMED,
  ASSIGNED,
  OUT_FOR_DELIVERY,
  DELIVERED,
  CANCELLED_BY_CUSTOMER,
  CANCELLED_BY_RETAILER,
  REJECTED;

  String get customerLabel {
    switch (this) {
      case PENDING: return 'Waiting for confirmation';
      case CONFIRMED: return 'Confirmed';
      case ASSIGNED: return 'Rider assigned';
      case OUT_FOR_DELIVERY: return 'On the way';
      case DELIVERED: return 'Delivered';
      case CANCELLED_BY_CUSTOMER: return 'You cancelled';
      case CANCELLED_BY_RETAILER: return 'Cancelled by retailer';
      case REJECTED: return 'Rejected';
      case PENDING_SMS: return 'Pending';
    }
  }

  bool get isActive => [PENDING, PENDING_SMS, CONFIRMED, ASSIGNED, OUT_FOR_DELIVERY].contains(this);
  bool get isCancellable => [PENDING, CONFIRMED].contains(this);
}
```

### 3.2 Models (using freezed for immutability + JSON serialization)

```dart
// lib/core/models/user.dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'user.freezed.dart';
part 'user.g.dart';

@freezed
class User with _$User {
  const factory User({
    required String id,
    String? name,
    required String phone,
    required String region,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _User;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
}
```

```dart
// lib/core/models/location.dart
@freezed
class Location with _$Location {
  const factory Location({
    required String id,
    required String userId,
    required String address,
    required LocationType type,
    @Default('Asia/Manila') String timezone,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _Location;

  factory Location.fromJson(Map<String, dynamic> json) => _$LocationFromJson(json);
}
```

```dart
// lib/core/models/tank.dart
@freezed
class Tank with _$Tank {
  const factory Tank({
    required String id,
    required String locationId,
    required double capacityKg,
    @Default('kg') String unit,
    required TankModel model,
    required UsageLevel usageLevel,
    required DateTime lastRefillDate,
    required bool isActive,
    required DateTime createdAt,
    required DateTime updatedAt,
    Location? location,
    Estimation? estimation,
    List<RefillLog>? refillLogs,
  }) = _Tank;

  factory Tank.fromJson(Map<String, dynamic> json) => _$TankFromJson(json);
}

@freezed
class Estimation with _$Estimation {
  const factory Estimation({
    required String id,
    required String tankId,
    required double timeBasedEstimate,
    required double correctionFactor,
    required double calibratedEstimate,
    required Confidence confidence,
    AdjustmentType? currentAdjustment,
    DateTime? adjustmentExpiresAt,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _Estimation;

  factory Estimation.fromJson(Map<String, dynamic> json) => _$EstimationFromJson(json);
}
```

```dart
// lib/core/models/prediction.dart
@freezed
class Prediction with _$Prediction {
  const factory Prediction({
    required String tankId,
    required int daysElapsed,
    required int estimatedTotalDays,
    required int estimatedRemainingDays,
    required DisplayRange displayRange,
    required Confidence confidence,
    required int refillCount,
    AdjustmentType? currentAdjustment,
  }) = _Prediction;

  factory Prediction.fromJson(Map<String, dynamic> json) => _$PredictionFromJson(json);
}

@freezed
class DisplayRange with _$DisplayRange {
  const factory DisplayRange({
    required int low,
    required int high,
  }) = _DisplayRange;

  factory DisplayRange.fromJson(Map<String, dynamic> json) => _$DisplayRangeFromJson(json);
}
```

```dart
// lib/core/models/refill_log.dart
@freezed
class RefillLog with _$RefillLog {
  const factory RefillLog({
    required String id,
    required String tankId,
    required DateTime refillDate,
    int? actualCycleDays,
    required bool isOutlier,
    required bool confirmedByUser,
    required DateTime createdAt,
  }) = _RefillLog;

  factory RefillLog.fromJson(Map<String, dynamic> json) => _$RefillLogFromJson(json);
}
```

```dart
// lib/core/models/order.dart
@freezed
class Order with _$Order {
  const factory Order({
    required String id,
    required String tankId,
    required String customerId,
    required String retailerId,
    String? riderId,
    required OrderStatus status,
    String? note,
    double? capacityKg,
    String? deliveryAddress,
    required double basePrice,
    required double discountAmount,
    required double finalAmount,
    String? paymentStatus,
    String? paymentMethod,
    String? confirmationMethod,
    String? confirmationCode,
    required bool needsReview,
    DateTime? deliveredAt,
    required DateTime createdAt,
    required DateTime updatedAt,
    Tank? tank,
    RetailerPreview? retailer,
    String? statusLabel,
  }) = _Order;

  factory Order.fromJson(Map<String, dynamic> json) => _$OrderFromJson(json);
}
```

```dart
// lib/core/models/retailer.dart
@freezed
class RetailerPreview with _$RetailerPreview {
  const factory RetailerPreview({
    required String id,
    required String businessName,
    String? ownerName,
    String? phone,
    String? address,
    required String city,
    String? inviteCode,
  }) = _RetailerPreview;

  factory RetailerPreview.fromJson(Map<String, dynamic> json) => _$RetailerPreviewFromJson(json);
}

@freezed
class RetailerLink with _$RetailerLink {
  const factory RetailerLink({
    required String linkId,
    required bool isPrimary,
    required RetailerPreview retailer,
    required String linkedDate,
  }) = _RetailerLink;

  factory RetailerLink.fromJson(Map<String, dynamic> json) => _$RetailerLinkFromJson(json);
}
```

```dart
// lib/core/models/auth.dart
@freezed
class AuthResponse with _$AuthResponse {
  const factory AuthResponse({
    required String accessToken,
    required bool isNewUser,
    required User user,
  }) = _AuthResponse;

  factory AuthResponse.fromJson(Map<String, dynamic> json) => _$AuthResponseFromJson(json);
}
```

### 3.3 API Service Layer

**Base API Client (already exists, enhanced):**

```dart
// lib/core/network/api_client.dart
class ApiClient {
  late final Dio _dio;
  final SecureStorageService _storage;

  ApiClient(this._storage) {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConstants.baseUrl,  // http://10.0.2.2:3000/api
      connectTimeout: Duration(seconds: 10),
      receiveTimeout: Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.getToken();
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) {
        if (error.response?.statusCode == 401) {
          // Token expired — clear storage, redirect to login
          _storage.clearAll();
          // Trigger auth state change via Riverpod
        }
        handler.next(error);
      },
    ));
  }

  Future<Response> get(String path, {Map<String, dynamic>? queryParams}) =>
      _dio.get(path, queryParameters: queryParams);

  Future<Response> post(String path, {dynamic data}) =>
      _dio.post(path, data: data);

  Future<Response> patch(String path, {dynamic data}) =>
      _dio.patch(path, data: data);

  Future<Response> delete(String path) =>
      _dio.delete(path);
}
```

**Feature Repositories:**

```dart
// lib/features/auth/data/auth_repository.dart
class AuthRepository {
  final ApiClient _api;
  final SecureStorageService _storage;

  Future<void> sendOtp(String phone);
  Future<AuthResponse> verifyOtp(String phone, String code);
  Future<bool> isLoggedIn();
  Future<void> logout();
}
```

```dart
// lib/features/dashboard/data/tank_repository.dart
class TankRepository {
  final ApiClient _api;

  Future<List<Tank>> getTanks();
  Future<Tank> getTank(String id);
  Future<Tank> createTank({
    required String locationId,
    required double capacityKg,
    required TankModel model,
    required UsageLevel usageLevel,
  });
  Future<Tank> updateTank(String id, Map<String, dynamic> data);
  Future<void> deleteTank(String id);
  Future<Prediction> getPrediction(String tankId);
  Future<Prediction> adjustTank(String tankId, AdjustmentType adjustment);
}
```

```dart
// lib/features/refill/data/refill_repository.dart
class RefillRepository {
  final ApiClient _api;

  Future<RefillLog> logRefill({
    required String tankId,
    DateTime? refillDate,
    bool? confirmOutlier,
  });
  Future<List<RefillLog>> getRefillHistory(String tankId);
  Future<RefillLog> confirmOutlier(String refillId);
}
```

```dart
// lib/features/orders/data/order_repository.dart
class OrderRepository {
  final ApiClient _api;

  Future<Order> createOrder({
    required String tankId,
    required String retailerId,
    String? note,
    double? capacityKg,
    String? deliveryAddress,
  });
  Future<List<Order>> getOrders();
  Future<Order> getOrder(String id);
  Future<Order> cancelOrder(String id);
}
```

```dart
// lib/features/retailer_link/data/linking_repository.dart
class LinkingRepository {
  final ApiClient _api;

  Future<RetailerPreview> lookupRetailer(String code);
  Future<RetailerLink> linkRetailer(String code, LinkMethod method);
  Future<void> unlinkRetailer(String retailerId);
  Future<List<RetailerLink>> getLinkedRetailers();
  Future<void> setPrimaryRetailer(String retailerId);
}
```

```dart
// lib/features/settings/data/user_repository.dart
class UserRepository {
  final ApiClient _api;

  Future<User> getProfile();
  Future<User> updateProfile({String? name, String? region});
}
```

```dart
// lib/core/services/notification_service.dart
class NotificationService {
  final ApiClient _api;

  Future<void> registerDeviceToken(String token, String platform);
  Future<void> removeDeviceToken(String token);
  Future<void> initializeFCM();  // Request permissions, get token, register
}
```

### 3.4 Riverpod Provider Architecture

```
                    ┌─────────────┐
                    │  ApiClient   │
                    │  (Provider)  │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────┴─────┐   ┌─────┴─────┐   ┌─────┴─────┐
    │   Auth    │   │   Tank    │   │  Order    │
    │   Repo    │   │   Repo    │   │  Repo     │
    │(Provider) │   │(Provider) │   │(Provider) │
    └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
          │                │                │
    ┌─────┴─────┐   ┌─────┴─────┐   ┌─────┴─────┐
    │   Auth    │   │ Dashboard │   │  Orders   │
    │  Notifier │   │  Notifier │   │ Notifier  │
    │(StateNot.)│   │(StateNot.)│   │(StateNot.)│
    └───────────┘   └───────────┘   └───────────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
                    ┌──────┴──────┐
                    │   UI Layer  │
                    │  (Screens)  │
                    └─────────────┘
```

```dart
// lib/core/providers/core_providers.dart

final secureStorageProvider = Provider((ref) => SecureStorageService());

final apiClientProvider = Provider((ref) {
  final storage = ref.read(secureStorageProvider);
  return ApiClient(storage);
});

final offlineQueueProvider = Provider((ref) => OfflineQueue());

final connectivityProvider = StreamProvider((ref) {
  return Connectivity().onConnectivityChanged;
});

// Feature repositories
final authRepoProvider = Provider((ref) =>
    AuthRepository(ref.read(apiClientProvider), ref.read(secureStorageProvider)));

final tankRepoProvider = Provider((ref) =>
    TankRepository(ref.read(apiClientProvider)));

final refillRepoProvider = Provider((ref) =>
    RefillRepository(ref.read(apiClientProvider)));

final orderRepoProvider = Provider((ref) =>
    OrderRepository(ref.read(apiClientProvider)));

final linkingRepoProvider = Provider((ref) =>
    LinkingRepository(ref.read(apiClientProvider)));

final userRepoProvider = Provider((ref) =>
    UserRepository(ref.read(apiClientProvider)));
```

---

## 4. Offline & Caching Strategy

### 4.1 Overview

The app operates in areas where mobile connectivity can be unreliable. The offline strategy ensures:
- Users can always **view** their tank status and predictions
- Users can **queue actions** (refills, orders, adjustments) while offline
- The app **automatically syncs** when back online
- Users are **clearly informed** when viewing cached data

### 4.2 Architecture

```
┌─────────────────────────────────────────────────┐
│                    UI Layer                      │
│  (Shows cached data + offline indicator)         │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│              Repository Layer                    │
│  (Decides: fetch from API or read from cache)    │
└───────┬──────────────────────────┬──────────────┘
        │                          │
┌───────┴───────┐          ┌──────┴───────┐
│   ApiClient   │          │  CacheStore  │
│   (Dio/HTTP)  │          │  (SQLite)    │
└───────┬───────┘          └──────┬───────┘
        │                         │
┌───────┴───────┐          ┌──────┴───────┐
│   Network     │          │  OfflineQueue│
│   (Internet)  │          │  (SQLite)    │
└───────────────┘          └──────────────┘
```

### 4.3 SQLite Database Schema

```sql
-- Cache table: stores API responses for offline reads
CREATE TABLE cache (
  key TEXT PRIMARY KEY,          -- e.g., 'tanks', 'prediction_abc123', 'orders'
  data TEXT NOT NULL,            -- JSON-encoded response body
  cached_at INTEGER NOT NULL,   -- Unix timestamp
  ttl_seconds INTEGER NOT NULL  -- Time-to-live (how long before stale)
);

-- Offline queue: stores mutations to replay when online
CREATE TABLE offline_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  method TEXT NOT NULL,         -- 'POST', 'PATCH', 'DELETE'
  endpoint TEXT NOT NULL,       -- '/refills', '/orders', '/tanks/abc/adjust'
  body TEXT,                    -- JSON-encoded request body (null for DELETE)
  created_at INTEGER NOT NULL,  -- Unix timestamp (for ordering)
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending' -- 'pending', 'in_progress', 'failed', 'completed'
);
```

### 4.4 Cache Strategy Per Data Type

| Data | Cache Key | TTL | Strategy |
|------|-----------|-----|----------|
| **Tank list** | `tanks` | 1 hour | Cache-then-network: show cached immediately, refresh in background |
| **Prediction** | `prediction_{tankId}` | 30 min | Cache-then-network: stale predictions are still useful |
| **Orders** | `orders` | 15 min | Network-first: orders change frequently, fall back to cache |
| **Refill history** | `refills_{tankId}` | 1 hour | Cache-then-network: history rarely changes |
| **Linked retailers** | `linked_retailers` | 6 hours | Cache-first: rarely changes |
| **User profile** | `user_profile` | 24 hours | Cache-first: almost never changes |
| **Retailer preview** | `retailer_{code}` | 24 hours | Cache-first: static data |

### 4.5 Fetch Strategies

**Cache-Then-Network (default for reads):**
```dart
Future<List<Tank>> getTanks() async {
  // 1. Return cached data immediately (if available)
  final cached = await _cache.get('tanks');
  if (cached != null) {
    _emitCachedState(cached);  // Show to user immediately
  }

  // 2. Fetch fresh data from network
  try {
    final response = await _api.get('/tanks');
    final tanks = (response.data as List).map((t) => Tank.fromJson(t)).toList();

    // 3. Update cache
    await _cache.set('tanks', jsonEncode(response.data), ttl: 3600);

    return tanks;
  } on DioException {
    // 4. If network fails, return cached (already emitted above)
    if (cached != null) {
      return (jsonDecode(cached) as List).map((t) => Tank.fromJson(t)).toList();
    }
    rethrow;  // No cache and no network = real error
  }
}
```

**Network-First (for frequently changing data):**
```dart
Future<List<Order>> getOrders() async {
  try {
    // 1. Try network first
    final response = await _api.get('/orders');
    final orders = (response.data as List).map((o) => Order.fromJson(o)).toList();

    // 2. Update cache on success
    await _cache.set('orders', jsonEncode(response.data), ttl: 900);

    return orders;
  } on DioException {
    // 3. Fall back to cache
    final cached = await _cache.get('orders');
    if (cached != null) {
      return (jsonDecode(cached) as List).map((o) => Order.fromJson(o)).toList();
    }
    rethrow;
  }
}
```

### 4.6 Offline Queue (Mutations)

When offline, mutations are queued and replayed in order:

```dart
class OfflineQueue {
  final Database _db;

  /// Enqueue a mutation for later execution
  Future<void> enqueue({
    required String method,
    required String endpoint,
    Map<String, dynamic>? body,
  }) async {
    await _db.insert('offline_queue', {
      'method': method,
      'endpoint': endpoint,
      'body': body != null ? jsonEncode(body) : null,
      'created_at': DateTime.now().millisecondsSinceEpoch,
      'status': 'pending',
    });
  }

  /// Process all pending items (called when connectivity restored)
  Future<QueueSyncResult> processQueue(ApiClient api) async {
    final pending = await _db.query(
      'offline_queue',
      where: 'status = ?',
      whereArgs: ['pending'],
      orderBy: 'created_at ASC',
    );

    int succeeded = 0;
    int failed = 0;

    for (final item in pending) {
      try {
        await _executeItem(api, item);
        await _markCompleted(item['id']);
        succeeded++;
      } catch (e) {
        final retries = item['retry_count'] as int;
        if (retries >= (item['max_retries'] as int)) {
          await _markFailed(item['id']);
          failed++;
        } else {
          await _incrementRetry(item['id']);
        }
      }
    }

    // Clean up completed items older than 24h
    await _cleanup();

    return QueueSyncResult(succeeded: succeeded, failed: failed);
  }

  Future<void> _executeItem(ApiClient api, Map<String, dynamic> item) async {
    final method = item['method'] as String;
    final endpoint = item['endpoint'] as String;
    final body = item['body'] != null ? jsonDecode(item['body'] as String) : null;

    switch (method) {
      case 'POST':
        await api.post(endpoint, data: body);
      case 'PATCH':
        await api.patch(endpoint, data: body);
      case 'DELETE':
        await api.delete(endpoint);
    }
  }
}
```

### 4.7 Queueable Actions

| Action | Endpoint | Queueable? | Notes |
|--------|----------|-----------|-------|
| Log refill | `POST /refills` | Yes | Queue with date; sync later |
| Adjust tank | `POST /tanks/:id/adjust` | Yes | Only latest adjustment matters; deduplicate |
| Create order | `POST /orders` | Yes | Show as "Pending (will send when online)" |
| Cancel order | `PATCH /orders/:id/cancel` | Yes | Queue cancel |
| Register device token | `POST /notifications/device-token` | Yes | Queue silently |
| Update profile | `PATCH /users/me` | Yes | Queue; last-write-wins |

**Not queueable (require immediate feedback):**
| Action | Why |
|--------|-----|
| Send OTP | Requires server to send SMS |
| Verify OTP | Requires server validation |
| Look up retailer | Needs real-time data |
| Link retailer | Needs server confirmation |

### 4.8 Connectivity Monitoring

```dart
class ConnectivityService {
  final Connectivity _connectivity = Connectivity();
  final OfflineQueue _queue;
  final ApiClient _api;

  StreamSubscription? _subscription;
  bool _isOnline = true;

  bool get isOnline => _isOnline;

  void initialize() {
    _subscription = _connectivity.onConnectivityChanged.listen((results) async {
      final wasOffline = !_isOnline;
      _isOnline = results.any((r) => r != ConnectivityResult.none);

      if (_isOnline && wasOffline) {
        // Just came back online — process queue
        await _queue.processQueue(_api);
      }
    });
  }

  void dispose() {
    _subscription?.cancel();
  }
}
```

### 4.9 UI Offline Indicators

**Offline Banner (shown on all screens when offline):**
```dart
class OfflineBanner extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final connectivity = ref.watch(connectivityProvider);

    return connectivity.when(
      data: (results) {
        final isOffline = results.every((r) => r == ConnectivityResult.none);
        if (!isOffline) return SizedBox.shrink();

        return Container(
          color: Colors.orange.shade100,
          padding: EdgeInsets.symmetric(vertical: 4, horizontal: 16),
          child: Row(
            children: [
              Icon(Icons.cloud_off, size: 16),
              SizedBox(width: 8),
              Text('You\'re offline. Showing cached data.'),
            ],
          ),
        );
      },
      loading: () => SizedBox.shrink(),
      error: (_, __) => SizedBox.shrink(),
    );
  }
}
```

**Queued Action Indicator (on orders screen):**
```
┌─────────────────────────────────┐
│ ⏳ QUEUED                       │
│ 11 kg • Gas Express             │
│ Will send when back online      │
└─────────────────────────────────┘
```

### 4.10 Cache Invalidation Rules

| Event | Invalidate |
|-------|-----------|
| Refill logged | `tanks`, `prediction_{tankId}`, `refills_{tankId}` |
| Adjustment made | `prediction_{tankId}` |
| Order created | `orders` |
| Order cancelled | `orders` |
| Retailer linked/unlinked | `linked_retailers` |
| Profile updated | `user_profile` |
| App foregrounded | All caches older than TTL |
| Pull-to-refresh | Current screen's cache |
| Queue sync completed | All related caches |

### 4.11 Storage Size Management

```dart
class CacheStore {
  static const int maxCacheSizeMB = 10;

  /// Evict oldest entries when cache exceeds size limit
  Future<void> evictIfNeeded() async {
    final size = await _getDatabaseSizeMB();
    if (size > maxCacheSizeMB) {
      // Delete entries oldest-first until under limit
      await _db.execute('''
        DELETE FROM cache
        WHERE key IN (
          SELECT key FROM cache
          ORDER BY cached_at ASC
          LIMIT 50
        )
      ''');
    }
  }

  /// Clear all cache (settings option)
  Future<void> clearAll() async {
    await _db.delete('cache');
  }
}
```

---

## Appendix: Complete API Response Reference

### Auth
```
POST /auth/send-otp
  Request:  { phone: string }
  Response: { message: string }

POST /auth/verify-otp
  Request:  { phone: string, code: string (6 digits) }
  Response: { accessToken: string, isNewUser: boolean, user: User }
```

### Users
```
GET  /users/me         → User
PATCH /users/me        → User
  Request: { name?: string, region?: string }
```

### Tanks
```
POST   /tanks          → Tank
  Request: { locationId, capacityKg, model, usageLevel, unit? }
GET    /tanks          → Tank[] (with location + estimation)
GET    /tanks/:id      → Tank (with location + estimation + refillLogs[last 10])
PATCH  /tanks/:id      → Tank
DELETE /tanks/:id      → Tank

GET    /tanks/:id/prediction → Prediction
  { tankId, daysElapsed, estimatedTotalDays, estimatedRemainingDays,
    displayRange: { low, high }, confidence, refillCount, currentAdjustment }

POST   /tanks/:id/adjust    → Prediction
  Request: { adjustment: "COOKED_MORE" | "COOKED_LESS" | "NORMAL" }
```

### Refills
```
POST /refills               → RefillLog
  Request: { tankId, refillDate?, confirmOutlier? }

GET  /refills/tank/:tankId  → RefillLog[]

PATCH /refills/:id/confirm  → RefillLog
```

### Orders
```
POST  /orders          → Order (with tank, customer, retailer)
  Request: { tankId, retailerId, note?, capacityKg?, deliveryAddress? }

GET   /orders          → Order[] (with tank, retailer, statusLabel)
GET   /orders/:id      → Order (with tank, customer, retailer)

PATCH /orders/:id/cancel → Order
```

### Linking
```
GET  /link/retailer/:code        → { id, businessName, city }
POST /link/retailer              → RetailerLink
  Request: { code, method: "INVITE_LINK" | "QR_CODE" | "MANUAL_CODE" }

GET    /link/retailers           → RetailerLink[]
  Each: { linkId, isPrimary, retailer: { id, businessName, city, phone, address }, linkedDate }

DELETE /link/retailer/:retailerId → RetailerLink (status: INACTIVE)
PATCH  /link/retailer/:retailerId/primary → RetailerLink (isPrimary: true)
```

### Notifications
```
POST   /notifications/device-token      → DeviceToken
  Request: { token, platform }

DELETE /notifications/device-token/:token → { count }
```

### Discounts
```
GET /discounts/tiers → { tiers: [{daysBeforeEmpty, discountAmount}], preemptlyZoneDays, discountsEnabled }
```
