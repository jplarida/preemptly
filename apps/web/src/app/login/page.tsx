'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/send-otp', { phone });
      setStep('otp');
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api.post('/auth/retailer/verify-otp', { phone, code });
      api.setToken(result.accessToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Retailer Dashboard</h1>
        <p className="text-gray-500 mb-8">Sign in to manage your gas business</p>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

        {step === 'phone' ? (
          <form onSubmit={sendOtp}>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="+639XXXXXXXXX" className="w-full border rounded-lg px-4 py-3 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp}>
            <label className="block text-sm font-medium text-gray-700 mb-2">Enter OTP sent to {phone}</label>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)}
              placeholder="123456" maxLength={6} className="w-full border rounded-lg px-4 py-3 mb-4 text-center text-2xl tracking-widest focus:ring-2 focus:ring-blue-500 outline-none" />
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
            <button type="button" onClick={() => setStep('phone')} className="w-full mt-2 text-gray-500 text-sm hover:text-gray-700">
              Change phone number
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-400 mt-6">
          Don&apos;t have an account? <a href="/register" className="text-blue-600 hover:underline">Register</a>
        </p>
      </div>
    </div>
  );
}
