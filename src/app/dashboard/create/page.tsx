'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createLink, checkAliasAvailability } from '@/lib/api';
import CopyButton from '@/components/CopyButton';
import { useToast } from '@/hooks/useToast';

/**
 * Create link form — destination URL, optional custom alias with availability check,
 * optional expiration date. Shows success state with copy-to-clipboard.
 */
export default function CreateLinkPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [destination, setDestination] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [aliasStatus, setAliasStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdUrl, setCreatedUrl] = useState('');

  // URL validation
  const isValidUrl = useCallback((url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }, []);

  const urlError = destination && !isValidUrl(destination) ? 'Please enter a valid URL' : '';

  // Check alias availability on blur
  const handleAliasBlur = async () => {
    if (!customAlias || customAlias.length < 2) {
      setAliasStatus('idle');
      return;
    }
    setAliasStatus('checking');
    try {
      const res = await checkAliasAvailability(customAlias);
      setAliasStatus(res.available ? 'available' : 'taken');
    } catch {
      setAliasStatus('idle');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination || !isValidUrl(destination)) return;
    if (aliasStatus === 'taken') return;

    setSubmitting(true);
    setError('');
    try {
      const link = await createLink({
        destination,
        customAlias: customAlias || undefined,
        expiresAt: expiresAt || undefined,
      });
      const shortUrl = `${window.location.origin}/${link.slug}`;
      setCreatedUrl(shortUrl);
      toast('Link created successfully!', 'success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create link');
    } finally {
      setSubmitting(false);
    }
  };

  // Success state
  if (createdUrl) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-zinc-50 mb-2">Link Created!</h2>
          <p className="text-sm text-zinc-400 mb-6">Your short link is ready to share.</p>

          <div className="flex items-center justify-center gap-3 bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 mb-6">
            <code className="text-indigo-400 font-mono text-sm flex-1 text-left">{createdUrl}</code>
            <CopyButton text={createdUrl} label="Copy" />
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setCreatedUrl('');
                setDestination('');
                setCustomAlias('');
                setExpiresAt('');
              }}
              className="px-4 py-2.5 bg-zinc-800 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
            >
              Create Another
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2.5 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors"
            >
              View All Links
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-50">Create Link</h1>
        <p className="text-sm text-zinc-500 mt-1">Shorten a URL with optional custom alias.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-6 space-y-5">
          {/* Destination URL */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Destination URL <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              value={destination}
              onChange={e => setDestination(e.target.value)}
              placeholder="https://example.com/very-long-url"
              required
              className={`w-full px-3.5 py-2.5 bg-zinc-800 border rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none transition-colors ${
                urlError
                  ? 'border-red-500/50 focus:border-red-500'
                  : 'border-zinc-700 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20'
              }`}
            />
            {urlError && <p className="mt-1 text-xs text-red-400">{urlError}</p>}
          </div>

          {/* Custom Alias */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Custom Alias <span className="text-zinc-500 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={customAlias}
                onChange={e => {
                  setCustomAlias(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''));
                  setAliasStatus('idle');
                }}
                onBlur={handleAliasBlur}
                placeholder="my-link"
                className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-colors font-mono"
              />
              {aliasStatus === 'checking' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-zinc-500 border-t-indigo-400 rounded-full animate-spin" />
                </div>
              )}
              {aliasStatus === 'available' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {aliasStatus === 'taken' && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
            </div>
            {aliasStatus === 'taken' && (
              <p className="mt-1 text-xs text-red-400">This alias is already taken</p>
            )}
            {aliasStatus === 'available' && (
              <p className="mt-1 text-xs text-emerald-400">Available!</p>
            )}
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Expiration Date <span className="text-zinc-500 font-normal">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-colors [color-scheme:dark]"
            />
          </div>
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !destination || !!urlError || aliasStatus === 'taken'}
          className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/30 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating...
            </>
          ) : (
            'Create Link'
          )}
        </button>
      </form>
    </div>
  );
}
