'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Retailer {
  inviteCode: string;
  inviteLink: string;
}

interface InviteStats {
  totalClicks: number;
  totalJoins: number;
  dailyStats: Array<{ date: string; clicks: number; joins: number }>;
}

export default function InvitePage() {
  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [stats, setStats] = useState<InviteStats | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.get('/retailers/me').then(setRetailer).catch(console.error);
    api.get('/retailers/me/invite-stats').then(setStats).catch(console.error);
  }, []);

  const copyLink = () => {
    if (retailer) {
      navigator.clipboard.writeText(`https://${retailer.inviteLink}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Invite Customers</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">Your Invite Link</h2>
          {retailer && (
            <>
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm break-all mb-4">
                https://{retailer.inviteLink}
              </div>
              <button onClick={copyLink}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700">
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-gray-500 mb-2">Invite Code</div>
                <div className="text-2xl font-bold tracking-widest text-center text-blue-600">{retailer.inviteCode}</div>
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">Invite Stats</h2>
          {stats && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-700">{stats.totalClicks}</div>
                <div className="text-sm text-blue-600">Total Clicks</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-700">{stats.totalJoins}</div>
                <div className="text-sm text-green-600">Customers Joined</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 col-span-2">
                <div className="text-2xl font-bold text-purple-700">
                  {stats.totalClicks > 0 ? Math.round((stats.totalJoins / stats.totalClicks) * 100) : 0}%
                </div>
                <div className="text-sm text-purple-600">Conversion Rate</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
