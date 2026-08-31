# Chunk 4 — Offline Queue Wiring + Dashboard Fixes

> Part of the Mobile App Completion Plan (7 chunks)
> Depends on: Chunk 3 (connectivity service)
> Status: Planned
> Last updated: 2026-04-06

## Context

The `OfflineQueue` class exists at `core/network/offline_queue.dart` with a working SQLite schema (`queue` table for pending mutations, `cache` table for cached responses) and methods `enqueue`/`getPending`/`remove`/`cacheData`/`getCachedData`. It is registered as `offlineQueueProvider` in `core_providers.dart`. But nothing in the app ever calls it — it's dead infrastructure.

Meanwhile, `DashboardNotifier` stores `errorMessage` in state on failure (lines 39, 50, 60 of `dashboard_provider.dart`), but `home_screen.dart` never reads or displays it — errors are silently swallowed.

The refill prompt card in `home_screen.dart` only renders when `remaining <= 7` (line 138). Users who want to log a refill when their tank still has >7 days remaining have no way to do so.

This chunk wires up the offline queue, surfaces errors, and fixes the refill access gap.

---

## Step 1: Wire Offline Queue into Dashboard Repository

**What changes:** `logRefill` and `adjustTank` check `connectivityProvider` before calling the API. If offline, they enqueue the mutation and return a success indicator so the UI can show feedback.

### `dashboard/data/dashboard_repository.dart`

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/core_providers.dart';
import '../../../core/services/connectivity_service.dart';

class DashboardRepository {
  final Ref ref;

  DashboardRepository(this.ref);

  Future<List<Map<String, dynamic>>> getTanks() async {
    final api = ref.read(apiClientProvider);
    final response = await api.dio.get('/tanks');
    return List<Map<String, dynamic>>.from(response.data);
  }

  Future<Map<String, dynamic>> getPrediction(String tankId) async {
    final api = ref.read(apiClientProvider);
    final response = await api.dio.get('/tanks/$tankId/prediction');
    return response.data;
  }

  /// Returns the API response, or null if the request was queued offline.
  Future<Map<String, dynamic>?> logRefill(String tankId, {String? refillDate}) async {
    final body = {
      'tankId': tankId,
      if (refillDate != null) 'refillDate': refillDate,
    };

    final isOnline = ref.read(connectivityProvider);
    if (!isOnline) {
      final queue = ref.read(offlineQueueProvider);
      await queue.enqueue('POST', '/refills', body);
      return null; // signals "queued"
    }

    final api = ref.read(apiClientProvider);
    final response = await api.dio.post('/refills', data: body);
    return response.data;
  }

  /// Returns the API response, or null if the request was queued offline.
  Future<Map<String, dynamic>?> adjustTank(String tankId, String adjustment) async {
    final body = {'adjustment': adjustment};

    final isOnline = ref.read(connectivityProvider);
    if (!isOnline) {
      final queue = ref.read(offlineQueueProvider);
      await queue.enqueue('POST', '/tanks/$tankId/adjust', body);
      return null; // signals "queued"
    }

    final api = ref.read(apiClientProvider);
    final response = await api.dio.post('/tanks/$tankId/adjust', data: body);
    return response.data;
  }
}

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) => DashboardRepository(ref));
```

**Key decisions:**
- Return type changes from `Map<String, dynamic>` to `Map<String, dynamic>?` — `null` means "queued offline"
- Only write operations (`POST`) are queued. Read operations (`GET /tanks`, `GET /tanks/:id/prediction`) are not — if offline, they'll throw and the notifier handles it gracefully
- The existing `OfflineQueue.enqueue` stores `method`, `path`, `body`, `created_at` — exactly what we need to replay later

**Files modified:**
- `apps/mobile/lib/features/dashboard/data/dashboard_repository.dart`

---

## Step 2: Update Dashboard Notifier for Offline Responses

The notifier needs to handle `null` returns (queued) differently from API responses.

### `dashboard/presentation/providers/dashboard_provider.dart`

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/dashboard_repository.dart';

class DashboardState {
  final bool isLoading;
  final Map<String, dynamic>? tank;
  final Map<String, dynamic>? prediction;
  final String? errorMessage;
  final String? infoMessage;  // NEW: for non-error feedback like "Queued for sync"

  DashboardState({
    this.isLoading = false,
    this.tank,
    this.prediction,
    this.errorMessage,
    this.infoMessage,
  });

  DashboardState copyWith({
    bool? isLoading,
    Map<String, dynamic>? tank,
    Map<String, dynamic>? prediction,
    String? errorMessage,
    String? infoMessage,
  }) {
    return DashboardState(
      isLoading: isLoading ?? this.isLoading,
      tank: tank ?? this.tank,
      prediction: prediction ?? this.prediction,
      errorMessage: errorMessage,
      infoMessage: infoMessage,
    );
  }
}

class DashboardNotifier extends StateNotifier<DashboardState> {
  final DashboardRepository _repository;

  DashboardNotifier(this._repository) : super(DashboardState());

  Future<void> loadDashboard() async {
    state = state.copyWith(isLoading: true);
    try {
      final tanks = await _repository.getTanks();
      if (tanks.isEmpty) {
        state = state.copyWith(isLoading: false);
        return;
      }
      final tank = tanks.first;
      final prediction = await _repository.getPrediction(tank['id']);
      state = state.copyWith(isLoading: false, tank: tank, prediction: prediction);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  Future<void> logRefill({String? refillDate}) async {
    if (state.tank == null) return;
    state = state.copyWith(isLoading: true);
    try {
      final result = await _repository.logRefill(state.tank!['id'], refillDate: refillDate);
      if (result == null) {
        // Queued offline
        state = state.copyWith(
          isLoading: false,
          infoMessage: 'Refill saved. Will sync when back online.',
        );
      } else {
        // Online — refresh dashboard with new data
        await loadDashboard();
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  Future<void> adjustUsage(String adjustment) async {
    if (state.tank == null) return;
    try {
      final result = await _repository.adjustTank(state.tank!['id'], adjustment);
      if (result == null) {
        // Queued offline
        state = state.copyWith(
          infoMessage: 'Adjustment saved. Will sync when back online.',
        );
      } else {
        // Online — update prediction with response
        state = state.copyWith(prediction: result);
      }
    } catch (e) {
      state = state.copyWith(errorMessage: e.toString());
    }
  }
}

final dashboardProvider = StateNotifierProvider<DashboardNotifier, DashboardState>((ref) {
  return DashboardNotifier(ref.read(dashboardRepositoryProvider));
});
```

**Changes from current:**
- Added `infoMessage` to `DashboardState` — for non-error feedback ("queued for sync")
- `logRefill` and `adjustUsage` handle `null` (queued) vs non-null (API response) return
- When queued: sets `infoMessage` instead of refreshing dashboard (can't refresh offline anyway)
- When online: behavior is identical to before

**Files modified:**
- `apps/mobile/lib/features/dashboard/presentation/providers/dashboard_provider.dart`

---

## Step 3: Queue Flush Service

Replays pending queue items when connectivity is restored.

### `lib/core/services/queue_flush_service.dart`

```dart
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import '../network/offline_queue.dart';
import '../services/connectivity_service.dart';

class QueueFlushService {
  final Ref ref;
  bool _isFlushing = false;

  QueueFlushService(this.ref) {
    // Listen for connectivity changes
    ref.listen<bool>(connectivityProvider, (previous, next) {
      if (previous == false && next == true) {
        flush();
      }
    });
  }

  Future<void> flush() async {
    if (_isFlushing) return; // prevent concurrent flushes
    _isFlushing = true;

    try {
      final queue = ref.read(offlineQueueProvider);
      final api = ref.read(apiClientProvider);
      final pending = await queue.getPending();

      for (final item in pending) {
        try {
          final method = item['method'] as String;
          final path = item['path'] as String;
          final bodyJson = item['body'] as String?;
          final body = bodyJson != null ? jsonDecode(bodyJson) : null;

          switch (method) {
            case 'POST':
              await api.dio.post(path, data: body);
              break;
            case 'PATCH':
              await api.dio.patch(path, data: body);
              break;
            case 'PUT':
              await api.dio.put(path, data: body);
              break;
          }

          // Success — remove from queue
          await queue.remove(item['id'] as int);
          debugPrint('[QueueFlush] Replayed $method $path');
        } catch (e) {
          // Individual item failed — leave in queue for next flush
          debugPrint('[QueueFlush] Failed to replay ${item['path']}: $e');
        }
      }
    } finally {
      _isFlushing = false;
    }
  }
}

final queueFlushServiceProvider = Provider<QueueFlushService>((ref) {
  return QueueFlushService(ref);
});
```

**Design decisions:**
- `_isFlushing` guard prevents concurrent flushes if connectivity toggles rapidly
- Failed individual items stay in the queue — they'll be retried on the next connectivity change
- Supports POST, PATCH, PUT — covers all current and future write operations
- Uses `debugPrint` for dev visibility without polluting production logs
- `ref.listen` on `connectivityProvider` triggers flush when transitioning from offline to online

### Initialize in `main.dart`

The service must be eagerly created so it starts listening. Add one line after the `ProviderScope`:

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await Firebase.initializeApp();
  } catch (e) {
    debugPrint('Firebase init failed (config missing?): $e');
  }

  runApp(
    ProviderScope(
      child: const _EagerInitializer(child: PreEmptlyApp()),
    ),
  );
}

/// Eagerly initializes providers that need to start listening immediately.
class _EagerInitializer extends ConsumerWidget {
  final Widget child;
  const _EagerInitializer({required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Initialize queue flush service — starts listening for connectivity changes
    ref.watch(queueFlushServiceProvider);
    return child;
  }
}
```

**Why `_EagerInitializer` instead of calling it in `main()`:** Riverpod providers can only be read inside the widget tree or via a `ProviderContainer`. Wrapping the app in a `ConsumerWidget` that watches the service is the cleanest way to eagerly initialize it. The `ref.watch` ensures the service is created when the app starts and disposed when it's torn down.

**Files created:**
- `apps/mobile/lib/core/services/queue_flush_service.dart`

**Files modified:**
- `apps/mobile/lib/main.dart`

---

## Step 4: Surface Errors and Info Messages in Home Screen

**Problem:** `DashboardState.errorMessage` is set on failure but `home_screen.dart` never renders it. Same will apply to the new `infoMessage`.

**Change:** Add `ref.listen` calls in `home_screen.dart` to show SnackBars for both error and info messages. Also replace inline loading/empty patterns with shared widgets from Chunk 1, and add a standalone "Log Refill" action in the AppBar.

### `home_screen.dart` changes

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_widget.dart';
import '../../../../shared/widgets/empty_state_widget.dart';
import '../providers/dashboard_provider.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(dashboardProvider.notifier).loadDashboard());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(dashboardProvider);

    // Listen for errors — show red SnackBar
    ref.listen<DashboardState>(dashboardProvider, (prev, next) {
      if (next.errorMessage != null && next.errorMessage != prev?.errorMessage) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.errorMessage!),
            backgroundColor: AppColors.danger,
          ),
        );
      }
      // Listen for info messages — show default SnackBar
      if (next.infoMessage != null && next.infoMessage != prev?.infoMessage) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(next.infoMessage!)),
        );
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text('PreEmptly'),
        actions: [
          // Standalone refill action — always accessible
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'refill_now') {
                ref.read(dashboardProvider.notifier).logRefill();
              } else if (value == 'refill_date') {
                _showDatePicker();
              }
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'refill_now', child: Text('Log Refill (just now)')),
              const PopupMenuItem(value: 'refill_date', child: Text('Log Refill (pick date)')),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(dashboardProvider.notifier).loadDashboard(),
        child: state.isLoading && state.prediction == null
            ? const LoadingWidget(message: 'Loading your tank...')
            : state.prediction == null
                ? EmptyStateWidget(
                    icon: Icons.propane_tank,
                    message: 'No tanks set up yet',
                    actionLabel: 'Set Up Your Tank',
                    onAction: () => context.push('/onboarding'),
                  )
                : _buildDashboard(context, state),
      ),
    );
  }

  // _buildDashboard, _adjustButton, _showDatePicker remain unchanged
  // ... (same as current lines 59-203)
}
```

**Changes from current `home_screen.dart`:**

1. **Added `ref.listen` for `errorMessage`** — shows red SnackBar on error (lines with `AppColors.danger`)
2. **Added `ref.listen` for `infoMessage`** — shows default SnackBar for "queued for sync" messages
3. **Replaced inline `CircularProgressIndicator`** with `LoadingWidget` (from Chunk 1 shared widgets)
4. **Replaced inline empty state Column** with `EmptyStateWidget` (from Chunk 1 shared widgets)
5. **Replaced settings IconButton** with `PopupMenuButton` for "Log Refill" (two options: "just now" and "pick date")
6. **Refill logging is now always accessible** via the AppBar menu, regardless of remaining days

**The refill prompt card at `remaining <= 7` stays** — it's still useful as a visual warning. The AppBar menu is the always-available path. Both call the same `logRefill()` / `_showDatePicker()` methods.

**Files modified:**
- `apps/mobile/lib/features/dashboard/presentation/screens/home_screen.dart`

---

## Summary of Changes

| File | Action | What Changes |
|------|--------|-------------|
| `dashboard/data/dashboard_repository.dart` | Modify | `logRefill` and `adjustTank` check connectivity, enqueue if offline, return `null` for queued |
| `dashboard/presentation/providers/dashboard_provider.dart` | Modify | Add `infoMessage` to state, handle `null` (queued) responses |
| `core/services/queue_flush_service.dart` | Create | Listens for connectivity restore, replays pending queue items |
| `lib/main.dart` | Modify | Add `_EagerInitializer` to start `QueueFlushService` |
| `dashboard/presentation/screens/home_screen.dart` | Modify | `ref.listen` for error/info SnackBars, shared widgets, standalone refill in AppBar |

**Total: 1 file created, 4 files modified.**

---

## Verification

1. `flutter analyze` — no errors
2. **Online refill:** Tap AppBar menu -> "Log Refill (just now)" -> dashboard refreshes with updated prediction -> SnackBar does NOT show "queued" message
3. **Offline refill:** Toggle airplane mode -> Tap "Log Refill (just now)" -> SnackBar shows "Refill saved. Will sync when back online."
4. **Queue flush:** While still in airplane mode, verify queue has items (debug print). Turn airplane mode off -> debug console shows "[QueueFlush] Replayed POST /refills"
5. **Offline adjustment:** Toggle airplane mode -> Tap "More than usual" -> SnackBar shows "Adjustment saved. Will sync when back online."
6. **Error display:** Stop the backend server -> Pull to refresh -> Red SnackBar shows error message
7. **Empty state:** New user (no tanks) -> sees `EmptyStateWidget` with propane icon and "Set Up Your Tank" button
8. **Loading state:** Shows `LoadingWidget` with "Loading your tank..." on first load
9. **Refill always accessible:** With >7 days remaining, AppBar menu still shows refill options
