'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface Order {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
  customer: { name: string | null; phone: string };
  tank: { capacityKg: number };
}

const statusStyles: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const loadOrders = useCallback(async () => {
    try {
      const data = await api.get(`/retailers/me/orders${filter ? `?status=${filter}` : ''}`);
      setOrders(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Poll for new orders every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status });
      loadOrders();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <div className="animate-pulse"><div className="h-64 bg-gray-200 rounded-xl" /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <div className="flex gap-2">
          {['', 'PENDING', 'CONFIRMED', 'COMPLETED'].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f || 'All'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Order</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Tank</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-mono text-sm text-gray-600">{order.id.slice(0, 8)}</div>
                  {order.note && <div className="text-xs text-gray-400 mt-1">{order.note}</div>}
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium">{order.customer.name || 'Unnamed'}</div>
                  <div className="text-sm text-gray-500">{order.customer.phone}</div>
                </td>
                <td className="px-6 py-4 text-gray-600">{order.tank.capacityKg}kg</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[order.status]}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500 text-sm">{new Date(order.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {order.status === 'PENDING' && (
                      <>
                        <button onClick={() => updateStatus(order.id, 'CONFIRMED')}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">Confirm</button>
                        <button onClick={() => updateStatus(order.id, 'CANCELLED')}
                          className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-300">Cancel</button>
                      </>
                    )}
                    {order.status === 'CONFIRMED' && (
                      <button onClick={() => updateStatus(order.id, 'COMPLETED')}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700">Complete</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <div className="text-center py-12 text-gray-400">No orders found</div>}
      </div>
    </div>
  );
}
