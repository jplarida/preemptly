import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/providers/core_providers.dart';
import '../../../../core/theme/app_colors.dart';

class LinkRetailerScreen extends ConsumerStatefulWidget {
  const LinkRetailerScreen({super.key});

  @override
  ConsumerState<LinkRetailerScreen> createState() => _LinkRetailerScreenState();
}

class _LinkRetailerScreenState extends ConsumerState<LinkRetailerScreen> {
  final _codeController = TextEditingController();
  Map<String, dynamic>? _retailerPreview;
  bool _isLoading = false;
  bool _isLinking = false;

  Future<void> _lookupCode() async {
    if (_codeController.text.isEmpty) return;
    setState(() => _isLoading = true);
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.dio.get('/link/retailer/${_codeController.text.trim()}');
      setState(() => _retailerPreview = res.data);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Invalid code')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _linkRetailer() async {
    setState(() => _isLinking = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.dio.post('/link/retailer', data: {
        'code': _codeController.text.trim(),
        'method': 'MANUAL_CODE',
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Retailer linked!')));
        context.pop();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _isLinking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Link Retailer')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Enter Invite Code', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          Row(children: [
            Expanded(child: TextField(
              controller: _codeController,
              decoration: const InputDecoration(hintText: 'e.g. GASEXP01'),
              textCapitalization: TextCapitalization.characters,
            )),
            const SizedBox(width: 12),
            ElevatedButton(
              onPressed: _isLoading ? null : _lookupCode,
              style: ElevatedButton.styleFrom(minimumSize: const Size(80, 52)),
              child: _isLoading ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Find'),
            ),
          ]),
          if (_retailerPreview != null) ...[
            const SizedBox(height: 24),
            Card(child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(_retailerPreview!['businessName'], style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(_retailerPreview!['city'], style: const TextStyle(color: AppColors.textSecondary)),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _isLinking ? null : _linkRetailer,
                  child: _isLinking
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Link This Retailer'),
                ),
              ]),
            )),
          ],
        ]),
      ),
    );
  }

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }
}
