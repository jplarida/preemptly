import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/auth_repository.dart';

enum AuthStatus { initial, loading, otpSent, authenticated, error }

class AuthState {
  final AuthStatus status;
  final String? phone;
  final bool isNewUser;
  final String? errorMessage;
  final Map<String, dynamic>? user;

  AuthState({
    this.status = AuthStatus.initial,
    this.phone,
    this.isNewUser = false,
    this.errorMessage,
    this.user,
  });

  AuthState copyWith({
    AuthStatus? status,
    String? phone,
    bool? isNewUser,
    String? errorMessage,
    Map<String, dynamic>? user,
  }) {
    return AuthState(
      status: status ?? this.status,
      phone: phone ?? this.phone,
      isNewUser: isNewUser ?? this.isNewUser,
      errorMessage: errorMessage,
      user: user ?? this.user,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repository;

  AuthNotifier(this._repository) : super(AuthState());

  Future<void> sendOtp(String phone) async {
    state = state.copyWith(status: AuthStatus.loading, phone: phone);
    try {
      await _repository.sendOtp(phone);
      state = state.copyWith(status: AuthStatus.otpSent);
    } catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: e.toString());
    }
  }

  Future<void> verifyOtp(String code) async {
    state = state.copyWith(status: AuthStatus.loading);
    try {
      final result = await _repository.verifyOtp(state.phone!, code);
      state = state.copyWith(
        status: AuthStatus.authenticated,
        isNewUser: result['isNewUser'] as bool,
        user: result['user'] as Map<String, dynamic>,
      );
    } catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: 'Invalid OTP. Please try again.');
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    state = AuthState();
  }

  Future<void> checkAuth() async {
    final loggedIn = await _repository.isLoggedIn();
    if (loggedIn) {
      state = state.copyWith(status: AuthStatus.authenticated);
    }
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.read(authRepositoryProvider));
});
