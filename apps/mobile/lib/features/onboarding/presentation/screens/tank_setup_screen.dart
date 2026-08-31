import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/providers/core_providers.dart';

class TankSetupScreen extends ConsumerStatefulWidget {
  const TankSetupScreen({super.key});

  @override
  ConsumerState<TankSetupScreen> createState() => _TankSetupScreenState();
}

class _TankSetupScreenState extends ConsumerState<TankSetupScreen> {
  int _step = 0;
  double _selectedSize = 11;
  String _locationType = 'HOME';
  String _usageLevel = 'MODERATE';
  bool _isLoading = false;

  final _sizes = [2.7, 11.0, 22.0, 50.0];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Setup Your Tank (${_step + 1}/3)'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Expanded(child: _buildStep()),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _isLoading ? null : _onNext,
              child: _isLoading
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text(_step < 2 ? 'Next' : 'Start Tracking'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep() {
    switch (_step) {
      case 0:
        return _buildSizeStep();
      case 1:
        return _buildTypeStep();
      case 2:
        return _buildIntensityStep();
      default:
        return const SizedBox();
    }
  }

  Widget _buildSizeStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('What size is your LPG tank?', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 24),
        ...(_sizes.map((size) => Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: GestureDetector(
            onTap: () => setState(() => _selectedSize = size),
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _selectedSize == size ? AppColors.primary : Colors.grey.shade300,
                  width: _selectedSize == size ? 2 : 1,
                ),
                color: _selectedSize == size ? AppColors.primary.withValues(alpha: 0.05) : Colors.white,
              ),
              child: Row(
                children: [
                  Icon(Icons.propane_tank, color: _selectedSize == size ? AppColors.primary : Colors.grey, size: 32),
                  const SizedBox(width: 16),
                  Text('${size}kg', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: _selectedSize == size ? AppColors.primary : AppColors.textPrimary)),
                ],
              ),
            ),
          ),
        ))),
      ],
    );
  }

  Widget _buildTypeStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Where is this tank used?', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 24),
        _buildTypeCard('HOME', 'Home', 'For household cooking', Icons.home),
        const SizedBox(height: 12),
        _buildTypeCard('BUSINESS', 'Business', 'Restaurant, food stall, etc.', Icons.store),
      ],
    );
  }

  Widget _buildTypeCard(String value, String title, String subtitle, IconData icon) {
    final selected = _locationType == value;
    return GestureDetector(
      onTap: () => setState(() => _locationType = value),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: selected ? AppColors.primary : Colors.grey.shade300, width: selected ? 2 : 1),
          color: selected ? AppColors.primary.withValues(alpha: 0.05) : Colors.white,
        ),
        child: Row(children: [
          Icon(icon, color: selected ? AppColors.primary : Colors.grey, size: 36),
          const SizedBox(width: 16),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: selected ? AppColors.primary : AppColors.textPrimary)),
            Text(subtitle, style: TextStyle(color: AppColors.textSecondary)),
          ]),
        ]),
      ),
    );
  }

  Widget _buildIntensityStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('How much do you cook?', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 24),
        _buildIntensityCard('LIGHT', 'Light', '1-2 meals a day, simple dishes'),
        const SizedBox(height: 12),
        _buildIntensityCard('MODERATE', 'Moderate', '2-3 meals a day, typical cooking'),
        const SizedBox(height: 12),
        _buildIntensityCard('HEAVY', 'Heavy', 'Frequent cooking, large portions'),
      ],
    );
  }

  Widget _buildIntensityCard(String value, String title, String description) {
    final selected = _usageLevel == value;
    return GestureDetector(
      onTap: () => setState(() => _usageLevel = value),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: selected ? AppColors.primary : Colors.grey.shade300, width: selected ? 2 : 1),
          color: selected ? AppColors.primary.withValues(alpha: 0.05) : Colors.white,
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: selected ? AppColors.primary : AppColors.textPrimary)),
          const SizedBox(height: 4),
          Text(description, style: TextStyle(color: AppColors.textSecondary)),
        ]),
      ),
    );
  }

  Future<void> _onNext() async {
    if (_step < 2) {
      setState(() => _step++);
      return;
    }

    setState(() => _isLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      // Create location
      final locRes = await api.dio.post('/locations', data: {
        'address': 'My Home',
        'type': _locationType,
      });
      final locationId = locRes.data['id'];
      // Create tank
      await api.dio.post('/tanks', data: {
        'locationId': locationId,
        'capacityKg': _selectedSize,
        'model': 'EXCHANGE',
        'usageLevel': _usageLevel,
      });
      if (mounted) context.go('/home');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
}
