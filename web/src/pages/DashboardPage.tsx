import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Link2, MousePointerClick, TrendingUp, ExternalLink } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';
import { useFetch } from '../lib/hooks';
import { truncate, relativeTime, fullDate, formatNumber, shortUrl } from '../lib/utils';
import CopyButton from '../components/CopyButton';
import { CardSkeleton, TableRowSkeleton, ChartSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

interface DashboardData {
  totalLinks: number;
  totalClicks: number;
  topLink: { slug: string; clicks: number } | null;
  clicksByDay: { date: string; clicks: number }[];
  recentLinks: {
    id: string;
    slug: string;
    destination: string;
    clicks: number;
    createdAt: string;
  }[];
}

export default function DashboardPage() {
  const since = useMemo(() => subDays(new Date(), 30).toISOString(), []);
  const { data, loading } = useFetch<DashboardData>('/dashboard', { params: { since } });

  // If the API doesn't have a /dashboard endpoint, fall back to /links
  const { data: linksData, loading: linksLoading } = useFetch<{ links: any[]; total: number }>('/links', {
    params: { limit: 10, sort: '-createdAt' },
  });

  const links = data?.recentLinks || linksData?.links || [];
  const totalLinks = data?.totalLinks ?? linksData?.total ?? 0;
  const totalClicks = data?.totalClicks ?? 0;
  const topLink = data?.topLink ?? null;
  const chartData = data?.clicksByDay ?? [];
  const isLoading = loading && linksLoading;

  const stats = [
    { label: 'Total Links', value: formatNumber(totalLinks), icon: Link2, color: 'text-primary' },
    { label: 'Clicks (30d)', value: formatNumber(totalClicks), icon: MousePointerClick, color: 'text-accent' },
    {
      label: 'Top Link',
      value: topLink ? `/${topLink.slug}` : '—',
      sub: topLink ? `${formatNumber(topLink.clicks)} clicks` : undefined,
      icon: TrendingUp,
      color: 'text-success',
      mono: true,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-h2 font-bold">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
          : stats.map((s) => (
              <div key={s.label} className="card flex items-start gap-4">
                <div className={`p-2.5 rounded-lg bg-surface ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-text-muted">{s.label}</p>
                  <p className={`text-xl font-bold mt-0.5 ${s.mono ? 'font-mono text-base' : ''}`}>{s.value}</p>
                  {s.sub && <p className="text-xs text-text-muted mt-0.5">{s.sub}</p>}
                </div>
              </div>
            ))}
      </div>

      {/* Clicks chart */}
      {isLoading ? (
        <ChartSkeleton />
      ) : chartData.length > 0 ? (
        <div className="card">
          <h2 className="text-h3 font-semibold mb-4">Clicks Over Time</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => format(new Date(d), 'MMM d')}
                stroke="#94A3B8"
                fontSize={12}
              />
              <YAxis stroke="#94A3B8" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                labelFormatter={(d) => format(new Date(d), 'MMM d, yyyy')}
              />
              <Area
                type="monotone"
                dataKey="clicks"
                stroke="#6366F1"
                fill="url(#clickGradient)"
                strokeWidth={2}
                animationDuration={300}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {/* Recent links table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h3 font-semibold">Recent Links</h2>
          <Link to="/links" className="text-sm text-primary hover:text-primary/80 transition-colors">
            View all →
          </Link>
        </div>

        {isLoading ? (
          <table className="w-full">
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} />)}
            </tbody>
          </table>
        ) : links.length === 0 ? (
          <EmptyState
            title="No links yet"
            description="Create your first short link to get started."
            action={
              <Link to="/links" className="btn-primary">Create Link</Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted text-left border-b border-border-color">
                  <th className="px-4 py-3 font-medium">Short URL</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">Destination</th>
                  <th className="px-4 py-3 font-medium text-right">Clicks</th>
                  <th className="px-4 py-3 font-medium text-right hidden md:table-cell">Created</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link: any) => (
                  <tr key={link.id} className="border-b border-border-color/50 hover:bg-border-color/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link to={`/links/${link.id}`} className="font-mono text-accent hover:underline">
                          /{link.slug}
                        </Link>
                        <CopyButton text={shortUrl(link.slug)} />
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <a href={link.destination} target="_blank" rel="noopener" className="text-text-muted hover:text-text-primary flex items-center gap-1">
                        {truncate(link.destination, 40)}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatNumber(link.clicks ?? 0)}</td>
                    <td className="px-4 py-3 text-right hidden md:table-cell">
                      <span title={fullDate(link.createdAt)} className="text-text-muted">
                        {relativeTime(link.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}