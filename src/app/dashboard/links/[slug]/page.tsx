'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchLink, fetchAnalytics, deleteLink, type Link, type AnalyticsResponse } from '@/lib/api';
import { formatDate, formatNumber, countryFlag, downloadCSV } from '@/lib/utils';
import CopyButton from '@/components/CopyButton';
import StatsCard from '@/components/StatsCard';
import DateRangePicker from '@/components/DateRangePicker';
import ClickTimeline from '@/components/charts/ClickTimeline';
import DevicePie from '@/components/charts/DevicePie';
import ReferrerBar from '@/components/charts/ReferrerBar';
import { ChartSkeleton } from '@/components/Skeleton';
import { useToast } from '@/hooks/useToast';

/**
 * Link detail/analytics page.
 * Shows stats, click timeline, referrers, devices, countries.
 * Date range picker filters all panels.
 */
export default function LinkDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const slug = params.slug;

  const [link, setLink] = useState<Link | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [granularity, setGranularity] = useState<'hourly' | 'daily' | 'weekly'>('daily');
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState('');

  // Date range — default 7 days
  const now = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const [dateFrom, setDateFrom] = useState(weekAgo.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(now.toISOString().split('T')[0]);

  // Load link data
  useEffect(() => {
    (async () => {
      try {
        const l = await fetchLink(slug);
        setLink(l);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load link');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  // Load analytics (re-fetch on date/granularity change)
  const loadAnalytics = useCallback(async () => {
    setChartLoading(true);
    try {
      const a = await fetchAnalytics(slug, { granularity, from: dateFrom, to: dateTo });
      setAnalytics(a);
    } catch {
      // Analytics might not be available yet — not an error
      setAnalytics(null);
    } finally {
      setChartLoading(false);
    }
  }, [slug, granularity, dateFrom, dateTo]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleDateChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this link? This action cannot be undone.')) return;
    try {
      await deleteLink(slug);
      toast('Link deleted', 'success');
      router.push('/dashboard');
    } catch {
      toast('Failed to delete link', 'error');
    }
  };

  const handleExportCSV = () => {
    if (!analytics) return;
    const rows = analytics.clicks.map(c => ({
      timestamp: c.timestamp,
      clicks: c.count,
    }));
    downloadCSV(rows, `${slug}-analytics.csv`);
    toast('CSV downloaded', 'success');
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse h-8 w-48 bg-zinc-800 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-zinc-800/50 rounded-xl animate-pulse" />)}
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  if (error || !link) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 font-medium">{error || 'Link not found'}</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-4 px-4 py-2 bg-zinc-800 text-zinc-300 text-sm rounded-lg hover:bg-zinc-700 transition-colors"
        >
          ← Back to Links
        </button>
      </div>
    );
  }

  const totalClicks = analytics?.totalClicks ?? link.clicks;
  const totalCountryClicks = analytics?.countries.reduce((s, c) => s + c.count, 0) || 1;

  return (
    <div className="space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Links
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Export CSV
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <code className="text-lg font-mono text-indigo-400 truncate">
                {baseUrl}/{link.slug}
              </code>
              <CopyButton text={`${baseUrl}/${link.slug}`} />
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  link.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/30'
                }`}
              >
                {link.status}
              </span>
            </div>
            <p className="text-sm text-zinc-400 truncate" title={link.destination}>
              → {link.destination}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Created {formatDate(link.createdAt)}
              {link.expiresAt && ` · Expires ${formatDate(link.expiresAt)}`}
            </p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
            </svg>
          }
          label="Total Clicks"
          value={totalClicks}
        />
        <StatsCard
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          }
          label="Countries"
          value={analytics?.countries.length ?? 0}
        />
        <StatsCard
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          }
          label="Top Referrers"
          value={analytics?.referrers.length ?? 0}
        />
      </div>

      {/* Controls: date range + granularity */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <DateRangePicker from={dateFrom} to={dateTo} onChange={handleDateChange} />
        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-0.5">
          {(['hourly', 'daily', 'weekly'] as const).map(g => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                granularity === g
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Click Timeline — full width */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-5">
          <h3 className="text-sm font-medium text-zinc-300 mb-4">Click Timeline</h3>
          {chartLoading ? (
            <ChartSkeleton />
          ) : (
            <ClickTimeline data={analytics?.clicks ?? []} granularity={granularity} />
          )}
        </div>

        {/* Top Referrers */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-5">
          <h3 className="text-sm font-medium text-zinc-300 mb-4">Top Referrers</h3>
          {chartLoading ? (
            <ChartSkeleton />
          ) : (
            <>
              <ReferrerBar data={analytics?.referrers ?? []} />
              {/* Referrer table */}
              {analytics && analytics.referrers.length > 0 && (
                <div className="mt-4 space-y-1.5">
                  {analytics.referrers.slice(0, 10).map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 truncate max-w-[200px]">{r.referrer || 'Direct'}</span>
                      <span className="text-zinc-300 font-medium">{formatNumber(r.count)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Devices */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-5">
          <h3 className="text-sm font-medium text-zinc-300 mb-4">Devices</h3>
          {chartLoading ? (
            <ChartSkeleton />
          ) : (
            <DevicePie data={analytics?.devices ?? []} />
          )}
        </div>

        {/* Countries — full width */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-5">
          <h3 className="text-sm font-medium text-zinc-300 mb-4">Countries</h3>
          {chartLoading ? (
            <ChartSkeleton />
          ) : !analytics || analytics.countries.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm">No country data yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Country</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Clicks</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {analytics.countries.map((c, i) => (
                    <tr key={i} className="hover:bg-zinc-800/20">
                      <td className="py-2 px-3">
                        <span className="mr-2">{countryFlag(c.countryCode)}</span>
                        <span className="text-zinc-300">{c.country}</span>
                      </td>
                      <td className="py-2 px-3 text-right text-zinc-300 font-medium">
                        {formatNumber(c.count)}
                      </td>
                      <td className="py-2 px-3 text-right text-zinc-500">
                        {((c.count / totalCountryClicks) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
