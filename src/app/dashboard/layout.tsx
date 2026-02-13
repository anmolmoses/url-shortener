'use client';

import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { maskApiKey } from '@/lib/utils';
import { ToastProvider } from '@/hooks/useToast';

const navItems = [
  {
    href: '/dashboard',
    label: 'Links',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.556a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.374" />
      </svg>
    ),
  },
  {
    href: '/dashboard/create',
    label: 'Create New',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
];

/**
 * Dashboard shell: sidebar nav, top bar with masked API key.
 * Responsive — sidebar collapses to icons at <1024px, hamburger drawer at <768px.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    setApiKey(localStorage.getItem('apiKey') ?? '');
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-zinc-800">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.556a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.374" />
            </svg>
          </div>
          {!collapsed && <span className="text-sm font-semibold text-zinc-100">LinkForge</span>}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive(item.href)
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            } ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? item.label : undefined}
          >
            {item.icon}
            {!collapsed && item.label}
          </Link>
        ))}
      </nav>

      {/* API Key display (bottom) */}
      {!collapsed && apiKey && (
        <div className="px-4 py-3 border-t border-zinc-800">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">API Key</div>
          <code className="text-xs text-zinc-400 font-mono">{maskApiKey(apiKey)}</code>
        </div>
      )}
    </div>
  );

  return (
    <ToastProvider>
      <div className="min-h-screen bg-[#09090B] text-zinc-50 font-[Inter]">
        {/* Mobile hamburger */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#09090B]/80 backdrop-blur-md border-b border-zinc-800">
          <div className="flex items-center justify-between px-4 h-14">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="text-zinc-400 hover:text-zinc-200 p-1"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                )}
              </svg>
            </button>
            <span className="text-sm font-semibold">LinkForge</span>
            <div className="w-6" /> {/* spacer */}
          </div>
        </div>

        {/* Mobile drawer overlay */}
        {mobileOpen && (
          <div
            className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile drawer */}
        <div
          className={`md:hidden fixed top-14 left-0 bottom-0 z-30 w-64 bg-[#18181B] border-r border-zinc-800 transform transition-transform duration-200 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <SidebarContent />
        </div>

        {/* Desktop sidebar — icons only at lg, full at xl */}
        <aside className="hidden md:block fixed top-0 left-0 bottom-0 w-16 lg:w-56 bg-[#18181B] border-r border-zinc-800 z-20">
          <div className="hidden lg:block h-full">
            <SidebarContent />
          </div>
          <div className="lg:hidden h-full">
            <SidebarContent collapsed />
          </div>
        </aside>

        {/* Main content */}
        <main className="md:ml-16 lg:ml-56 pt-14 md:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
