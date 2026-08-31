'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/use-auth';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '\u{1F4CA}' },
  { href: '/dashboard/customers', label: 'Customers', icon: '\u{1F465}' },
  { href: '/dashboard/orders', label: 'Orders', icon: '\u{1F4E6}' },
  { href: '/dashboard/invite', label: 'Invite', icon: '\u{1F517}' },
  { href: '/dashboard/settings', label: 'Settings', icon: '\u2699\uFE0F' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r min-h-screen p-4 flex flex-col">
        <div className="text-xl font-bold text-blue-600 mb-8 px-3">PreEmptly</div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${pathname === item.href ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>
        <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 rounded-lg mt-auto">
          {'\u{1F6AA}'} Logout
        </button>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
