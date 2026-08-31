import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/dashboard_repository.dart';

class DashboardState {
  final bool isLoading;
  final Map<String, dynamic>? tank;
  final Map<String, dynamic>? prediction;
  final String? errorMessage;

  DashboardState({this.isLoading = false, this.tank, this.prediction, this.errorMessage});

  DashboardState copyWith({bool? isLoading, Map<String, dynamic>? tank, Map<String, dynamic>? prediction, String? errorMessage}) {
    return DashboardState(
      isLoading: isLoading ?? this.isLoading,
      tank: tank ?? this.tank,
      prediction: prediction ?? this.prediction,
      errorMessage: errorMessage,
    );
  }
}

class DashboardNotifier extends StateNotifier<DashboardState> {
  final DashboardRepository _repository;

  DashboardNotifier(this._repository) : super(DashboardState());

  Future<void> loadDashboard() async {
    state = state.copyWith(isLoading: true);
    try {
      final tanks = await _repository.getTanks();
      if (tanks.isEmpty) {
        state = state.copyWith(isLoading: false);
        return;
      }
      final tank = tanks.first;
      final prediction = await _repository.getPrediction(tank['id']);
      state = state.copyWith(isLoading: false, tank: tank, prediction: prediction);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  Future<void> logRefill({String? refillDate}) async {
    if (state.tank == null) return;
    state = state.copyWith(isLoading: true);
    try {
      await _repository.logRefill(state.tank!['id'], refillDate: refillDate);
      await loadDashboard();
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  Future<void> adjustUsage(String adjustment) async {
    if (state.tank == null) return;
    try {
      final prediction = await _repository.adjustTank(state.tank!['id'], adjustment);
      state = state.copyWith(prediction: prediction);
    } catch (e) {
      state = state.copyWith(errorMessage: e.toString());
    }
  }
}

final dashboardProvider = StateNotifierProvider<DashboardNotifier, DashboardState>((ref) {
  return DashboardNotifier(ref.read(dashboardRepositoryProvider));
});
