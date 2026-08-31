import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/core_providers.dart';

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

  Future<Map<String, dynamic>> logRefill(String tankId, {String? refillDate}) async {
    final api = ref.read(apiClientProvider);
    final response = await api.dio.post('/refills', data: {
      'tankId': tankId,
      if (refillDate != null) 'refillDate': refillDate,
    });
    return response.data;
  }

  Future<Map<String, dynamic>> adjustTank(String tankId, String adjustment) async {
    final api = ref.read(apiClientProvider);
    final response = await api.dio.post('/tanks/$tankId/adjust', data: {
      'adjustment': adjustment,
    });
    return response.data;
  }
}

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) => DashboardRepository(ref));
