import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/providers/core_providers.dart';

class AuthRepository {
  final Ref ref;

  AuthRepository(this.ref);

  Future<Map<String, dynamic>> sendOtp(String phone) async {
    final api = ref.read(apiClientProvider);
    final response = await api.dio.post('/auth/send-otp', data: {'phone': phone});
    return response.data;
  }

  Future<Map<String, dynamic>> verifyOtp(String phone, String code) async {
    final api = ref.read(apiClientProvider);
    final response = await api.dio.post('/auth/verify-otp', data: {
      'phone': phone,
      'code': code,
    });

    // Save token
    final token = response.data['accessToken'] as String;
    await api.setToken(token);

    return response.data;
  }

  Future<void> logout() async {
    final api = ref.read(apiClientProvider);
    await api.clearToken();
  }

  Future<bool> isLoggedIn() async {
    final api = ref.read(apiClientProvider);
    final token = await api.getToken();
    return token != null;
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) => AuthRepository(ref));
