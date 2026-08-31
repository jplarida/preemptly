import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/core_providers.dart';

class OrdersRepository {
  final Ref ref;

  OrdersRepository(this.ref);

  Future<Map<String, dynamic>> createOrder(String tankId, String retailerId, {String? note}) async {
    final api = ref.read(apiClientProvider);
    final response = await api.dio.post('/orders', data: {
      'tankId': tankId,
      'retailerId': retailerId,
      if (note != null) 'note': note,
    });
    return response.data;
  }

  Future<List<Map<String, dynamic>>> getOrders() async {
    final api = ref.read(apiClientProvider);
    final response = await api.dio.get('/orders');
    return List<Map<String, dynamic>>.from(response.data);
  }

  Future<List<Map<String, dynamic>>> getLinkedRetailers() async {
    final api = ref.read(apiClientProvider);
    final response = await api.dio.get('/link/retailers');
    return List<Map<String, dynamic>>.from(response.data);
  }
}

final ordersRepositoryProvider = Provider<OrdersRepository>((ref) => OrdersRepository(ref));
