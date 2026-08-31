# Chunk 5 — Settings Completion (Tank Edit + Notifications)

> Part of the Mobile App Completion Plan (7 chunks)
> Depends on: Chunk 4 (offline queue + dashboard fixes)
> Can be swapped with Chunk 6 (no file overlap)
> Status: Planned
> Last updated: 2026-04-07

## Context

The Settings screen (`settings_screen.dart`) has 4 `ListTile` items. Two work: "Linked Retailers" (navigates to `/link-retailer`) and "Logout". Two are stubs with `onTap: () {}`: "Tank Settings" and "Notifications". These are user-visible broken promises.

The tank setup wizard (`tank_setup_screen.dart`) already has the selection card UI pattern for size, type, and usage level. The tank settings screen will reuse this pattern for editing.

The backend `PATCH /tanks/:id` endpoint accepts optional `capacityKg`, `model` (EXCHANGE/REFILL), `usageLevel` (LIGHT/MODERATE/HEAVY/VERY_HEAVY), and `isActive`.

Firebase was initialized in Chunk 3. The notifications screen can request FCM permission and store the preference locally.

---

## Step 1: Tank Settings Screen

Create a screen that loads the current tank data and lets the user edit size, model, and usage level. Uses the same `GestureDetector + Container BoxDecoration` selection pattern from `tank_setup_screen.dart`.

### `lib/features/settings/presentation/screens/tank_settings_screen.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../dashboard/presentation/providers/dashboard_provider.dart';
import '../../../dashboard/data/dashboard_repository.dart';

class TankSettingsScreen extends ConsumerStatefulWidget {
  const TankSettingsScreen({super.key});

  @override
  ConsumerState<TankSettingsScreen> createState() => _TankSettingsScreenState();
}

class _TankSettingsScreenState extends ConsumerState<TankSettingsScreen> {
  double _selectedSize = 11;
  String _model = 'EXCHANGE';
  String _usageLevel = 'MODERATE';
  bool _isLoading = false;
  bool _initialized = false;

  final _sizes = [2.7, 11.0, 22.0, 50.0];

  @override
  void initState() {
    super.initState();
    Future.microtask(_loadCurrentValues);
  }

  void _loadCurrentValues() {
    final tank = ref.read(dashboardProvider).tank;
    if (tank != null) {
      setState(() {
        _selectedSize = (tank['capacityKg'] as num).toDouble();
        _model = tank['model'] as String? ?? 'EXCHANGE';
        _usageLevel = tank['usageLevel'] as String? ?? 'MODERATE';
        _initialized = true;
      });
    }
  }

  Future<void> _save() async {
    setState(() => _isLoading = true);
    try {
      final tank = ref.read(dashboardProvider).tank;
      if (tank == null) return;

      await ref.read(dashboardRepositoryProvider).updateTank(
        tank['id'] as String,
        capacityKg: _selectedSize,
        model: _model,
        usageLevel: _usageLevel,
      );

      // Refresh dashboard with updated tank data
      await ref.read(dashboardProvider.notifier).loadDashboard();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Tank settings updated')),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tank Settings')),
      body: !_initialized
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Tank Size
                  Text('Tank Size', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  ..._sizes.map((size) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: _buildSelectionCard(
                      selected: _selectedSize == size,
                      onTap: () => setState(() => _selectedSize = size),
                      leading: Icon(Icons.propane_tank, color: _selectedSize == size ? AppColors.primary : Colors.grey, size: 28),
                      title: '${size}kg',
                    ),
                  )),

                  const SizedBox(height: 24),

                  // Tank Model
                  Text('Tank Type', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  _buildSelectionCard(
                    selected: _model == 'EXCHANGE',
                    onTap: () => setState(() => _model = 'EXCHANGE'),
                    leading: Icon(Icons.swap_horiz, color: _model == 'EXCHANGE' ? AppColors.primary : Colors.grey, size: 28),
                    title: 'Exchange',
                    subtitle: 'Swap empty tank for a full one',
                  ),
                  const SizedBox(height: 8),
                  _buildSelectionCard(
                    selected: _model == 'REFILL',
                    onTap: () => setState(() => _model = 'REFILL'),
                    leading: Icon(Icons.local_gas_station, color: _model == 'REFILL' ? AppColors.primary : Colors.grey, size: 28),
                    title: 'Refill',
                    subtitle: 'Same tank, filled up',
                  ),

                  const SizedBox(height: 24),

                  // Usage Level
                  Text('Usage Level', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  _buildSelectionCard(
                    selected: _usageLevel == 'LIGHT',
                    onTap: () => setState(() => _usageLevel = 'LIGHT'),
                    title: 'Light',
                    subtitle: '1-2 meals a day, simple dishes',
                  ),
                  const SizedBox(height: 8),
                  _buildSelectionCard(
                    selected: _usageLevel == 'MODERATE',
                    onTap: () => setState(() => _usageLevel = 'MODERATE'),
                    title: 'Moderate',
                    subtitle: '2-3 meals a day, typical cooking',
                  ),
                  const SizedBox(height: 8),
                  _buildSelectionCard(
                    selected: _usageLevel == 'HEAVY',
                    onTap: () => setState(() => _usageLevel = 'HEAVY'),
                    title: 'Heavy',
                    subtitle: 'Frequent cooking, large portions',
                  ),
                  const SizedBox(height: 8),
                  _buildSelectionCard(
                    selected: _usageLevel == 'VERY_HEAVY',
                    onTap: () => setState(() => _usageLevel = 'VERY_HEAVY'),
                    title: 'Very Heavy',
                    subtitle: 'All-day cooking, commercial use',
                  ),

                  const SizedBox(height: 32),

                  // Save button
                  ElevatedButton(
                    onPressed: _isLoading ? null : _save,
                    child: _isLoading
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Save Changes'),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildSelectionCard({
    required bool selected,
    required VoidCallback onTap,
    Widget? leading,
    required String title,
    String? subtitle,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? AppColors.primary : Colors.grey.shade300,
            width: selected ? 2 : 1,
          ),
          color: selected ? AppColors.primary.withValues(alpha: 0.05) : Colors.white,
        ),
        child: Row(
          children: [
            if (leading != null) ...[leading, const SizedBox(width: 16)],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: selected ? AppColors.primary : AppColors.textPrimary,
                  )),
                  if (subtitle != null) ...[
                    const SizedBox(height: 4),
                    Text(subtitle, style: const TextStyle(color: AppColors.textSecondary)),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

**Design decisions:**
- Reads current tank from `dashboardProvider.tank` (already in memory, no extra API call)
- Uses `_buildSelectionCard` helper that matches the `tank_setup_screen.dart` visual pattern exactly (same border width, same alpha, same radius)
- Includes all 4 usage levels (LIGHT/MODERATE/HEAVY/VERY_HEAVY) -- the onboarding only shows 3 but the backend supports 4
- Includes tank model (EXCHANGE/REFILL) which is set during onboarding but not editable anywhere until now
- On save: calls `PATCH /tanks/:id`, refreshes dashboard, pops back to settings
- Loads current values from state in `initState` via `Future.microtask` to avoid reading ref before build

**Files created:**
- `apps/mobile/lib/features/settings/presentation/screens/tank_settings_screen.dart`

---

## Step 2: Add `updateTank` to Dashboard Repository

The repository needs a new method to call `PATCH /tanks/:id`.

### Add to `dashboard/data/dashboard_repository.dart`

```dart
Future<Map<String, dynamic>> updateTank(
  String tankId, {
  double? capacityKg,
  String? model,
  String? usageLevel,
}) async {
  final api = ref.read(apiClientProvider);
  final response = await api.dio.patch('/tanks/$tankId', data: {
    if (capacityKg != null) 'capacityKg': capacityKg,
    if (model != null) 'model': model,
    if (usageLevel != null) 'usageLevel': usageLevel,
  });
  return response.data;
}
```

This is added after the existing `adjustTank` method. No offline queue wiring needed for tank settings -- edits are infrequent and the user should see immediate confirmation.

**Files modified:**
- `apps/mobile/lib/features/dashboard/data/dashboard_repository.dart`

---

## Step 3: Notifications Settings Screen

A simple screen with toggle switches for notification preferences. Stores preferences locally via `SecureStorageService` and requests FCM permission when enabling.

### `lib/features/settings/presentation/screens/notifications_screen.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../../../../core/providers/core_providers.dart';
import '../../../../core/theme/app_colors.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  bool _lowGasAlerts = true;
  bool _orderUpdates = true;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    final storage = ref.read(secureStorageProvider);
    final lowGas = await storage.getValue('notifications_low_gas');
    final orders = await storage.getValue('notifications_orders');
    if (mounted) {
      setState(() {
        _lowGasAlerts = lowGas != 'false'; // default true
        _orderUpdates = orders != 'false'; // default true
        _isLoading = false;
      });
    }
  }

  Future<void> _onToggleLowGas(bool value) async {
    setState(() => _lowGasAlerts = value);
    final storage = ref.read(secureStorageProvider);
    await storage.setValue('notifications_low_gas', value.toString());

    if (value) await _ensureFcmPermission();
  }

  Future<void> _onToggleOrders(bool value) async {
    setState(() => _orderUpdates = value);
    final storage = ref.read(secureStorageProvider);
    await storage.setValue('notifications_orders', value.toString());

    if (value) await _ensureFcmPermission();
  }

  Future<void> _ensureFcmPermission() async {
    try {
      final messaging = FirebaseMessaging.instance;
      final settings = await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
      if (settings.authorizationStatus == AuthorizationStatus.denied) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please enable notifications in your device settings')),
          );
        }
      }
    } catch (e) {
      // Firebase not configured yet — silently ignore
      debugPrint('FCM permission request failed: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              children: [
                SwitchListTile(
                  title: const Text('Low gas alerts'),
                  subtitle: const Text('Get notified when your tank is running low'),
                  secondary: Icon(Icons.local_fire_department, color: AppColors.warning),
                  value: _lowGasAlerts,
                  onChanged: _onToggleLowGas,
                ),
                const Divider(),
                SwitchListTile(
                  title: const Text('Order updates'),
                  subtitle: const Text('Get notified about your order status changes'),
                  secondary: Icon(Icons.receipt_long, color: AppColors.primary),
                  value: _orderUpdates,
                  onChanged: _onToggleOrders,
                ),
                const Divider(),
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text(
                    'Notifications are sent as push alerts to your device. You can also control notifications from your device settings.',
                    style: TextStyle(color: AppColors.textSecondary, fontSize: 13),
                  ),
                ),
              ],
            ),
    );
  }
}
```

**Design decisions:**
- Preferences stored locally in `SecureStorageService` as simple string values (`'true'`/`'false'`), defaults to `true` if not set
- FCM permission requested only when toggling ON (not on screen load — avoids unexpected permission popup)
- FCM errors caught silently — Firebase may not be configured yet (try/catch from Chunk 3)
- No dedicated Riverpod provider — this screen is simple enough for local state. Preferences are local-only and not tied to API state
- The actual filtering of which push notifications to send is a backend concern (future work) — this screen stores the user's preference for when that's wired up

**Files created:**
- `apps/mobile/lib/features/settings/presentation/screens/notifications_screen.dart`

---

## Step 4: Add Generic Storage Methods to SecureStorageService

The notifications screen needs to read/write arbitrary keys beyond just `access_token` and `user_id`. Add generic `getValue`/`setValue` methods.

### Add to `core/storage/secure_storage.dart`

```dart
Future<void> setValue(String key, String value) async {
  await _storage.write(key: key, value: value);
}

Future<String?> getValue(String key) async {
  return _storage.read(key: key);
}
```

Added after the existing `clearAll` method. The existing specific methods (`saveToken`, `getToken`, etc.) stay — they're used throughout the app and provide clear intent.

**Files modified:**
- `apps/mobile/lib/core/storage/secure_storage.dart`

---

## Step 5: Wire Settings Taps and Add Routes

### Update `settings_screen.dart`

Replace the two empty `onTap` callbacks:

```dart
// BEFORE (line 19):
onTap: () {},

// AFTER:
onTap: () => context.push('/settings/tank'),

// BEFORE (line 25):
onTap: () {},

// AFTER:
onTap: () => context.push('/settings/notifications'),
```

Full updated file:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          ListTile(
            leading: const Icon(Icons.propane_tank),
            title: const Text('Tank Settings'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/settings/tank'),
          ),
          ListTile(
            leading: const Icon(Icons.notifications),
            title: const Text('Notifications'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/settings/notifications'),
          ),
          ListTile(
            leading: const Icon(Icons.store),
            title: const Text('Linked Retailers'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/link-retailer'),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('Logout', style: TextStyle(color: Colors.red)),
            onTap: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
    );
  }
}
```

**Files modified:**
- `apps/mobile/lib/features/settings/presentation/screens/settings_screen.dart`

### Add routes to `app_router.dart`

Add two new `GoRoute` entries in the push-only routes section (outside the shell, so they appear without bottom nav — correct UX for drill-down settings):

```dart
// Add these imports at top:
import '../features/settings/presentation/screens/tank_settings_screen.dart';
import '../features/settings/presentation/screens/notifications_screen.dart';

// Add in the push-only routes section (after /link-retailer):
GoRoute(path: '/settings/tank', builder: (_, __) => const TankSettingsScreen()),
GoRoute(path: '/settings/notifications', builder: (_, __) => const NotificationsScreen()),
```

**Files modified:**
- `apps/mobile/lib/router/app_router.dart`

---

## Summary of Changes

| File | Action | What Changes |
|------|--------|-------------|
| `settings/presentation/screens/tank_settings_screen.dart` | Create | Edit tank size, model, usage level using selection card pattern |
| `settings/presentation/screens/notifications_screen.dart` | Create | Toggle low gas alerts and order updates, FCM permission request |
| `dashboard/data/dashboard_repository.dart` | Modify | Add `updateTank` method (PATCH /tanks/:id) |
| `core/storage/secure_storage.dart` | Modify | Add generic `getValue`/`setValue` methods |
| `settings/presentation/screens/settings_screen.dart` | Modify | Wire two no-op taps to push new routes |
| `router/app_router.dart` | Modify | Add `/settings/tank` and `/settings/notifications` routes + imports |

**Total: 2 files created, 4 files modified.**

---

## Verification

1. `flutter analyze` -- no errors
2. Settings -> "Tank Settings" -> navigates to tank settings screen (no bottom nav visible)
3. Tank settings shows current tank values pre-selected (correct size, model, usage level)
4. Change usage level -> "Save Changes" -> SnackBar "Tank settings updated" -> pops back to settings
5. Return to Home tab -> dashboard reflects updated prediction (usage level affects estimation)
6. Settings -> "Notifications" -> navigates to notifications screen (no bottom nav visible)
7. Toggle "Low gas alerts" ON -> FCM permission dialog appears (if Firebase configured) or silently passes (if not)
8. Toggle OFF and back -> preference persists across screen navigations
9. Kill app and reopen -> notification preferences are retained (stored in secure storage)
10. All 4 settings items now have working navigation (no more dead taps)
