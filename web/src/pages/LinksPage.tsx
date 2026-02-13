import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFetch } from '../lib/hooks';
import { truncate, relativeTime, fullDate, formatNumber, shortUrl } from '../lib/utils';
import CopyButton from '../components/CopyButton';
import CreateLinkModal from '../components/CreateLinkModal';
import { TableRowSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

const PAGE_SIZE = 20;

export default function LinksPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const { data, loading, refetch } = useFetch<{ links: any[]; total: number }>('/links', {
    params: {
      page,
      limit: PAGE_SIZE,
      ...(search ? { search } : {}),
    },
  });

  const links = data?.links ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  const handleCreated = () => {
    refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-h2 font-bold">Links</h1>
        <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Link
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by slug or destination..."
            className="input-field w-full pl-10"
          />
        </div>
        <button type="submit" className="btn-secondary">Search</button>
      </form>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <table className="w-full text-sm">
            <tbody>
              {Array.from({ length: 10 }).map((_, i) => <TableRowSkeleton key={i} />)}
            </tbody>
          </table>
        ) : links.length === 0 ? (
          <EmptyState
            title={search ? 'No results found' : 'No links yet'}
            description={search ? 'Try a different search term.' : 'Create your first short link to get started.'}
            action={
              !search ? (
                <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Create Link
                </button>
              ) : undefined
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
                        {truncate(link.destination, 50)}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border-color">
            <span className="text-sm text-text-muted">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-border-color/50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-text-muted px-2">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-border-color/50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateLinkModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onCreated={handleCreated} />
    </div>
  );
}