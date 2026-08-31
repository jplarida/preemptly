'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const [form, setForm] = useState({ businessName: '', ownerName: '', address: '', city: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/retailers/me').then((data) => {
      setForm({ businessName: data.businessName, ownerName: data.ownerName, address: data.address, city: data.city });
      setLoading(false);
    }).catch(console.error);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/retailers/me', form);
      setMessage('Settings saved!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    }
    setSaving(false);
  };

  if (loading) return <div className="animate-pulse"><div className="h-64 bg-gray-200 rounded-xl" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <div className="max-w-lg bg-white rounded-xl border p-6">
        {message && <div className={`p-3 rounded-lg mb-4 text-sm ${message.startsWith('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{message}</div>}
        <form onSubmit={handleSave} className="space-y-4">
          {[
            { key: 'businessName', label: 'Business Name' },
            { key: 'ownerName', label: 'Owner Name' },
            { key: 'address', label: 'Address' },
            { key: 'city', label: 'City' },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input type="text" value={form[f.key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>
          ))}
          <button type="submit" disabled={saving}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
