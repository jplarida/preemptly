'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ businessName: '', ownerName: '', phone: '', address: '', city: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/retailers/register', form);
      // After registration, go to login to verify via OTP
      router.push('/login');
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const fields = [
    { key: 'businessName', label: 'Business Name', placeholder: 'e.g. Gas Express Makati' },
    { key: 'ownerName', label: 'Owner Name', placeholder: 'e.g. Maria Santos' },
    { key: 'phone', label: 'Phone Number', placeholder: '+639XXXXXXXXX' },
    { key: 'address', label: 'Business Address', placeholder: '123 Rizal St' },
    { key: 'city', label: 'City', placeholder: 'e.g. Makati' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Register as Retailer</h1>
        <p className="text-gray-500 mb-6">Set up your gas retail business</p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input type="text" value={form[f.key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" required />
            </div>
          ))}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 mt-2">
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already registered? <a href="/login" className="text-blue-600 hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
