'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { fetchLinks, type Link as LinkType } from '@/lib/api';
import { truncate, formatRelative, formatNumber, debounce } from '@/lib/utils';
import CopyButton from '@/components/CopyButton';
import { TableSkeleton } from '@/components/Skeleton';

type SortKey = 'slug' | 'destination' | 'clicks' | 'createdAt' | 'status';
type SortOrder = 'asc' | 'desc';

/**
 * Links list page — table with search, sort, pagination.
 */
export default function DashboardPage() {
  const [links, setLinks] = useState<LinkType[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sort, setSort] = useState<SortKey>('createdAt');
  const [order, setOrder] = useState<SortOrder>('desc');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLinks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchLinks({ page, pageSize, sort, order, search });
      setLinks(res.links);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load links');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sort, order, search]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  // Debounced search handler
  const debouncedSearch = useMemo(
    () =>
      debounce((val: unknown) => {
        setSearch(val as string);
        setPage(1);
      }, 300),
    []
  );

  const handleSort = (key: SortKey) => {
    if (sort === key) {
      setOrder(o => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(key);
      setOrder('desc');
    }
  };

  const totalPages = Math.ceil(total / pageSize);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sort !== column) return <span className="text-zinc-600 ml-1">↕</span>;
    return <span className="text-indigo-400 ml-1">{order === 'asc' ? '↑' : '↓'}</span>;
  };

  const columns: { key: SortKey; label: string; className?: string }[] = [
    { key: 'slug', label: 'Short URL' },
    { key: 'destination', label: 'Destination', className: 'hidden sm:table-cell' },
    { key: 'clicks', label: 'Clicks' },
    { key: 'createdAt', label: 'Created', className: 'hidden md:table-cell' },
    { key: 'status', label: 'Status' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50">Links</h1>
          <p className="text-sm text-zinc-500 mt-1">{total} total links</p>
        </div>
        <Link
          href="/dashboard/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Link
        </Link>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search by slug or URL..."
            onChange={e => debouncedSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={8} />
      ) : links.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-zinc-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.556a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.374" />
            </svg>
          </div>
          <p className="text-zinc-400 font-medium">No links yet</p>
          <p className="text-zinc-500 text-sm mt-1">Create your first short link to get started.</p>
          <Link
            href="/dashboard/create"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Create Link
          </Link>
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-900/50 border-b border-zinc-800">
                  {columns.map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className={`text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-200 select-none ${col.className ?? ''}`}
                    >
                      {col.label}
                      <SortIcon column={col.key} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {links.map(link => (
                  <tr
                    key={link.id}
                    className="hover:bg-zinc-800/30 transition-colors group"
                    tabIndex={0}
                    role="link"
                    onKeyDown={e => {
                      if (e.key === 'Enter') window.location.href = `/dashboard/links/${link.slug}`;
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/links/${link.slug}`}
                          className="text-indigo-400 hover:text-indigo-300 font-mono text-xs"
                        >
                          {baseUrl}/{link.slug}
                        </Link>
                        <CopyButton text={`${baseUrl}/${link.slug}`} className="opacity-0 group-hover:opacity-100" />
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-zinc-400 text-xs" title={link.destination}>
                        {truncate(link.destination, 40)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-zinc-200 font-medium">{formatNumber(link.clicks)}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-zinc-500 text-xs">{formatRelative(link.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          link.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/30'
                        }`}
                      >
                        {link.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 bg-zinc-900/30">
              <span className="text-xs text-zinc-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
