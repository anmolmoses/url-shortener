'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import ToastContainer from '@/components/ToastContainer';

const navItems = [
  {
    label: 'Links',
    href: '/dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.03a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.374" />
      </svg>
    ),
  },
  {
    label: 'Create New',
    href: '/dashboard/create',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const key = api.getApiKey();
    if (!key) {
      router.push('/login');
      return;
    }
    setApiKey(key);
  }, [router]);

  const maskedKey = apiKey ? `${apiKey.slice(0, 4)}${'•'.repeat(16)}${apiKey.slice(-4)}` : '';

  const handleLogout = () => {
    api.clearApiKey();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-50 font-[Inter]">
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-zinc-800 border border-zinc-700"
        aria-label="Toggle sidebar"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          {sidebarOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          )}
        </svg>
      </button>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full w-60 bg-[#18181B] border-r border-zinc-800 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 lg:w-60 md:w-16`}
      >
        <div className="p-4 border-b border-zinc-800">
          <h1 className="text-lg font-bold text-indigo-400 md:hidden lg:block">⚡ Shortener</h1>
          <h1 className="text-lg font-bold text-indigo-400 hidden md:block lg:hidden">⚡</h1>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {item.icon}
                <span className="md:hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-zinc-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            <span className="md:hidden lg:inline">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="md:ml-16 lg:ml-60">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-14 bg-[#09090B]/80 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between px-6">
          <div className="ml-10 md:ml-0" />
          <div className="flex items-center gap-3">
            <code className="text-xs text-zinc-500 bg-zinc-800/50 px-2.5 py-1 rounded font-mono">
              {maskedKey}
            </code>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>

      <ToastContainer />
    </div>
  );
}
