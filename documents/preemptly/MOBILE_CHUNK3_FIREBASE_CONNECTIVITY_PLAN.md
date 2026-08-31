# Chunk 3 — Firebase + Connectivity + Environment Config

> Part of the Mobile App Completion Plan (7 chunks)
> Depends on: Chunk 2 (bottom nav / ShellRoute)
> Status: Planned
> Last updated: 2026-04-06

## Context

Firebase is listed in `pubspec.yaml` (`firebase_core: ^3.12.1`, `firebase_messaging: ^15.2.4`) but never initialized in `main.dart`. No `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) config files exist yet. `connectivity_plus: ^6.1.3` is also in pubspec but never imported anywhere. The API base URL is hardcoded to `http://10.0.2.2:3000/api` (Android emulator only).

This chunk sets up the infrastructure that Chunk 4 (offline queue) and Chunk 5 (notifications) depend on.

---

## Step 1: Environment Config for Base URL

**Problem:** `ApiConstants.baseUrl` is hardcoded to `http://10.0.2.2:3000/api`. Can't test on a real device or point to a production server without editing source code.

**Change:** Use Dart's `String.fromEnvironment` for build-time configuration with the current value as the default.

### `core/constants/api_constants.dart`

```dart
class ApiConstants {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000/api',
  );
  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 15);
}
```

**Usage:**
```bash
# Default (emulator)
flutter run

# Real device on local network
flutter run --dart-define=API_BASE_URL=http://192.168.1.100:3000/api

# Production
flutter run --dart-define=API_BASE_URL=https://api.preemptly.com/api
```

**Files modified:**
- `apps/mobile/lib/core/constants/api_constants.dart`

---

## Step 2: Firebase Initialization

**Problem:** `main.dart` doesn't call `Firebase.initializeApp()`. Push notifications (Chunk 5) and any future Firebase features won't work.

**Approach:** Initialize Firebase in `main()` with a try/catch so the app still works during development when config files are missing.

### `lib/main.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'core/theme/app_theme.dart';
import 'router/app_router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase — wrapped in try/catch so the app still
  // runs during development when google-services.json is missing
  try {
    await Firebase.initializeApp();
  } catch (e) {
    debugPrint('Firebase init failed (config missing?): $e');
  }

  runApp(const ProviderScope(child: PreEmptlyApp()));
}

class PreEmptlyApp extends ConsumerWidget {
  const PreEmptlyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'PreEmptly',
      theme: AppTheme.lightTheme,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
```

**Changes from current:**
- Added `async` to `main()`
- Added `firebase_core` import
- Added `Firebase.initializeApp()` in try/catch
- Added `debugPrint` for failure visibility during dev

**Firebase config files (manual setup, outside this chunk's code scope):**

When ready to enable Firebase, the developer must:
1. Create a Firebase project at https://console.firebase.google.com
2. Register Android app (`com.preemptly.preemptly_mobile`) and download `google-services.json` to `apps/mobile/android/app/`
3. Register iOS app and download `GoogleService-Info.plist` to `apps/mobile/ios/Runner/`
4. Add Firebase Gradle plugin to `android/app/build.gradle`:
   ```gradle
   plugins {
       id "com.android.application"
       id "kotlin-android"
       id "dev.flutter.flutter-gradle-plugin"
       id "com.google.gms.google-services"  // ADD THIS
   }
   ```
5. Add to `android/build.gradle` (project-level):
   ```gradle
   buildscript {
       dependencies {
           classpath 'com.google.gms:google-services:4.4.0'
       }
   }
   ```

Until these files are added, the try/catch ensures the app runs normally without Firebase.

**Files modified:**
- `apps/mobile/lib/main.dart`

---

## Step 3: Connectivity Service

**Problem:** No network awareness anywhere. The app throws unhandled `DioException`s when offline with no user-visible fallback. Chunk 4 needs connectivity state to decide whether to enqueue offline or call the API.

**Change:** Create a `ConnectivityNotifier` using `connectivity_plus` that exposes a `bool isOnline` state.

### `lib/core/services/connectivity_service.dart`

```dart
import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ConnectivityNotifier extends StateNotifier<bool> {
  final Connectivity _connectivity;
  StreamSubscription<List<ConnectivityResult>>? _subscription;

  ConnectivityNotifier(this._connectivity) : super(true) {
    _init();
  }

  Future<void> _init() async {
    // Get initial status
    final result = await _connectivity.checkConnectivity();
    state = _isConnected(result);

    // Listen for changes
    _subscription = _connectivity.onConnectivityChanged.listen((result) {
      state = _isConnected(result);
    });
  }

  bool _isConnected(List<ConnectivityResult> result) {
    return result.any((r) => r != ConnectivityResult.none);
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}

final connectivityProvider = StateNotifierProvider<ConnectivityNotifier, bool>((ref) {
  return ConnectivityNotifier(Connectivity());
});
```

**Design decisions:**
- State is a simple `bool` (`true` = online, `false` = offline). No need for a complex enum — downstream code just needs "can I make an API call?"
- `connectivity_plus` v6.x returns `List<ConnectivityResult>` (multiple simultaneous connections possible). `_isConnected` checks if ANY is not `none`.
- Starts optimistic (`super(true)`) then immediately checks real status in `_init()`. This avoids a false "offline" flash on startup.
- `dispose()` cancels the stream subscription to prevent leaks.

**Files created:**
- `apps/mobile/lib/core/services/connectivity_service.dart`

### Register in `core/providers/core_providers.dart`

Add the export so other files can import connectivity from the central providers file:

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import '../network/offline_queue.dart';
import '../storage/secure_storage.dart';

// Re-export connectivity provider for convenience
export '../services/connectivity_service.dart' show connectivityProvider;

final secureStorageProvider = Provider<SecureStorageService>((ref) => SecureStorageService());
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient(ref.read(secureStorageProvider)));
final offlineQueueProvider = Provider<OfflineQueue>((ref) => OfflineQueue());
```

**Why re-export instead of defining the provider here:** The `ConnectivityNotifier` class and provider belong together in their own file (consistent with how `authProvider` lives in `auth_provider.dart`, not in `core_providers.dart`). The re-export just makes it importable from either location.

**Files modified:**
- `apps/mobile/lib/core/providers/core_providers.dart`

---

## Step 4: Offline Banner in Shell Scaffold

**Problem:** When the user loses connectivity, there's no visual indication. They'll just see errors when actions fail.

**Change:** Add a thin amber banner at the top of the shell scaffold (from Chunk 2) when offline. This watches `connectivityProvider`.

### Update `lib/router/shell_scaffold.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/services/connectivity_service.dart';
import '../core/theme/app_colors.dart';

class ShellScaffold extends ConsumerWidget {
  final StatefulNavigationShell navigationShell;

  const ShellScaffold({super.key, required this.navigationShell});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isOnline = ref.watch(connectivityProvider);

    return Scaffold(
      body: Column(
        children: [
          // Offline banner
          if (!isOnline)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 6),
              color: AppColors.warning,
              child: const Text(
                'You\'re offline. Showing cached data.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.w500),
              ),
            ),
          // Tab content
          Expanded(child: navigationShell),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: (index) {
          navigationShell.goBranch(
            index,
            initialLocation: index == navigationShell.currentIndex,
          );
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'Orders',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}
```

**Changes from Chunk 2 version:**
- Changed from `StatelessWidget` to `ConsumerWidget` to access `ref.watch`
- Added `connectivityProvider` watch
- Wrapped `navigationShell` in a `Column` with a conditional offline banner above
- Banner uses `AppColors.warning` (amber) — matches the app's existing warning color
- Banner only appears when offline, zero impact when online

**Files modified:**
- `apps/mobile/lib/router/shell_scaffold.dart`

---

## Summary of Changes

| File | Action | What Changes |
|------|--------|-------------|
| `core/constants/api_constants.dart` | Modify | `String.fromEnvironment` for base URL with current default |
| `lib/main.dart` | Modify | Add `Firebase.initializeApp()` in try/catch |
| `core/services/connectivity_service.dart` | Create | `ConnectivityNotifier` (StateNotifier\<bool\>) using `connectivity_plus` |
| `core/providers/core_providers.dart` | Modify | Re-export `connectivityProvider` |
| `router/shell_scaffold.dart` | Modify | Add offline banner, change to `ConsumerWidget` |

**Total: 1 file created, 4 files modified. No breaking changes.**

**No new dependencies needed** — `firebase_core`, `firebase_messaging`, and `connectivity_plus` are already in `pubspec.yaml`.

---

## Verification

1. `flutter analyze` — no errors
2. App launches normally without `google-services.json` (Firebase init fails silently, logged to debug console)
3. Toggle airplane mode on emulator/device — amber "You're offline" banner appears below status bar, above tab content
4. Toggle back online — banner disappears
5. `flutter run --dart-define=API_BASE_URL=http://example.com/api` — verify API calls go to the overridden URL (check debug console or network inspector)
6. `connectivityProvider` is watchable from any screen (test with a temporary `ref.watch` in `home_screen.dart`)

## Prerequisites for Full Firebase (Outside This Chunk)

Before push notifications work end-to-end (Chunk 5), someone must:
1. Create Firebase project at console.firebase.google.com
2. Download `google-services.json` -> `android/app/`
3. Download `GoogleService-Info.plist` -> `ios/Runner/`
4. Add `com.google.gms.google-services` Gradle plugin
5. Test with `firebase_messaging` token retrieval

This chunk makes the code ready for those config files — it doesn't require them.
