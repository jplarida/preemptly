---
name: mobile-app
description: Flutter consumer mobile app — structure, patterns, navigation, what's done vs missing
type: reference
last_updated: 2026-06-17
---

## Stack

- **Framework**: Flutter (iOS + Android)
- **State**: Riverpod (StateNotifier pattern)
- **Navigation**: GoRouter (8 routes currently, ShellRoute not yet added)
- **HTTP**: Dio + JWT interceptor
- **Storage**: `flutter_secure_storage` (JWT), SQLite (`sqflite`) for cache + offline queue
- **Models**: `freezed` + `json_serializable` (NOT YET generated — build_runner required)
- **Theme**: Material3 (`app_theme.dart`, `app_colors.dart`)

---

## Project Structure (`apps/mobile/lib/`)

```
lib/
├── main.dart                     ✅ Entry point with ProviderScope
├── core/
│   ├── constants/
│   │   └── api_constants.dart    ✅ Base URL config
│   ├── network/
│   │   ├── api_client.dart       ✅ Dio + JWT interceptor
│   │   ├── offline_queue.dart    ✅ SQLite offline queue (enqueue/processQueue)
│   │   └── connectivity_service.dart  ❌ MISSING — monitors online/offline
│   ├── storage/
│   │   └── secure_storage.dart   ✅ Token storage
│   ├── providers/
│   │   └── core_providers.dart   ✅ Riverpod providers (apiClient, offlineQueue, etc.)
│   ├── models/                   ❌ MISSING — all freezed models
│   │   ├── user.dart
│   │   ├── tank.dart             // includes Estimation
│   │   ├── prediction.dart       // includes DisplayRange
│   │   ├── order.dart
│   │   ├── retailer.dart         // RetailerPreview + RetailerLink
│   │   ├── refill_log.dart
│   │   ├── location.dart
│   │   └── enums.dart            // OrderStatus, UsageLevel, Confidence, etc.
│   ├── services/
│   │   └── notification_service.dart  ❌ MISSING — FCM setup + token registration
│   ├── theme/
│   │   ├── app_theme.dart        ✅
│   │   └── app_colors.dart       ✅
│   └── router/
│       └── app_router.dart       ✅ GoRouter (8 routes, no ShellRoute yet)
├── features/
│   ├── auth/
│   │   ├── data/
│   │   │   └── auth_repository.dart     ✅
│   │   └── presentation/
│   │       ├── providers/auth_provider.dart  ✅ AuthState notifier
│   │       └── screens/
│   │           ├── phone_input_screen.dart   ✅
│   │           └── otp_screen.dart           ✅
│   ├── dashboard/
│   │   ├── data/
│   │   │   └── dashboard_repository.dart    ✅ tanks + prediction
│   │   └── presentation/
│   │       ├── providers/dashboard_provider.dart  ✅
│   │       └── screens/home_screen.dart          ✅ circular gauge
│   │       └── widgets/                          ❌ MISSING
│   │           ├── gas_gauge_widget.dart
│   │           ├── tank_card_widget.dart
│   │           ├── adjustment_card.dart
│   │           └── offline_banner.dart
│   ├── onboarding/
│   │   └── presentation/screens/
│   │       └── tank_setup_screen.dart   ✅ 3-step wizard
│   ├── orders/
│   │   ├── data/orders_repository.dart      ✅
│   │   └── presentation/screens/
│   │       ├── create_order_screen.dart     ✅
│   │       ├── order_history_screen.dart    ✅
│   │       └── order_detail_screen.dart     ❌ MISSING — timeline view
│   ├── retailer_link/
│   │   └── presentation/screens/
│   │       ├── link_retailer_screen.dart    ✅ manual code entry
│   │       └── qr_scanner_screen.dart       ❌ MISSING — camera QR scan
│   ├── refill/                              ❌ ENTIRE FEATURE MISSING
│   │   ├── data/refill_repository.dart
│   │   └── presentation/
│   │       ├── providers/refill_provider.dart
│   │       └── screens/
│   │           ├── refill_screen.dart
│   │           └── outlier_confirm_screen.dart
│   └── settings/
│       └── presentation/screens/
│           └── settings_screen.dart   ✅ (basic)
└── shared/
    └── widgets/                       ❌ MISSING
        ├── loading_overlay.dart
        ├── error_widget.dart
        └── empty_state_widget.dart
```

---

## Navigation (GoRouter)

**Current routes (8):**
`/login`, `/otp`, `/onboarding`, `/home`, `/orders/create`, `/orders/history`, `/link-retailer`, `/settings`

**Missing routes (need ShellRoute for bottom nav):**
`/` (splash), `/refill`, `/refill/confirm`, `/orders/:id`, `/link-retailer/qr`, `/profile`, `/profile/edit`, `/tank/:id`, `/tank/add`

**Bottom nav (3 tabs):** Home → `/home`, Orders → `/orders`, Me → `/profile`

ShellRoute wraps the 3 tabs with `MainShell` widget containing `BottomNavigationBar`.

---

## Riverpod Provider Architecture

```
ApiClient (Provider)
  ├── AuthRepository → AuthNotifier (StateNotifier)
  ├── TankRepository → DashboardNotifier (StateNotifier)
  ├── RefillRepository → RefillNotifier (StateNotifier)
  ├── OrderRepository → OrdersNotifier (StateNotifier)
  ├── LinkingRepository
  └── UserRepository
```

All repositories take `ApiClient` as dependency. Connectivity is a `StreamProvider` wrapping `Connectivity().onConnectivityChanged`.

---

## Offline Strategy

| Data | Cache Key | TTL | Strategy |
|------|-----------|-----|----------|
| Tanks | `tanks` | 1h | Cache-then-network |
| Prediction | `prediction_{tankId}` | 30m | Cache-then-network |
| Orders | `orders` | 15m | Network-first |
| Refill history | `refills_{tankId}` | 1h | Cache-then-network |
| Linked retailers | `linked_retailers` | 6h | Cache-first |
| User profile | `user_profile` | 24h | Cache-first |

**Mutations queue in SQLite** (`offline_queue` table): method, endpoint, body, created_at, retry_count, status.
**Queue processes on connectivity restore** in `created_at ASC` order.

**Queueable:** logRefill, adjustTank, createOrder, cancelOrder, registerDeviceToken, updateProfile
**Not queueable:** sendOtp, verifyOtp, lookupRetailer, linkRetailer

---

## Key Enums (in `lib/core/models/enums.dart`)

```dart
enum LocationType { HOME, BUSINESS }
enum TankModel { EXCHANGE, REFILL }
enum UsageLevel { LIGHT, MODERATE, HEAVY, VERY_HEAVY }
enum Confidence { LOW, MEDIUM, HIGH }
enum AdjustmentType { COOKED_MORE, COOKED_LESS, NORMAL }
enum LinkMethod { INVITE_LINK, QR_CODE, MANUAL_CODE }
enum LinkStatus { ACTIVE, INACTIVE }
enum OrderStatus {
  PENDING, PENDING_SMS, CONFIRMED, ASSIGNED,
  OUT_FOR_DELIVERY, DELIVERED,
  CANCELLED_BY_CUSTOMER, CANCELLED_BY_RETAILER, REJECTED
}
```

---

## Dashboard UI States

- **New user (LOW confidence):** circular gauge shows days elapsed / estimated total, "Getting to know your usage" badge, adjustment card visible
- **Calibrated (HIGH confidence):** same gauge with tighter range, green confidence badge, no adjustment card
- **Running low (≤5 days or ≤15%):** gauge turns red, "ORDER GAS NOW" button prominent
- **Color coding:** Green >50%, Yellow 25–50%, Orange 10–25%, Red <10%
