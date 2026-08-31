import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../features/auth/presentation/screens/phone_input_screen.dart';
import '../features/auth/presentation/screens/otp_screen.dart';
import '../features/onboarding/presentation/screens/tank_setup_screen.dart';
import '../features/dashboard/presentation/screens/home_screen.dart';
import '../features/orders/presentation/screens/create_order_screen.dart';
import '../features/orders/presentation/screens/order_history_screen.dart';
import '../features/retailer_link/presentation/screens/link_retailer_screen.dart';
import '../features/settings/presentation/screens/settings_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/login',
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
