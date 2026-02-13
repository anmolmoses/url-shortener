'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { api, type ShortLink } from '@/lib/api-client';
import CopyButton from '@/components/CopyButton';
import Skeleton from '@/components/Skeleton';

type SortField = 'slug' | 'destination' | 'clicks' | 'createdAt' | 'status';
type SortOrder = 'asc' | 'desc';

export default function DashboardPage() {
  const [links, setLinks] = useState<ShortLink[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const pageSize = 15;

  // Debounced search (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getLinks({
        page,
        pageSize,
        sort: sortField,
        order: sortOrder,
        search: debouncedSearch || undefined,
      });
      setLinks(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to fetch links:', err);
    } finally {
      setLoading(false);
    }
  }, [page, sortField, sortOrder, debouncedSearch]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const totalPages = Math.ceil(total / pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-zinc-600 ml-1">↕</span>;
    return <span className="text-indigo-400 ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Links</h1>
          <p className="text-sm text-zinc-400 mt-1">{total} total links</p>
        </div>
        <Link
          href="/dashboard/create"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors"
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
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search by slug or destination..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th
                  className="px-4 py-3 font-medium text-zinc-400 cursor-pointer hover:text-zinc-200 select-none"
                  onClick={() => handleSort('slug')}
                >
                  Short URL <SortIcon field="slug" />
                </th>
                <th
                  className="px-4 py-3 font-medium text-zinc-400 cursor-pointer hover:text-zinc-200 select-none"
                  onClick={() => handleSort('destination')}
                >
                  Destination <SortIcon field="destination" />
                </th>
                <th
                  className="px-4 py-3 font-medium text-zinc-400 cursor-pointer hover:text-zinc-200 select-none text-right"
                  onClick={() => handleSort('clicks')}
                >
                  Clicks <SortIcon field="clicks" />
                </th>
                <th
                  className="px-4 py-3 font-medium text-zinc-400 cursor-pointer hover:text-zinc-200 select-none hidden md:table-cell"
                  onClick={() => handleSort('createdAt')}
                >
                  Created <SortIcon field="createdAt" />
                </th>
                <th
                  className="px-4 py-3 font-medium text-zinc-400 cursor-pointer hover:text-zinc-200 select-none"
                  onClick={() => handleSort('status')}
                >
                  Status <SortIcon field="status" />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-zinc-800/50">
                      <td className="px-4 py-3"><Skeleton className="h-5 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-48" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-12 ml-auto" /></td>
                      <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-5 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
                    </tr>
                  ))
                : links.map((link) => (
                    <tr
                      key={link.slug}
                      className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/links/${link.slug}`}
                            className="text-indigo-400 hover:text-indigo-300 font-mono text-xs transition-colors"
                          >
                            /{link.slug}
                          </Link>
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <CopyButton text={`${baseUrl}/${link.slug}`} />
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/links/${link.slug}`}
                          className="text-zinc-300 hover:text-zinc-100 transition-colors truncate block max-w-xs"
                          title={link.destination}
                        >
                          {link.destination}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-zinc-200 font-medium tabular-nums">
                          {link.clicks.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 hidden md:table-cell">
                        {formatDate(link.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            link.status === 'active'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-zinc-700/50 text-zinc-400'
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

        {/* Empty state */}
        {!loading && links.length === 0 && (
          <div className="py-16 text-center">
            <svg className="mx-auto w-12 h-12 text-zinc-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.03a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.374" />
            </svg>
            <p className="text-zinc-400 text-sm">No links found</p>
            <Link
              href="/dashboard/create"
              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-sm mt-2 transition-colors"
            >
              Create your first link →
            </Link>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs rounded-md border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs rounded-md border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
