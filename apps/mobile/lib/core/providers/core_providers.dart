import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import '../network/offline_queue.dart';
import '../storage/secure_storage.dart';

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());
final offlineQueueProvider = Provider<OfflineQueue>((ref) => OfflineQueue());
final secureStorageProvider = Provider<SecureStorageService>((ref) => SecureStorageService());
