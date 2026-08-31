import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
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
      case 'PENDING': return AppColors.warning;
      case 'CONFIRMED': return AppColors.primary;
      case 'COMPLETED': return AppColors.secondary;
      case 'CANCELLED': return AppColors.danger;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Order History')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _orders.isEmpty
              ? const Center(child: Text('No orders yet'))
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _orders.length,
                  itemBuilder: (context, index) {
                    final order = _orders[index];
                    return Card(
                      child: ListTile(
                        title: Text('${order['tank']?['capacityKg'] ?? '?'}kg Gas'),
                        subtitle: Text(order['createdAt']?.toString().substring(0, 10) ?? ''),
                        trailing: Chip(
                          label: Text(order['status'], style: const TextStyle(color: Colors.white, fontSize: 12)),
                          backgroundColor: _statusColor(order['status']),
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
