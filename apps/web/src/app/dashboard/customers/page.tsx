'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Customer {
  id: string;
  name: string | null;
  phone: string;
  tankCapacityKg: number | null;
  status: 'running_low' | 'okay' | 'new';
  daysRemaining: number | null;
  displayRange: { low: number; high: number } | null;
  lastRefillDate: string | null;
  linkedDate: string;
}

const statusStyles: Record<string, string> = {
  running_low: 'bg-red-100 text-red-700',
  okay: 'bg-green-100 text-green-700',
  new: 'bg-blue-100 text-blue-700',
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    api.get('/retailers/me/customers').then(setCustomers).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? customers : customers.filter((c) => c.status === filter);

  if (loading) return <div className="animate-pulse"><div className="h-64 bg-gray-200 rounded-xl" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <div className="flex gap-2">
          {['all', 'running_low', 'okay', 'new'].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Tank</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Days Remaining</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Last Refill</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{customer.name || 'Unnamed'}</div>
                  <div className="text-sm text-gray-500">{customer.phone}</div>
                </td>
                <td className="px-6 py-4 text-gray-600">{customer.tankCapacityKg ? `${customer.tankCapacityKg}kg` : '-'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[customer.status]}`}>
                    {customer.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {customer.displayRange ? `${customer.displayRange.low}-${customer.displayRange.high} days` : '-'}
                </td>
                <td className="px-6 py-4 text-gray-500 text-sm">
                  {customer.lastRefillDate ? new Date(customer.lastRefillDate).toLocaleDateString() : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-gray-400">No customers found</div>}
      </div>
    </div>
  );
}
