'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { addToast } from '@/lib/toast';
import CopyButton from '@/components/CopyButton';

export default function CreateLinkPage() {
  const router = useRouter();
  const [destination, setDestination] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [aliasStatus, setAliasStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const checkAlias = useCallback(async (alias: string) => {
    if (!alias || alias.length < 2) {
      setAliasStatus('idle');
      return;
    }
    setAliasStatus('checking');
    try {
      const res = await api.checkSlugAvailability(alias);
      setAliasStatus(res.available ? 'available' : 'taken');
    } catch {
      setAliasStatus('idle');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!destination) {
      newErrors.destination = 'Destination URL is required';
    } else if (!validateUrl(destination)) {
      newErrors.destination = 'Please enter a valid URL (e.g. https://example.com)';
    }
    if (aliasStatus === 'taken') {
      newErrors.alias = 'This alias is already taken';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const link = await api.createLink({
        destination,
        slug: customAlias || undefined,
        expiresAt: expiresAt || undefined,
      });
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const shortUrl = `${baseUrl}/${link.slug}`;
      setCreatedLink(shortUrl);
      addToast('Link created successfully!', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create link';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (createdLink) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">Link Created!</h2>
          <p className="text-zinc-400 text-sm mb-6">Your short link is ready to use</p>

          <div className="flex items-center justify-center gap-2 bg-zinc-800 rounded-lg px-4 py-3 mb-6">
            <code className="text-indigo-400 font-mono text-sm">{createdLink}</code>
            <CopyButton text={createdLink} />
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setCreatedLink(null);
                setDestination('');
                setCustomAlias('');
                setExpiresAt('');
                setErrors({});
                setAliasStatus('idle');
              }}
              className="px-4 py-2 text-sm border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Create Another
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
            >
              View All Links
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-8">
      <h1 className="text-2xl font-semibold mb-1">Create New Link</h1>
      <p className="text-sm text-zinc-400 mb-8">Shorten a URL with an optional custom alias</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Destination URL */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Destination URL *</label>
          <input
            type="url"
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              if (errors.destination) setErrors((prev) => ({ ...prev, destination: '' }));
            }}
            placeholder="https://example.com/very-long-url"
            className={`w-full bg-zinc-900 border rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 transition-colors ${
              errors.destination
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                : 'border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/30'
            }`}
          />
          {errors.destination && (
            <p className="text-red-400 text-xs mt-1">{errors.destination}</p>
          )}
        </div>

        {/* Custom Alias */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Custom Alias (optional)</label>
          <div className="relative">
            <input
              type="text"
              value={customAlias}
              onChange={(e) => {
                setCustomAlias(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ''));
                setAliasStatus('idle');
                if (errors.alias) setErrors((prev) => ({ ...prev, alias: '' }));
              }}
              onBlur={() => checkAlias(customAlias)}
              placeholder="my-custom-slug"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
            />
            {aliasStatus !== 'idle' && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
                {aliasStatus === 'checking' && <span className="text-zinc-400">Checking...</span>}
                {aliasStatus === 'available' && <span className="text-emerald-400">✓ Available</span>}
                {aliasStatus === 'taken' && <span className="text-red-400">✗ Taken</span>}
              </span>
            )}
          </div>
          {errors.alias && (
            <p className="text-red-400 text-xs mt-1">{errors.alias}</p>
          )}
          <p className="text-zinc-500 text-xs mt-1">Letters, numbers, hyphens, and underscores only</p>
        </div>

        {/* Expiration */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Expiration Date (optional)</label>
          <input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating...
            </>
          ) : (
            'Create Short Link'
          )}
        </button>
      </form>
    </div>
  );
}
