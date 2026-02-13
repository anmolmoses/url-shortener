import { useState, useCallback, useRef, useEffect } from 'react';
import { X, Check, AlertCircle, Loader2 } from 'lucide-react';
import api from '../lib/api';
import CopyButton from './CopyButton';
import { useToast } from '../contexts/ToastContext';

interface CreateLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface FormState {
  url: string;
  alias: string;
  expiresAt: string;
}

export default function CreateLinkModal({ isOpen, onClose, onCreated }: CreateLinkModalProps) {
  const [form, setForm] = useState<FormState>({ url: '', alias: '', expiresAt: '' });
  const [urlValid, setUrlValid] = useState<boolean | null>(null);
  const [aliasStatus, setAliasStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const aliasTimeout = useRef<ReturnType<typeof setTimeout>>();
  const { toast } = useToast();

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setForm({ url: '', alias: '', expiresAt: '' });
      setUrlValid(null);
      setAliasStatus('idle');
      setCreatedUrl(null);
      setError(null);
    }
  }, [isOpen]);

  // URL validation
  const validateUrl = useCallback((url: string) => {
    if (!url) { setUrlValid(null); return; }
    try {
      new URL(url);
      setUrlValid(true);
    } catch {
      setUrlValid(false);
    }
  }, []);

  // Alias availability check
  const checkAlias = useCallback(async (alias: string) => {
    if (!alias || alias.length < 2) { setAliasStatus('idle'); return; }
    setAliasStatus('checking');
    try {
      const res = await api.get('/links', { params: { search: alias } });
      const taken = res.data.links?.some((l: any) => l.slug === alias);
      setAliasStatus(taken ? 'taken' : 'available');
    } catch {
      setAliasStatus('idle');
    }
  }, []);

  const handleAliasBlur = () => {
    if (aliasTimeout.current) clearTimeout(aliasTimeout.current);
    checkAlias(form.alias);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.url || urlValid === false) return;

    setSubmitting(true);
    setError(null);
    try {
      const payload: any = { destination: form.url };
      if (form.alias) payload.slug = form.alias;
      if (form.expiresAt) payload.expiresAt = new Date(form.expiresAt).toISOString();

      const res = await api.post('/links', payload);
      const shortUrl = `${window.location.origin}/${res.data.slug}`;
      setCreatedUrl(shortUrl);
      toast('Link created!');
      onCreated();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to create link';
      setError(msg);
      if (err.response?.status === 429) {
        toast('Rate limit approaching — slow down!', 'warning');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface border border-border-color rounded-lg shadow-xl w-full max-w-md z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-color">
          <h2 className="text-lg font-semibold text-text-primary">
            {createdUrl ? 'Link Created!' : 'Create New Link'}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdUrl ? (
          /* Success state */
          <div className="p-6 space-y-4">
            <div className="bg-background rounded-lg p-4 flex items-center justify-between gap-3">
              <code className="font-mono text-sm text-accent truncate flex-1">{createdUrl}</code>
              <CopyButton text={createdUrl} />
            </div>
            <button onClick={onClose} className="btn-primary w-full">
              Done
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Destination URL */}
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">
                Destination URL <span className="text-error">*</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => { setForm({ ...form, url: e.target.value }); validateUrl(e.target.value); }}
                  placeholder="https://example.com/very-long-url"
                  className={`input-field w-full pr-9 ${
                    urlValid === false ? 'border-error focus:ring-error' : urlValid === true ? 'border-success/50 focus:ring-success' : ''
                  }`}
                  required
                />
                {urlValid === true && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success" />}
                {urlValid === false && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-error" />}
              </div>
            </div>

            {/* Custom Alias */}
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">
                Custom Alias <span className="text-text-muted/60">(optional)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={form.alias}
                  onChange={(e) => { setForm({ ...form, alias: e.target.value }); setAliasStatus('idle'); }}
                  onBlur={handleAliasBlur}
                  placeholder="my-custom-slug"
                  className={`input-field w-full font-mono pr-9 ${
                    aliasStatus === 'taken' ? 'border-error focus:ring-error' : aliasStatus === 'available' ? 'border-success/50 focus:ring-success' : ''
                  }`}
                />
                {aliasStatus === 'checking' && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted animate-spin" />}
                {aliasStatus === 'available' && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-success" />}
                {aliasStatus === 'taken' && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-error" />}
              </div>
              {aliasStatus === 'taken' && <p className="text-xs text-error mt-1">This alias is already taken</p>}
            </div>

            {/* Expiry */}
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1.5">
                Expiry Date <span className="text-text-muted/60">(optional)</span>
              </label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="input-field w-full"
              />
            </div>

            {error && (
              <div className="bg-error/10 border border-error/30 rounded-lg p-3 text-sm text-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !form.url || urlValid === false || aliasStatus === 'taken'}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Creating...' : 'Create Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}