# Chunk 2 — Bottom Navigation (ShellRoute)

> Part of the Mobile App Completion Plan (7 chunks)
> Depends on: Chunk 1 (auth guard + token cleanup)
> Status: Planned
> Last updated: 2026-04-06

## Context

The app currently has flat GoRouter routes with no persistent navigation. Users reach Order History and Settings only through buttons/icons inside other screens. There is no `ShellRoute`, no `BottomNavigationBar`, and no `NavigationBar`. The app feels disjointed — you can get to orders but there's no obvious way back without the back button.

After Chunk 1, the router has an auth guard via `redirect`. This chunk wraps the post-auth screens in a `ShellRoute` with a 3-tab bottom nav.

---

## Step 1: Create Shell Scaffold

Create `lib/router/shell_scaffold.dart` — a `StatefulWidget` that holds the `NavigationBar` (Material 3) and renders the router's child widget.

### `lib/router/shell_scaffold.dart`

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class ShellScaffold extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const ShellScaffold({super.key, required this.navigationShell});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
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

**Design decisions:**
- Uses `StatefulNavigationShell` (GoRouter's built-in) instead of manual index tracking — this preserves each tab's navigation state when switching between tabs.
- `NavigationBar` (Material 3) matches the existing `useMaterial3: true` in `AppTheme`.
- `initialLocation: index == navigationShell.currentIndex` — tapping the already-active tab resets it to the root of that branch.
- Icons use outlined/filled variants for unselected/selected states.

**Files created:**
- `apps/mobile/lib/router/shell_scaffold.dart`

---

## Step 2: Restructure Router with StatefulShellRoute

Replace the flat route list with a `StatefulShellRoute.indexedStack` wrapping the three tab roots. Routes that should appear without the bottom nav (full-screen flows) stay as top-level `GoRoute` entries.

### `lib/router/app_router.dart` (after Chunk 1 changes applied)

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
import 'shell_scaffold.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final storage = ref.read(secureStorageProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) async {
      final token = await storage.getToken();
      final isLoggedIn = token != null;
      final isAuthRoute = state.matchedLocation == '/login' || state.matchedLocation == '/otp';

      if (!isLoggedIn && !isAuthRoute) return '/login';
      if (isLoggedIn && isAuthRoute) return '/home';
      return null;
    },
    routes: [
      // Auth routes (no bottom nav)
      GoRoute(path: '/login', builder: (_, __) => const PhoneInputScreen()),
      GoRoute(path: '/otp', builder: (_, __) => const OtpScreen()),

      // Onboarding (no bottom nav — full-screen flow)
      GoRoute(path: '/onboarding', builder: (_, __) => const TankSetupScreen()),

      // Main app shell with bottom navigation
      StatefulShellRoute.indexedStack(
        builder: (_, __, navigationShell) => ShellScaffold(navigationShell: navigationShell),
        branches: [
          // Tab 0: Home
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/home', builder: (_, __) => const HomeScreen()),
            ],
          ),
          // Tab 1: Orders
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/orders', builder: (_, __) => const OrderHistoryScreen()),
            ],
          ),
          // Tab 2: Settings
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
            ],
          ),
        ],
      ),

      // Push-only routes (appear over the shell, no bottom nav)
      GoRoute(path: '/orders/create', builder: (_, __) => const CreateOrderScreen()),
      GoRoute(path: '/link-retailer', builder: (_, __) => const LinkRetailerScreen()),
    ],
  );
});
```

**Key changes from pre-Chunk 2 router:**
- `StatefulShellRoute.indexedStack` wraps `/home`, `/orders`, `/settings`
- Orders tab route changed from `/orders/history` to `/orders` (cleaner as a tab root)
- `/orders/create` and `/link-retailer` stay outside the shell — they appear full-screen without bottom nav, which is correct UX for creation/action flows
- `/onboarding` stays outside the shell — it's a one-time full-screen wizard

**Files modified:**
- `apps/mobile/lib/router/app_router.dart`

---

## Step 3: Minor Screen Adjustments

### `home_screen.dart` — Remove settings icon from AppBar

The settings icon in the AppBar (line 29-31) is now redundant — Settings is a tab. Remove it.

```dart
// BEFORE (line 27-31):
appBar: AppBar(
  title: const Text('PreEmptly'),
  actions: [
    IconButton(icon: const Icon(Icons.settings), onPressed: () => context.push('/settings')),
  ],
),

// AFTER:
appBar: AppBar(
  title: const Text('PreEmptly'),
),
```

### `order_history_screen.dart` — Remove standalone AppBar title

Since it's now a tab, the AppBar can stay but the title should feel like a tab heading, not a pushed screen. Keep the AppBar as-is — `Order History` title is still appropriate for the tab. No change needed.

### `settings_screen.dart` — No changes needed

The settings screen already works standalone. The `context.push('/link-retailer')` call on line 31 will correctly push over the shell (link-retailer is outside the shell). The logout `context.go('/login')` on line 39 will correctly replace the entire stack. No changes needed.

### Navigation calls in other screens

Verify these existing navigation calls still work with the new route structure:

| Call | Location | Still works? |
|------|----------|-------------|
| `context.push('/settings')` | `home_screen.dart:30` | Removed (redundant) |
| `context.push('/orders/create')` | `home_screen.dart:170` | Yes — `/orders/create` is outside shell |
| `context.push('/onboarding')` | `home_screen.dart:52` | Yes — `/onboarding` is outside shell |
| `context.push('/link-retailer')` | `settings_screen.dart:31` | Yes — `/link-retailer` is outside shell |
| `context.go('/login')` | `settings_screen.dart:39` | Yes — replaces entire stack |
| `context.go('/home')` | `otp_screen.dart` | Yes — `/home` is tab 0 root |
| `context.go('/onboarding')` | `otp_screen.dart` | Yes — `/onboarding` is outside shell |
| `context.push('/orders/create')` | `create_order_screen.dart` | N/A (this IS that screen) |
| `context.pop()` | `create_order_screen.dart`, `link_retailer_screen.dart` | Yes — pops back to shell |

**Files modified:**
- `apps/mobile/lib/features/dashboard/presentation/screens/home_screen.dart` (remove settings icon only)

---

## Summary of Changes

| File | Action | What Changes |
|------|--------|-------------|
| `router/shell_scaffold.dart` | Create | NavigationBar with 3 tabs (Home, Orders, Settings) using StatefulNavigationShell |
| `router/app_router.dart` | Modify | Wrap tab routes in StatefulShellRoute.indexedStack, move push-only routes outside |
| `home_screen.dart` | Modify | Remove settings IconButton from AppBar (1 line removed) |

**Total: 1 file created, 2 files modified. Minimal changes to existing screens.**

---

## Verification

1. `flutter analyze` — no errors
2. App shows bottom nav with 3 tabs after login
3. Tapping each tab switches content, highlights the correct icon
4. Tab state is preserved (switch to Orders, scroll down, switch to Home, switch back to Orders — scroll position retained)
5. "Order Gas" button on Home pushes CreateOrderScreen WITHOUT bottom nav
6. "Linked Retailers" in Settings pushes LinkRetailerScreen WITHOUT bottom nav
7. `context.pop()` from CreateOrderScreen/LinkRetailerScreen returns to the shell with correct tab
8. Logout replaces entire stack — no bottom nav visible on login screen
9. Onboarding (new user) shows WITHOUT bottom nav
10. Re-tapping the active tab resets it to the branch root
