# Chunk 6 — QR Scanner + Order Detail Screen

> Part of the Mobile App Completion Plan (7 chunks)
> Depends on: Chunk 4 (offline queue + dashboard fixes)
> Can be swapped with Chunk 5 (no file overlap)
> Status: Planned
> Last updated: 2026-04-07

## Context

The retailer linking screen (`link_retailer_screen.dart`) only supports manual code entry. The plan calls for QR scanning as a primary linking method -- riders give customers a QR code on first delivery. `mobile_scanner` is referenced in the planning docs but is **not yet in `pubspec.yaml`** -- it needs to be added.

The order history screen (`order_history_screen.dart`) lists orders as cards but tapping them does nothing. There's no order detail screen. The API has `GET /orders/:id` returning the full order with `tank`, `customer`, `retailer` includes and a `statusLabel` field. Cancel is available via `PATCH /orders/:id/cancel` for orders in PENDING, PENDING_SMS, CONFIRMED, or ASSIGNED status.

The backend defines customer-facing status labels:
- PENDING / PENDING_SMS → "Order Placed"
- CONFIRMED / ASSIGNED → "Confirmed"  
- OUT_FOR_DELIVERY → "On the Way"
- DELIVERED → "Delivered"
- CANCELLED_BY_CUSTOMER → "Cancelled"
- CANCELLED_BY_RETAILER → "Cancelled by Retailer"
- REJECTED → "Rejected"

---

## Step 1: Add `mobile_scanner` Dependency

`mobile_scanner` is NOT currently in `pubspec.yaml`. Add it.

### `apps/mobile/pubspec.yaml`

Add under dependencies:

```yaml
mobile_scanner: ^6.0.2
```

Then run `flutter pub get`.

**Note:** `mobile_scanner` requires camera permission. Add to platform configs:

**Android** — `apps/mobile/android/app/src/main/AndroidManifest.xml`, add inside `<manifest>`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
```

**iOS** — `apps/mobile/ios/Runner/Info.plist`, add:
```xml
<key>NSCameraUsageDescription</key>
<string>Camera is used to scan retailer QR codes for linking</string>
```

**Files modified:**
- `apps/mobile/pubspec.yaml`
- `apps/mobile/android/app/src/main/AndroidManifest.xml`
- `apps/mobile/ios/Runner/Info.plist`

---

## Step 2: Add QR Scan Mode to Link Retailer Screen

Add a toggle between manual code entry and QR camera scanning. When a QR code is scanned, feed the decoded string into the existing `_lookupCode()` flow.

### `lib/features/retailer_link/presentation/screens/link_retailer_screen.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../../core/providers/core_providers.dart';
import '../../../../core/theme/app_colors.dart';

class LinkRetailerScreen extends ConsumerStatefulWidget {
  const LinkRetailerScreen({super.key});

  @override
  ConsumerState<LinkRetailerScreen> createState() => _LinkRetailerScreenState();
}

class _LinkRetailerScreenState extends ConsumerState<LinkRetailerScreen> {
  final _codeController = TextEditingController();
  Map<String, dynamic>? _retailerPreview;
  bool _isLoading = false;
  bool _isLinking = false;
  bool _showScanner = false;
  bool _scanProcessed = false; // prevent multiple scans

  Future<void> _lookupCode() async {
    final code = _codeController.text.trim();
    if (code.isEmpty) return;
    setState(() {
      _isLoading = true;
      _retailerPreview = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.dio.get('/link/retailer/$code');
      setState(() => _retailerPreview = res.data);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Invalid code')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _onQrDetected(BarcodeCapture capture) {
    if (_scanProcessed) return;
    final barcode = capture.barcodes.firstOrNull;
    if (barcode == null || barcode.rawValue == null) return;

    _scanProcessed = true;
    String code = barcode.rawValue!;

    // Handle deep links: app.preemptly.com/join/{code}
    final uri = Uri.tryParse(code);
    if (uri != null && uri.pathSegments.length >= 2 && uri.pathSegments[0] == 'join') {
      code = uri.pathSegments[1];
    }

    setState(() {
      _codeController.text = code;
      _showScanner = false;
    });

    _lookupCode();
  }

  Future<void> _linkRetailer() async {
    setState(() => _isLinking = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.dio.post('/link/retailer', data: {
        'code': _codeController.text.trim(),
        'method': _showScanner ? 'QR_CODE' : 'MANUAL_CODE',
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Retailer linked!')),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLinking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Link Retailer'),
        actions: [
          // Toggle between manual and QR mode
          IconButton(
            icon: Icon(_showScanner ? Icons.keyboard : Icons.qr_code_scanner),
            tooltip: _showScanner ? 'Enter code manually' : 'Scan QR code',
            onPressed: () => setState(() {
              _showScanner = !_showScanner;
              _scanProcessed = false;
              _retailerPreview = null;
            }),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_showScanner) ...[
              // QR Scanner mode
              Text('Scan Retailer QR Code', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 16),
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: SizedBox(
                  height: 280,
                  child: MobileScanner(onDetect: _onQrDetected),
                ),
              ),
              const SizedBox(height: 12),
              Center(
                child: Text(
                  'Point your camera at the retailer\'s QR code',
                  style: TextStyle(color: AppColors.textSecondary),
                ),
              ),
            ] else ...[
              // Manual code entry mode (existing UI)
              Text('Enter Invite Code', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _codeController,
                      decoration: const InputDecoration(hintText: 'e.g. GASEXP01'),
                      textCapitalization: TextCapitalization.characters,
                    ),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: _isLoading ? null : _lookupCode,
                    style: ElevatedButton.styleFrom(minimumSize: const Size(80, 52)),
                    child: _isLoading
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Find'),
                  ),
                ],
              ),
            ],

            // Retailer preview card (shared between both modes)
            if (_retailerPreview != null) ...[
              const SizedBox(height: 24),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _retailerPreview!['businessName'],
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _retailerPreview!['city'],
                        style: const TextStyle(color: AppColors.textSecondary),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _isLinking ? null : _linkRetailer,
                        child: _isLinking
                            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('Link This Retailer'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }
}
```

**Key changes from current:**
- Added `_showScanner` toggle (default `false` — manual entry is still the default view)
- AppBar has an `IconButton` to toggle between keyboard and QR modes
- QR scanner uses `MobileScanner` widget embedded inline (280px height, rounded corners) — not a separate screen
- `_onQrDetected` handles both raw codes (`GASEXP01`) and deep links (`https://app.preemptly.com/join/GASEXP01`)
- `_scanProcessed` flag prevents multiple rapid scans from firing multiple lookups
- `_linkRetailer` sends `method: 'QR_CODE'` when linking via scan, `'MANUAL_CODE'` when manual
- Retailer preview card is shared between both modes — once a code is resolved, the same confirm flow applies

**Files modified:**
- `apps/mobile/lib/features/retailer_link/presentation/screens/link_retailer_screen.dart`

---

## Step 3: Add `getOrder` and `cancelOrder` to Orders Repository

### Add to `orders/data/orders_repository.dart`

```dart
Future<Map<String, dynamic>> getOrder(String orderId) async {
  final api = ref.read(apiClientProvider);
  final response = await api.dio.get('/orders/$orderId');
  return response.data;
}

Future<Map<String, dynamic>> cancelOrder(String orderId) async {
  final api = ref.read(apiClientProvider);
  final response = await api.dio.patch('/orders/$orderId/cancel');
  return response.data;
}
```

Added after the existing `getLinkedRetailers` method.

**Files modified:**
- `apps/mobile/lib/features/orders/data/orders_repository.dart`

---

## Step 4: Create Order Detail Screen

A detail screen showing order info, a status timeline, price breakdown, and a cancel button when applicable.

### `lib/features/orders/presentation/screens/order_detail_screen.dart`

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_widget.dart';
import '../../../../shared/widgets/app_error_widget.dart';
import '../../data/orders_repository.dart';

class OrderDetailScreen extends ConsumerStatefulWidget {
  final String orderId;

  const OrderDetailScreen({super.key, required this.orderId});

  @override
  ConsumerState<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends ConsumerState<OrderDetailScreen> {
  Map<String, dynamic>? _order;
  bool _isLoading = true;
  String? _error;
  bool _isCancelling = false;

  @override
  void initState() {
    super.initState();
    _loadOrder();
  }

  Future<void> _loadOrder() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final repo = ref.read(ordersRepositoryProvider);
      _order = await repo.getOrder(widget.orderId);
    } catch (e) {
      _error = e.toString();
    }
    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _cancelOrder() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Order?'),
        content: const Text('Are you sure you want to cancel this order?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('No')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Yes, Cancel')),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _isCancelling = true);
    try {
      final repo = ref.read(ordersRepositoryProvider);
      await repo.cancelOrder(widget.orderId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Order cancelled')),
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
      if (mounted) setState(() => _isCancelling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Order Details')),
      body: _isLoading
          ? const LoadingWidget()
          : _error != null
              ? AppErrorWidget(message: _error!, onRetry: _loadOrder)
              : _buildContent(),
    );
  }

  Widget _buildContent() {
    final order = _order!;
    final status = order['status'] as String;
    final statusLabel = order['statusLabel'] as String? ?? status;
    final retailer = order['retailer'] as Map<String, dynamic>?;
    final tank = order['tank'] as Map<String, dynamic>?;
    final createdAt = order['createdAt']?.toString().substring(0, 10) ?? '';
    final basePrice = (order['basePrice'] as num?)?.toDouble() ?? 0;
    final discountAmount = (order['discountAmount'] as num?)?.toDouble() ?? 0;
    final finalAmount = (order['finalAmount'] as num?)?.toDouble() ?? 0;
    final note = order['note'] as String?;
    final isCancellable = ['PENDING', 'PENDING_SMS', 'CONFIRMED', 'ASSIGNED'].contains(status);

    return RefreshIndicator(
      onRefresh: _loadOrder,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Status badge
          Center(
            child: Chip(
              label: Text(statusLabel, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
              backgroundColor: _statusColor(status),
            ),
          ),
          const SizedBox(height: 24),

          // Status timeline
          _buildTimeline(status),
          const SizedBox(height: 24),

          // Order info card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Order Info', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  const SizedBox(height: 12),
                  _infoRow('Tank', '${tank?['capacityKg'] ?? '?'}kg'),
                  _infoRow('Retailer', retailer?['businessName'] ?? 'Unknown'),
                  _infoRow('Date', createdAt),
                  if (note != null && note.isNotEmpty) _infoRow('Note', note),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Price breakdown card
          if (basePrice > 0)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Price Breakdown', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 12),
                    _infoRow('Base Price', '₱${basePrice.toStringAsFixed(0)}'),
                    if (discountAmount > 0)
                      _infoRow('Discount', '-₱${discountAmount.toStringAsFixed(0)}', valueColor: AppColors.secondary),
                    const Divider(),
                    _infoRow('Total', '₱${finalAmount.toStringAsFixed(0)}',
                      titleStyle: const TextStyle(fontWeight: FontWeight.bold),
                      valueStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 24),

          // Cancel button
          if (isCancellable)
            OutlinedButton(
              onPressed: _isCancelling ? null : _cancelOrder,
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.danger,
                side: const BorderSide(color: AppColors.danger),
                minimumSize: const Size(double.infinity, 48),
              ),
              child: _isCancelling
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Cancel Order'),
            ),
        ],
      ),
    );
  }

  Widget _buildTimeline(String currentStatus) {
    // Timeline steps in order
    const steps = [
      {'status': 'PENDING', 'label': 'Order Placed', 'icon': Icons.receipt_long},
      {'status': 'CONFIRMED', 'label': 'Confirmed', 'icon': Icons.check_circle_outline},
      {'status': 'ASSIGNED', 'label': 'Rider Assigned', 'icon': Icons.person_pin},
      {'status': 'OUT_FOR_DELIVERY', 'label': 'On the Way', 'icon': Icons.delivery_dining},
      {'status': 'DELIVERED', 'label': 'Delivered', 'icon': Icons.done_all},
    ];

    // Determine which step we're at
    final statusOrder = steps.map((s) => s['status'] as String).toList();
    int currentIndex = statusOrder.indexOf(currentStatus);

    // Handle cancelled/rejected — show all steps as grey except mark the cancellation
    final isCancelled = currentStatus.startsWith('CANCELLED') || currentStatus == 'REJECTED';
    if (isCancelled) currentIndex = -1; // all grey

    return Column(
      children: [
        for (int i = 0; i < steps.length; i++) ...[
          _timelineStep(
            icon: steps[i]['icon'] as IconData,
            label: steps[i]['label'] as String,
            isCompleted: !isCancelled && i <= currentIndex,
            isCurrent: !isCancelled && i == currentIndex,
          ),
          if (i < steps.length - 1)
            _timelineConnector(isCompleted: !isCancelled && i < currentIndex),
        ],
        // Show cancellation step if applicable
        if (isCancelled) ...[
          _timelineConnector(isCompleted: false),
          _timelineStep(
            icon: Icons.cancel,
            label: currentStatus == 'REJECTED' ? 'Rejected' : 'Cancelled',
            isCompleted: true,
            isCurrent: true,
            color: AppColors.danger,
          ),
        ],
      ],
    );
  }

  Widget _timelineStep({
    required IconData icon,
    required String label,
    required bool isCompleted,
    required bool isCurrent,
    Color? color,
  }) {
    final stepColor = color ?? (isCompleted ? AppColors.primary : Colors.grey.shade400);

    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isCompleted ? stepColor : Colors.transparent,
            border: Border.all(color: stepColor, width: 2),
          ),
          child: Icon(icon, size: 18, color: isCompleted ? Colors.white : stepColor),
        ),
        const SizedBox(width: 12),
        Text(
          label,
          style: TextStyle(
            fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
            color: isCompleted ? AppColors.textPrimary : AppColors.textSecondary,
          ),
        ),
      ],
    );
  }

  Widget _timelineConnector({required bool isCompleted}) {
    return Padding(
      padding: const EdgeInsets.only(left: 17), // center under the 36px circle
      child: Container(
        width: 2,
        height: 24,
        color: isCompleted ? AppColors.primary : Colors.grey.shade300,
      ),
    );
  }

  Widget _infoRow(String title, String value, {
    Color? valueColor,
    TextStyle? titleStyle,
    TextStyle? valueStyle,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: titleStyle ?? const TextStyle(color: AppColors.textSecondary)),
          Text(value, style: valueStyle ?? TextStyle(color: valueColor ?? AppColors.textPrimary)),
        ],
      ),
    );
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'PENDING':
      case 'PENDING_SMS':
        return Colors.grey;
      case 'CONFIRMED':
      case 'ASSIGNED':
        return AppColors.warning;
      case 'OUT_FOR_DELIVERY':
        return AppColors.primary;
      case 'DELIVERED':
        return AppColors.secondary;
      case 'CANCELLED_BY_CUSTOMER':
      case 'CANCELLED_BY_RETAILER':
      case 'REJECTED':
        return AppColors.danger;
      default:
        return Colors.grey;
    }
  }
}
```

**Design decisions:**
- Status timeline is a custom widget (vertical column of circles + connectors) — no external package needed
- Timeline shows 5 steps: Placed → Confirmed → Assigned → On the Way → Delivered
- Cancelled/rejected orders show all steps grey + a red cancellation step at the end
- Cancel button only visible for PENDING/PENDING_SMS/CONFIRMED/ASSIGNED (matches backend validation)
- Confirmation dialog before cancel to prevent accidental taps
- Uses `LoadingWidget` and `AppErrorWidget` from Chunk 1 shared widgets
- Price breakdown with discount shown in green, includes peso sign (₱)
- Pull-to-refresh to reload order status

**Files created:**
- `apps/mobile/lib/features/orders/presentation/screens/order_detail_screen.dart`

---

## Step 5: Wire Order History Taps and Add Route

### Update `order_history_screen.dart`

Add `onTap` to each order card and update status colors to match the full 9-state set:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/loading_widget.dart';
import '../../../../shared/widgets/empty_state_widget.dart';
import '../../data/orders_repository.dart';

class OrderHistoryScreen extends ConsumerStatefulWidget {
  const OrderHistoryScreen({super.key});

  @override
  ConsumerState<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends ConsumerState<OrderHistoryScreen> {
  List<Map<String, dynamic>> _orders = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    try {
      final repo = ref.read(ordersRepositoryProvider);
      _orders = await repo.getOrders();
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'PENDING':
      case 'PENDING_SMS':
        return Colors.grey;
      case 'CONFIRMED':
      case 'ASSIGNED':
        return AppColors.warning;
      case 'OUT_FOR_DELIVERY':
        return AppColors.primary;
      case 'DELIVERED':
        return AppColors.secondary;
      case 'CANCELLED_BY_CUSTOMER':
      case 'CANCELLED_BY_RETAILER':
      case 'REJECTED':
        return AppColors.danger;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Orders')),
      body: RefreshIndicator(
        onRefresh: () async {
          setState(() => _isLoading = true);
          await _loadOrders();
        },
        child: _isLoading
            ? const LoadingWidget()
            : _orders.isEmpty
                ? const EmptyStateWidget(
                    icon: Icons.receipt_long,
                    message: 'No orders yet',
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _orders.length,
                    itemBuilder: (context, index) {
                      final order = _orders[index];
                      final statusLabel = order['statusLabel'] as String? ?? order['status'];
                      return Card(
                        child: ListTile(
                          title: Text('${order['tank']?['capacityKg'] ?? '?'}kg Gas'),
                          subtitle: Text(order['createdAt']?.toString().substring(0, 10) ?? ''),
                          trailing: Chip(
                            label: Text(statusLabel, style: const TextStyle(color: Colors.white, fontSize: 12)),
                            backgroundColor: _statusColor(order['status']),
                          ),
                          onTap: () => context.push('/orders/${order['id']}'),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
```

**Changes from current:**
- Added `onTap` to `ListTile` — pushes to `/orders/${order['id']}`
- Updated status colors to handle all 9 states (was only 4)
- Uses `statusLabel` from API response (customer-friendly label) instead of raw status in the chip
- Replaced inline loading/empty with `LoadingWidget` and `EmptyStateWidget` from Chunk 1
- Added `RefreshIndicator` for pull-to-refresh
- AppBar title simplified to "Orders" (it's now a tab, not a pushed screen)

**Files modified:**
- `apps/mobile/lib/features/orders/presentation/screens/order_history_screen.dart`

### Add route to `app_router.dart`

Add import and route in the push-only section (outside shell, no bottom nav — detail screen is a drill-down):

```dart
// Add import at top:
import '../features/orders/presentation/screens/order_detail_screen.dart';

// Add in push-only routes section:
GoRoute(
  path: '/orders/:orderId',
  builder: (_, state) => OrderDetailScreen(
    orderId: state.pathParameters['orderId']!,
  ),
),
```

**Files modified:**
- `apps/mobile/lib/router/app_router.dart`

---

## Summary of Changes

| File | Action | What Changes |
|------|--------|-------------|
| `pubspec.yaml` | Modify | Add `mobile_scanner: ^6.0.2` |
| `AndroidManifest.xml` | Modify | Add CAMERA permission |
| `Info.plist` | Modify | Add camera usage description |
| `link_retailer_screen.dart` | Modify | Add QR scan toggle, MobileScanner widget, deep link parsing |
| `orders_repository.dart` | Modify | Add `getOrder` and `cancelOrder` methods |
| `order_detail_screen.dart` | Create | Status timeline, price breakdown, cancel button |
| `order_history_screen.dart` | Modify | Add `onTap` navigation, full 9-state colors, shared widgets, pull-to-refresh |
| `app_router.dart` | Modify | Add `/orders/:orderId` route with path parameter |

**Total: 1 file created, 7 files modified. One new dependency (`mobile_scanner`).**

---

## Verification

1. `flutter pub get` — succeeds with `mobile_scanner` added
2. `flutter analyze` — no errors
3. **QR scanning:** Link Retailer screen -> tap QR icon in AppBar -> camera opens inline -> scan a QR code -> code populates, retailer preview appears -> "Link This Retailer" works
4. **Deep link QR:** Scan a QR containing `https://app.preemptly.com/join/GASEXP01` -> parses to code `GASEXP01` -> lookup works
5. **Manual entry still works:** Toggle back to keyboard mode -> enter code manually -> same flow as before
6. **Order detail:** Orders tab -> tap any order -> navigates to detail screen (no bottom nav)
7. **Status timeline:** PENDING order shows first step filled, rest grey. DELIVERED order shows all steps filled.
8. **Price breakdown:** Shows base price, discount (green), total with peso sign
9. **Cancel:** PENDING order shows "Cancel Order" button -> tap -> confirmation dialog -> cancels -> pops back to orders list
10. **Cancel hidden:** DELIVERED or CANCELLED order does NOT show cancel button
11. **Pull-to-refresh:** Pull down on orders list -> reloads. Pull down on order detail -> reloads.
12. **Cancelled timeline:** Cancelled order shows grey steps + red "Cancelled" step at end
