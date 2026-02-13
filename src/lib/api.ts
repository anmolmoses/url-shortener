/**
 * API client for the URL shortener backend.
 * All requests include the API key from localStorage.
 */

const BASE = '/api';

function getHeaders(): HeadersInit {
  const key = typeof window !== 'undefined' ? localStorage.getItem('apiKey') ?? '' : '';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`,
  };
}

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { ...getHeaders(), ...opts?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

// --- Links ---

export interface Link {
  id: string;
  slug: string;
  destination: string;
  clicks: number;
  createdAt: string;
  expiresAt: string | null;
  status: 'active' | 'expired';
}

export interface LinksResponse {
  links: Link[];
  total: number;
  page: number;
  pageSize: number;
}

export function fetchLinks(params: {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
}): Promise<LinksResponse> {
  const sp = new URLSearchParams();
  if (params.page) sp.set('page', String(params.page));
  if (params.pageSize) sp.set('pageSize', String(params.pageSize));
  if (params.sort) sp.set('sort', params.sort);
  if (params.order) sp.set('order', params.order);
  if (params.search) sp.set('search', params.search);
  return request(`/links?${sp}`);
}

export function fetchLink(slug: string): Promise<Link> {
  return request(`/links/${slug}`);
}

export interface CreateLinkPayload {
  destination: string;
  customAlias?: string;
  expiresAt?: string;
}

export function createLink(payload: CreateLinkPayload): Promise<Link> {
  return request('/links', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function checkAliasAvailability(alias: string): Promise<{ available: boolean }> {
  return request(`/links/check-alias?alias=${encodeURIComponent(alias)}`);
}

export function deleteLink(slug: string): Promise<void> {
  return request(`/links/${slug}`, { method: 'DELETE' });
}

// --- Analytics ---

export interface ClickData {
  timestamp: string;
  count: number;
}

export interface ReferrerData {
  referrer: string;
  count: number;
}

export interface DeviceData {
  device: string;
  count: number;
}

export interface CountryData {
  country: string;
  countryCode: string;
  count: number;
}

export interface AnalyticsResponse {
  clicks: ClickData[];
  referrers: ReferrerData[];
  devices: DeviceData[];
  countries: CountryData[];
  totalClicks: number;
}

export function fetchAnalytics(
  slug: string,
  params: {
    granularity?: 'hourly' | 'daily' | 'weekly';
    from?: string;
    to?: string;
  }
): Promise<AnalyticsResponse> {
  const sp = new URLSearchParams();
  if (params.granularity) sp.set('granularity', params.granularity);
  if (params.from) sp.set('from', params.from);
  if (params.to) sp.set('to', params.to);
  return request(`/links/${slug}/clicks?${sp}`);
}
