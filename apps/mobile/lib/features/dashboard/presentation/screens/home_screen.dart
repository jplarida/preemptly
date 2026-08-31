import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:percent_indicator/circular_percent_indicator.dart';
import '../../../../core/theme/app_colors.dart';
import '../providers/dashboard_provider.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(dashboardProvider.notifier).loadDashboard());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('PreEmptly'),
        actions: [
          IconButton(icon: const Icon(Icons.settings), onPressed: () => context.push('/settings')),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(dashboardProvider.notifier).loadDashboard(),
        child: state.isLoading && state.prediction == null
            ? const Center(child: CircularProgressIndicator())
            : state.prediction == null
                ? _buildEmptyState(context)
                : _buildDashboard(context, state),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(Icons.propane_tank, size: 80, color: Colors.grey.shade400),
        const SizedBox(height: 16),
        const Text('No tanks set up yet'),
        const SizedBox(height: 16),
        ElevatedButton(
          onPressed: () => context.push('/onboarding'),
          child: const Text('Set Up Your Tank'),
        ),
      ]),
    );
  }

  Widget _buildDashboard(BuildContext context, DashboardState state) {
    final prediction = state.prediction!;
    final daysElapsed = prediction['daysElapsed'] as int;
    final totalDays = prediction['estimatedTotalDays'] as int;
    final remaining = prediction['estimatedRemainingDays'] as int;
    final range = prediction['displayRange'] as Map<String, dynamic>;
    final confidence = prediction['confidence'] as String;
    final refillCount = prediction['refillCount'] as int;
    final progress = totalDays > 0 ? (daysElapsed / totalDays).clamp(0.0, 1.0) : 0.0;

    Color progressColor;
    if (remaining <= 5) {
      progressColor = AppColors.gasLow;
    } else if (remaining <= 10) {
      progressColor = AppColors.gasMedium;
    } else {
      progressColor = AppColors.gasHigh;
    }

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        // Gas level indicator
        Center(
          child: CircularPercentIndicator(
            radius: 120.0,
            lineWidth: 14.0,
            percent: progress,
            center: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              Text('Day $daysElapsed', style: const TextStyle(fontSize: 16, color: AppColors.textSecondary)),
              Text('of ~$totalDays', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
            ]),
            progressColor: progressColor,
            backgroundColor: Colors.grey.shade200,
            circularStrokeCap: CircularStrokeCap.round,
          ),
        ),
        const SizedBox(height: 24),

        // Remaining days
        Center(
          child: Text(
            '~${range['low']}-${range['high']} days remaining',
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
          ),
        ),
        const SizedBox(height: 8),
        Center(
          child: Text(
            refillCount == 0
                ? 'Getting to know your usage...'
                : 'Based on $refillCount refill${refillCount > 1 ? 's' : ''}',
            style: TextStyle(
              fontSize: 14,
              color: AppColors.textSecondary,
              fontStyle: refillCount == 0 ? FontStyle.italic : FontStyle.normal,
            ),
          ),
        ),
        const SizedBox(height: 24),

        // Adjustment card
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('How was your cooking this week?', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
                _adjustButton('More than usual', 'COOKED_MORE', Icons.whatshot),
                _adjustButton('Normal', 'NORMAL', Icons.restaurant),
                _adjustButton('Less than usual', 'COOKED_LESS', Icons.eco),
              ]),
            ]),
          ),
        ),
        const SizedBox(height: 16),

        // Refill prompt
        if (remaining <= 7)
          Card(
            color: AppColors.warning.withValues(alpha: 0.1),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(children: [
                const Text('Gas running low!', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.warning)),
                const SizedBox(height: 8),
                const Text('Did you get a new tank?'),
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => ref.read(dashboardProvider.notifier).logRefill(),
                      child: const Text('Just now'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _showDatePicker(),
                      child: const Text('A few days ago'),
                    ),
                  ),
                ]),
              ]),
            ),
          ),
        const SizedBox(height: 16),

        // Order button
        ElevatedButton.icon(
          onPressed: () => context.push('/orders/create'),
          icon: const Icon(Icons.shopping_cart),
          label: const Text('Order Gas'),
        ),
      ],
    );
  }

  Widget _adjustButton(String label, String value, IconData icon) {
    return InkWell(
      onTap: () => ref.read(dashboardProvider.notifier).adjustUsage(value),
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Column(children: [
          Icon(icon, color: AppColors.primary),
          const SizedBox(height: 4),
          Text(label, style: const TextStyle(fontSize: 11), textAlign: TextAlign.center),
        ]),
      ),
    );
  }

  Future<void> _showDatePicker() async {
    final date = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now().subtract(const Duration(days: 14)),
      lastDate: DateTime.now(),
    );
    if (date != null) {
      ref.read(dashboardProvider.notifier).logRefill(refillDate: date.toIso8601String());
    }
  }
}
