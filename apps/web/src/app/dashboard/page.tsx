'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface DashboardStats {
  customerCount: number;
  pendingOrders: number;
  runningLowCount: number;
  newThisMonth: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/retailers/me/dashboard').then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-32 bg-gray-200 rounded-xl" /><div className="h-32 bg-gray-200 rounded-xl" /></div>;

  const cards = [
    { label: 'Total Customers', value: stats?.customerCount ?? 0, color: 'bg-blue-50 text-blue-700' },
    { label: 'Pending Orders', value: stats?.pendingOrders ?? 0, color: 'bg-yellow-50 text-yellow-700' },
    { label: 'Running Low', value: stats?.runningLowCount ?? 0, color: 'bg-red-50 text-red-700' },
    { label: 'New This Month', value: stats?.newThisMonth ?? 0, color: 'bg-green-50 text-green-700' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className={`${card.color} rounded-xl p-6`}>
            <div className="text-3xl font-bold">{card.value}</div>
            <div className="text-sm mt-1 opacity-80">{card.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
