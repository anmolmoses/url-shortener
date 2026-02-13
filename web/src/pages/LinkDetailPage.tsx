import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Calendar } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { useFetch } from '../lib/hooks';
import { formatNumber, fullDate, relativeTime, shortUrl } from '../lib/utils';
import CopyButton from '../components/CopyButton';
import { CardSkeleton, ChartSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

const CHART_COLORS = ['#6366F1', '#0EA5E9', '#22D3EE', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const RANGE_PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

export default function LinkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [rangeDays, setRangeDays] = useState(30);

  const since = useMemo(() => subDays(new Date(), rangeDays).toISOString(), [rangeDays]);

  const { data: link, loading: linkLoading } = useFetch<any>(`/links/${id}`);
  const { data: analytics, loading: analyticsLoading } = useFetch<any>(`/links/${id}/analytics`, {
    params: { since },
  });

  const isLoading = linkLoading;
  const timeseries = analytics?.timeseries ?? [];
  const referrers = analytics?.referrers ?? [];
  const countries = analytics?.countries ?? [];
  const devices = analytics?.devices ?? [];
  const browsers = analytics?.browsers ?? [];

  const tooltipStyle = {
    contentStyle: { backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 8, fontSize: 12 },
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link to="/links" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to links
      </Link>

      {/* Header */}
      {isLoading ? (
        <CardSkeleton />
      ) : link ? (
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-h2 font-bold font-mono text-accent">/{link.slug}</h1>
                <CopyButton text={shortUrl(link.slug)} label="Copy" />
              </div>
              <a
                href={link.destination}
                target="_blank"
                rel="noopener"
                className="text-sm text-text-muted hover:text-text-primary flex items-center gap-1"
              >
                {link.destination}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <p className="text-text-muted">Total Clicks</p>
                <p className="text-xl font-bold text-text-primary">{formatNumber(link.clicks ?? analytics?.totalClicks ?? 0)}</p>
              </div>
              <div>
                <p className="text-text-muted">Created</p>
                <p className="text-text-primary" title={fullDate(link.createdAt)}>
                  {relativeTime(link.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState title="Link not found" description="This link may have been deleted." />
      )}

      {/* Date range selector */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-text-muted" />
        {RANGE_PRESETS.map((preset) => (
          <button
            key={preset.days}
            onClick={() => setRangeDays(preset.days)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              rangeDays === preset.days
                ? 'bg-primary text-white'
                : 'bg-surface text-text-muted hover:text-text-primary border border-border-color'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Charts */}
      {analyticsLoading ? (
        <div className="grid grid-cols-1 gap-6">
          <ChartSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      ) : (
        <>
          {/* Clicks over time */}
          <div className="card">
            <h2 className="text-h3 font-semibold mb-4">Clicks Over Time</h2>
            {timeseries.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeseries}>
                  <defs>
                    <linearGradient id="detailGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), 'MMM d')} stroke="#94A3B8" fontSize={12} />
                  <YAxis stroke="#94A3B8" fontSize={12} />
                  <Tooltip {...tooltipStyle} labelFormatter={(d) => format(new Date(d as string), 'MMM d, yyyy')} />
                  <Area type="monotone" dataKey="clicks" stroke="#6366F1" fill="url(#detailGradient)" strokeWidth={2} animationDuration={300} animationEasing="ease-out" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No click data" description="Clicks will appear here once your link is visited." />
            )}
          </div>

          {/* Referrers & Countries */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Referrers */}
            <div className="card">
              <h2 className="text-h3 font-semibold mb-4">Top Referrers</h2>
              {referrers.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={referrers.slice(0, 10)} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94A3B8" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={12} width={75} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="clicks" fill="#0EA5E9" radius={[0, 4, 4, 0]} animationDuration={300} animationEasing="ease-out" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No referrer data" description="Referrer info will appear as your link gets visited." />
              )}
            </div>

            {/* Countries */}
            <div className="card">
              <h2 className="text-h3 font-semibold mb-4">Top Countries</h2>
              {countries.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={countries.slice(0, 10)} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94A3B8" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#94A3B8" fontSize={12} width={55} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="clicks" fill="#22D3EE" radius={[0, 4, 4, 0]} animationDuration={300} animationEasing="ease-out" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No country data" description="Geographic data will appear as your link gets visited." />
              )}
            </div>
          </div>

          {/* Devices & Browsers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Devices */}
            <div className="card">
              <h2 className="text-h3 font-semibold mb-4">Devices</h2>
              {devices.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={devices}
                      dataKey="clicks"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      paddingAngle={3}
                      animationDuration={300}
                      animationEasing="ease-out"
                    >
                      {devices.map((_: any, i: number) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No device data" description="Device breakdown will appear as your link gets visited." />
              )}
            </div>

            {/* Browsers */}
            <div className="card">
              <h2 className="text-h3 font-semibold mb-4">Browsers</h2>
              {browsers.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={browsers.slice(0, 5)}
                      dataKey="clicks"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      paddingAngle={3}
                      animationDuration={300}
                      animationEasing="ease-out"
                    >
                      {browsers.slice(0, 5).map((_: any, i: number) => (
                        <Cell key={i} fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#94A3B8' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="No browser data" description="Browser breakdown will appear as your link gets visited." />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}