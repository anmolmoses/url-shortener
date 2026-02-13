'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, type ShortLink, type LinkAnalytics } from '@/lib/api-client';
import { addToast } from '@/lib/toast';
import CopyButton from '@/components/CopyButton';
import StatsCard from '@/components/StatsCard';
import DateRangePicker from '@/components/DateRangePicker';
import Skeleton from '@/components/Skeleton';
import ClickTimeline from '@/components/charts/ClickTimeline';
import DevicePie from '@/components/charts/DevicePie';
import ReferrerBar from '@/components/charts/ReferrerBar';

type Granularity = 'hourly' | 'daily' | 'weekly';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

// Country code to flag emoji
function countryFlag(code: string): string {
  if (!code || code.length !== 2) return '🌐';
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

export default function LinkDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;

  const [link, setLink] = useState<ShortLink | null>(null);
  const [analytics, setAnalytics] = useState<LinkAnalytics | null>(null);
  const [linkLoading, setLinkLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [granularity, setGranularity] = useState<Granularity>('daily');
  const [dateFrom, setDateFrom] = useState(daysAgo(30));
  const [dateTo, setDateTo] = useState(today());

  // Fetch link metadata
  useEffect(() => {
    (async () => {
      setLinkLoading(true);
      try {
        const data = await api.getLink(slug);
        setLink(data);
      } catch {
        addToast('Link not found', 'error');
        router.push('/dashboard');
      } finally {
        setLinkLoading(false);
      }
    })();
  }, [slug, router]);

  // Fetch analytics (re-fetch on granularity or date change)
  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const data = await api.getLinkAnalytics(slug, {
        granularity,
        from: dateFrom,
        to: dateTo,
      });
      setAnalytics(data);
    } catch {
      console.error('Failed to fetch analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [slug, granularity, dateFrom, dateTo]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleDateChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
  };

  const handleExportCsv = async () => {
    try {
      const blob = await api.exportCsv(slug, { from: dateFrom, to: dateTo });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}-analytics.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('CSV exported', 'success');
    } catch {
      addToast('Export failed', 'error');
    }
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shortUrl = `${baseUrl}/${slug}`;

  if (linkLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!link) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold font-mono">/{slug}</h1>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                link.status === 'active'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-zinc-700/50 text-zinc-400'
              }`}
            >
              {link.status}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <code className="text-sm text-indigo-400 font-mono">{shortUrl}</code>
            <CopyButton text={shortUrl} />
          </div>
          <p className="text-sm text-zinc-400 truncate max-w-lg" title={link.destination}>
            → {link.destination}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Created {new Date(link.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
            </svg>
          }
          label="Total Clicks"
          value={link.clicks.toLocaleString()}
        />
        <StatsCard
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          label="Status"
          value={link.status}
        />
        <StatsCard
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          }
          label="Created"
          value={new Date(link.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        />
        <StatsCard
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          }
          label="Expires"
          value={link.expiresAt ? new Date(link.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never'}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <DateRangePicker from={dateFrom} to={dateTo} onChange={handleDateChange} />
        <div className="flex gap-1">
          {(['hourly', 'daily', 'weekly'] as Granularity[]).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`px-3 py-1 text-xs rounded-md border transition-colors capitalize ${
                granularity === g
                  ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Click Timeline */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-5">
          <h3 className="text-sm font-medium text-zinc-300 mb-4">Click Timeline</h3>
          <ClickTimeline data={analytics?.timeline || []} loading={analyticsLoading} />
          {!analyticsLoading && (!analytics?.timeline || analytics.timeline.length === 0) && (
            <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">
              No click data for this period
            </div>
          )}
        </div>

        {/* Top Referrers */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-5">
          <h3 className="text-sm font-medium text-zinc-300 mb-4">Top Referrers</h3>
          <ReferrerBar data={analytics?.referrers || []} loading={analyticsLoading} />
          {!analyticsLoading && analytics?.referrers && analytics.referrers.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {analytics.referrers.slice(0, 10).map((ref, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 truncate max-w-[200px]">{ref.referrer || 'Direct'}</span>
                  <span className="text-zinc-300 font-medium tabular-nums">{ref.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Devices */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-5">
          <h3 className="text-sm font-medium text-zinc-300 mb-4">Devices</h3>
          <DevicePie data={analytics?.devices || []} loading={analyticsLoading} />
        </div>

        {/* Countries */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-5">
          <h3 className="text-sm font-medium text-zinc-300 mb-4">Countries</h3>
          {analyticsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          ) : !analytics?.countries || analytics.countries.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-zinc-500 text-sm">
              No geographic data yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-left">
                    <th className="pb-2 font-medium text-zinc-400">Country</th>
                    <th className="pb-2 font-medium text-zinc-400 text-right">Clicks</th>
                    <th className="pb-2 font-medium text-zinc-400 text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.countries.map((c, i) => (
                    <tr key={i} className="border-b border-zinc-800/50">
                      <td className="py-2">
                        <span className="mr-2">{countryFlag(c.countryCode)}</span>
                        <span className="text-zinc-200">{c.country}</span>
                      </td>
                      <td className="py-2 text-right text-zinc-300 font-medium tabular-nums">
                        {c.count.toLocaleString()}
                      </td>
                      <td className="py-2 text-right text-zinc-400 tabular-nums">
                        {c.percentage.toFixed(1)}%
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
