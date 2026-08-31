import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../data/orders_repository.dart';
import '../../../dashboard/presentation/providers/dashboard_provider.dart';

class CreateOrderScreen extends ConsumerStatefulWidget {
  const CreateOrderScreen({super.key});

  @override
  ConsumerState<CreateOrderScreen> createState() => _CreateOrderScreenState();
}

class _CreateOrderScreenState extends ConsumerState<CreateOrderScreen> {
  final _noteController = TextEditingController();
  List<Map<String, dynamic>> _retailers = [];
  String? _selectedRetailerId;
  bool _isLoading = true;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _loadRetailers();
  }

  Future<void> _loadRetailers() async {
    try {
      final repo = ref.read(ordersRepositoryProvider);
      _retailers = await repo.getLinkedRetailers();
      if (_retailers.isNotEmpty) {
        _selectedRetailerId = _retailers.first['retailer']['id'];
      }
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    final dashState = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Order Gas')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _retailers.isEmpty
              ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(Icons.store, size: 64, color: Colors.grey.shade400),
                  const SizedBox(height: 16),
                  const Text('No linked retailers'),
                  const SizedBox(height: 8),
                  ElevatedButton(
                    onPressed: () => context.push('/link-retailer'),
                    child: const Text('Link a Retailer'),
                  ),
                ]))
              : Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('Select Retailer', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 12),
                    ...(_retailers.map((r) {
                      final retailer = r['retailer'];
                      final id = retailer['id'] as String;
                      return RadioListTile<String>(
                        value: id,
                        groupValue: _selectedRetailerId,
                        onChanged: (v) => setState(() => _selectedRetailerId = v),
                        title: Text(retailer['businessName']),
                        subtitle: Text(retailer['city']),
                      );
                    })),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _noteController,
                      decoration: const InputDecoration(labelText: 'Note (optional)', hintText: 'e.g. Please deliver before 5pm'),
                      maxLines: 2,
                    ),
                    const Spacer(),
                    if (dashState.tank != null)
                      Text('Tank: ${dashState.tank!['capacityKg']}kg', style: const TextStyle(color: AppColors.textSecondary)),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _isSubmitting ? null : _submitOrder,
                      child: _isSubmitting
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Confirm Order'),
                    ),
                  ]),
                ),
    );
  }

  Future<void> _submitOrder() async {
    if (_selectedRetailerId == null) return;
    final dashState = ref.read(dashboardProvider);
    if (dashState.tank == null) return;

    setState(() => _isSubmitting = true);
    try {
      final repo = ref.read(ordersRepositoryProvider);
      await repo.createOrder(
        dashState.tank!['id'],
        _selectedRetailerId!,
        note: _noteController.text.isNotEmpty ? _noteController.text : null,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order placed!')));
        context.pop();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }
}
