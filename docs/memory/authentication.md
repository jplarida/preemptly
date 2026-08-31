---
name: authentication
description: PreEmplty auth flows — phone OTP, JWT, role scopes, consumer/retailer/rider separation
type: reference
last_updated: 2026-06-17
---

## Overview

Phone OTP only. No passwords. Philippines (+63) in Phase 1.
Three separate auth roles: **Consumer**, **Retailer**, **Rider**.

---

## Consumer Auth Flow

1. `POST /auth/send-otp` — sends 6-digit OTP via Semaphore SMS
2. `POST /auth/verify-otp` — validates code, returns `{ accessToken, isNewUser, user }`
3. Store JWT in `flutter_secure_storage`
4. Add `Authorization: Bearer <token>` to all subsequent requests

**isNewUser routing:**
- `true` → `/onboarding` (TankSetupScreen)
- `false` → `/home`

**Token expiry:** On 401 from API, clear token + redirect to `/login`.

---

## JWT Interceptor (Dio)

```dart
// In ApiClient — already implemented
onRequest: async (options, handler) {
  final token = await _storage.getToken();
  if (token != null) options.headers['Authorization'] = 'Bearer $token';
  handler.next(options);
},
onError: (error, handler) {
  if (error.response?.statusCode == 401) {
    _storage.clearAll();
    // Trigger auth state change via Riverpod → redirect to login
  }
  handler.next(error);
}
```

---

## Role Separation

- **Consumer** tokens only access consumer endpoints (`/tanks`, `/refills`, `/orders`, `/link`, `/notifications`, `/users/me`, `/discounts/tiers`)
- **Retailer** tokens only access retailer dashboard endpoints (orders management, customer list, rider management, settings)
- **Rider** tokens only access rider endpoints (assigned orders, delivery confirmation)

The mobile consumer app only handles Consumer auth. Retailer and Rider have separate apps / the web dashboard.

---

## OTP Details

- Provider: Semaphore (Philippines SMS gateway) — **not yet integrated in Phase 1 integration**
- OTP length: 6 digits
- Expiry: stored in `OtpCode.expiresAt` on DB
- Resend cooldown: 60 seconds (enforced on mobile UI, not yet rate-limited on backend)
- Rate limiting: planned, not yet implemented

---

## Deep Link Handling

URL pattern: `app.preemplty.com/join/{code}` — opens retailer linking screen with invite code pre-filled.

```dart
GoRoute(
  path: '/join/:code',
  redirect: (context, state) {
    final code = state.pathParameters['code'];
    return '/profile/link-retailer?code=$code';
  },
)
```
