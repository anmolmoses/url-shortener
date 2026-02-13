/** Typed API client for the link shortener backend */

export interface ShortLink {
  slug: string;
  destination: string;
  clicks: number;
  createdAt: string;
  expiresAt: string | null;
  status: 'active' | 'expired';
}

export interface ClickEvent {
  timestamp: string;
  referrer: string | null;
  device: 'desktop' | 'mobile' | 'tablet' | 'bot';
  country: string | null;
  countryCode: string | null;
}

export interface ClickAggregation {
  period: string;
  count: number;
}

export interface ReferrerStat {
  referrer: string;
  count: number;
}

export interface DeviceStat {
  device: string;
  count: number;
}

export interface CountryStat {
  country: string;
  countryCode: string;
  count: number;
  percentage: number;
}

export interface LinkAnalytics {
  timeline: ClickAggregation[];
  referrers: ReferrerStat[];
  devices: DeviceStat[];
  countries: CountryStat[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

class ApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    this.apiKey = typeof window !== 'undefined' ? localStorage.getItem('apiKey') || '' : '';
  }

  setApiKey(key: string) {
    this.apiKey = key;
    if (typeof window !== 'undefined') {
      localStorage.setItem('apiKey', key);
    }
  }

  getApiKey(): string {
    return this.apiKey;
  }

  clearApiKey() {
    this.apiKey = '';
    if (typeof window !== 'undefined') {
      localStorage.removeItem('apiKey');
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error || `API error: ${res.status}`);
    }

    return res.json();
  }

  // Links
  async getLinks(params: {
    page?: number;
    pageSize?: number;
    sort?: string;
    order?: 'asc' | 'desc';
    search?: string;
  } = {}): Promise<PaginatedResponse<ShortLink>> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    if (params.sort) query.set('sort', params.sort);
    if (params.order) query.set('order', params.order);
    if (params.search) query.set('search', params.search);
    return this.request<PaginatedResponse<ShortLink>>(`/api/links?${query}`);
  }

  async getLink(slug: string): Promise<ShortLink> {
    return this.request<ShortLink>(`/api/links/${slug}`);
  }

  async createLink(data: {
    destination: string;
    slug?: string;
    expiresAt?: string;
  }): Promise<ShortLink> {
    return this.request<ShortLink>('/api/links', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async checkSlugAvailability(slug: string): Promise<{ available: boolean }> {
    return this.request<{ available: boolean }>(`/api/links/check/${slug}`);
  }

  async deleteLink(slug: string): Promise<void> {
    await this.request(`/api/links/${slug}`, { method: 'DELETE' });
  }

  // Analytics
  async getLinkAnalytics(
    slug: string,
    params: {
      granularity?: 'hourly' | 'daily' | 'weekly';
      from?: string;
      to?: string;
    } = {}
  ): Promise<LinkAnalytics> {
    const query = new URLSearchParams();
    if (params.granularity) query.set('granularity', params.granularity);
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    return this.request<LinkAnalytics>(`/api/links/${slug}/analytics?${query}`);
  }

  async exportCsv(slug: string, params: { from?: string; to?: string } = {}): Promise<Blob> {
    const query = new URLSearchParams();
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    const res = await fetch(`${this.baseUrl}/api/links/${slug}/export?${query}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  }
}

export const api = new ApiClient();
