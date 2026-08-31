import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Future<void> saveToken(String token) async {
    await _storage.write(key: 'access_token', value: token);
  }

  Future<String?> getToken() async {
    return _storage.read(key: 'access_token');
  }

  Future<void> deleteToken() async {
    await _storage.delete(key: 'access_token');
  }

  Future<void> saveUserId(String userId) async {
    await _storage.write(key: 'user_id', value: userId);
  }

  Future<String?> getUserId() async {
    return _storage.read(key: 'user_id');
  }

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
