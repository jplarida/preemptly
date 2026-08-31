# Chunk 1 — Auth Guard + Shared Widgets + Token Cleanup

> Part of the Mobile App Completion Plan (7 chunks)
> Status: Planned
> Last updated: 2026-04-06

## Context

The app always starts at `/login` regardless of stored JWT. A logged-in user must re-login every cold start. `ApiClient` and `SecureStorageService` both create their own `FlutterSecureStorage` instances using the same `'access_token'` key — `SecureStorageService` is registered but never used. No shared widgets exist — every screen reinvents loading/error/empty inline.

---

## Step 1: Token Storage Consolidation

**Problem:** `ApiClient` (line 7) creates `const FlutterSecureStorage()` internally. `SecureStorageService` does the same. Two instances, same key, no single source of truth.

**Change:** Make `ApiClient` accept `SecureStorageService` via constructor instead of owning its own storage.

### `core/network/api_client.dart`

```dart
import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import '../storage/secure_storage.dart';

class ApiClient {
  late final Dio _dio;
  final SecureStorageService _storage;

  ApiClient(this._storage) {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: ApiConstants.connectTimeout,
      receiveTimeout: ApiConstants.receiveTimeout,
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
        handler.next(error);
      },
    ));
  }

  Dio get dio => _dio;

  Future<void> setToken(String token) => _storage.saveToken(token);
  Future<void> clearToken() => _storage.deleteToken();
  Future<String?> getToken() => _storage.getToken();
}
```

**Key:** `setToken`/`clearToken`/`getToken` now delegate to `SecureStorageService`. No call sites change — `AuthRepository` still calls `api.setToken(token)` and it works.

### `core/providers/core_providers.dart`

```dart
final secureStorageProvider = Provider<SecureStorageService>((ref) => SecureStorageService());
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient(ref.read(secureStorageProvider)));
final offlineQueueProvider = Provider<OfflineQueue>((ref) => OfflineQueue());
```

Order matters: `secureStorageProvider` declared before `apiClientProvider` so the injection is clear.

**Files modified:**
- `apps/mobile/lib/core/network/api_client.dart`
- `apps/mobile/lib/core/providers/core_providers.dart`

**No changes needed to:** `auth_repository.dart`, `dashboard_repository.dart`, `orders_repository.dart` — they all go through `apiClientProvider` which still exposes the same API.

---

## Step 2: Auth Guard in Router

**Problem:** `initialLocation: '/login'` always. No `redirect`. `AuthNotifier.checkAuth()` exists but is never called from the router.

**Approach:** Use GoRouter's `redirect` callback with an async token check via `SecureStorageService`. The router needs to know if a token exists — it does NOT need the full `AuthState` (that would create circular refresh issues). A simple `getToken()` check is sufficient.

### `router/app_router.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/providers/core_providers.dart';
import '../features/auth/presentation/screens/phone_input_screen.dart';
import '../features/auth/presentation/screens/otp_screen.dart';
import '../features/onboarding/presentation/screens/tank_setup_screen.dart';
import '../features/dashboard/presentation/screens/home_screen.dart';
import '../features/orders/presentation/screens/create_order_screen.dart';
import '../features/orders/presentation/screens/order_history_screen.dart';
import '../features/retailer_link/presentation/screens/link_retailer_screen.dart';
import '../features/settings/presentation/screens/settings_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final storage = ref.read(secureStorageProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) async {
      final token = await storage.getToken();
      final isLoggedIn = token != null;
      final isAuthRoute = state.matchedLocation == '/login' || state.matchedLocation == '/otp';

      // Not logged in — force to login (unless already there)
      if (!isLoggedIn && !isAuthRoute) return '/login';

      // Logged in but on auth route — send to home
      if (isLoggedIn && isAuthRoute) return '/home';

      // Otherwise — no redirect
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const PhoneInputScreen()),
      GoRoute(path: '/otp', builder: (_, __) => const OtpScreen()),
      GoRoute(path: '/onboarding', builder: (_, __) => const TankSetupScreen()),
      GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
      GoRoute(path: '/orders/create', builder: (_, __) => const CreateOrderScreen()),
      GoRoute(path: '/orders/history', builder: (_, __) => const OrderHistoryScreen()),
      GoRoute(path: '/link-retailer', builder: (_, __) => const LinkRetailerScreen()),
      GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
    ],
  );
});
```

**Why this approach over a RouterNotifier/ChangeNotifier pattern:**
- Simpler. The redirect only needs to check if a token exists — it doesn't need to reactively watch auth state changes.
- The existing `context.go('/login')` call in `settings_screen.dart` logout already handles the post-logout redirect.
- The existing `context.go('/home')` and `context.go('/onboarding')` in `otp_screen.dart` already handle post-login redirects.
- The guard only prevents deep-link or cold-start access to protected routes. It's not meant to replace the explicit navigations.

**Trade-off:** `/onboarding` is accessible to logged-in users (the redirect doesn't block it). This is correct — `otp_screen.dart` navigates there for new users, and the onboarding flow calls the API which requires auth.

**Files modified:**
- `apps/mobile/lib/router/app_router.dart`

---

## Step 3: Shared Widgets

Create 3 reusable widgets that match existing app patterns (Material 3, `AppColors`, same sizing as current inline implementations).

### `lib/shared/widgets/loading_widget.dart`

```dart
import 'package:flutter/material.dart';

class LoadingWidget extends StatelessWidget {
  final String? message;

  const LoadingWidget({super.key, this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(),
          if (message != null) ...[
            const SizedBox(height: 16),
            Text(message!, style: TextStyle(color: Colors.grey.shade600)),
          ],
        ],
      ),
    );
  }
}
```

Replaces the pattern used in `home_screen.dart:36`, `create_order_screen.dart`, `order_history_screen.dart`.

### `lib/shared/widgets/app_error_widget.dart`

```dart
import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

class AppErrorWidget extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const AppErrorWidget({super.key, required this.message, this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: Colors.grey.shade400),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textSecondary),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              OutlinedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
```

Named `AppErrorWidget` to avoid shadowing Flutter's built-in `ErrorWidget`.

### `lib/shared/widgets/empty_state_widget.dart`

```dart
import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';

class EmptyStateWidget extends StatelessWidget {
  final IconData icon;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  const EmptyStateWidget({
    super.key,
    required this.icon,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 80, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          Text(message, style: const TextStyle(color: AppColors.textSecondary)),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: 16),
            ElevatedButton(onPressed: onAction, child: Text(actionLabel!)),
          ],
        ],
      ),
    );
  }
}
```

Replaces the inline empty state in `home_screen.dart:44-56` (propane icon + "No tanks set up yet" + button).

**Files created:**
- `apps/mobile/lib/shared/widgets/loading_widget.dart`
- `apps/mobile/lib/shared/widgets/app_error_widget.dart`
- `apps/mobile/lib/shared/widgets/empty_state_widget.dart`

**NOT changing screens in this chunk** — the widgets are created and ready. Screens will adopt them incrementally in Chunk 4+ to keep this chunk small and focused.

---

## Summary of Changes

| File | Action | What Changes |
|------|--------|-------------|
| `core/network/api_client.dart` | Modify | Accept `SecureStorageService` via constructor, delegate token ops |
| `core/providers/core_providers.dart` | Modify | Inject `secureStorageProvider` into `ApiClient`, reorder declarations |
| `router/app_router.dart` | Modify | Add `redirect` callback with token check |
| `shared/widgets/loading_widget.dart` | Create | Reusable centered loading spinner with optional message |
| `shared/widgets/app_error_widget.dart` | Create | Error display with icon + message + optional retry button |
| `shared/widgets/empty_state_widget.dart` | Create | Empty state with icon + message + optional action button |

**Total: 3 files modified, 3 files created. Zero breaking changes to existing screens.**

## Verification

1. `flutter analyze` — no errors
2. Cold start with no stored token -> lands on `/login`
3. Login -> navigate to `/home` -> kill app -> reopen -> lands on `/home` (not `/login`)
4. Logout from settings -> lands on `/login` -> back button cannot reach `/home`
5. Shared widgets importable from any screen (verify with a test import)
