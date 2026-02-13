import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import {
  getClickSummary,
  getTimeSeries,
  getOverview,
  getTopReferrers,
  getGeoBreakdown,
  getDeviceBreakdown,
} from '../analytics.queries.js';

const prisma = new PrismaClient();

const TEST_USER_ID = faker.string.uuid();
const TEST_LINK_IDS = [faker.string.uuid(), faker.string.uuid(), faker.string.uuid()];
const TEST_SLUGS = ['test-aaa', 'test-bbb', 'test-ccc'];

const COUNTRIES = ['US', 'GB', 'DE', 'JP', 'BR', 'IN', 'FR', 'CA', 'AU', 'KR'];
const REFERRERS = ['https://google.com', 'https://twitter.com', 'https://reddit.com', 'https://github.com', null];
const DEVICE_TYPES = ['desktop', 'mobile', 'tablet', 'unknown'] as const;
const BROWSERS = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera'];
const OS_LIST = ['Windows', 'macOS', 'Linux', 'iOS', 'Android'];

// Track seeded data for verification
let seededClicks: {
  linkId: string;
  ip: string;
  country: string | null;
  referrer: string | null;
  deviceType: string;
  browser: string;
  os: string;
  clickedAt: Date;
}[] = [];

beforeAll(async () => {
  // Create test user
  await prisma.user.create({
    data: {
      id: TEST_USER_ID,
      email: `test-analytics-${Date.now()}@test.com`,
      passwordHash: 'not-a-real-hash',
    },
  });

  // Create test links
  for (let i = 0; i < TEST_LINK_IDS.length; i++) {
    await prisma.link.create({
      data: {
        id: TEST_LINK_IDS[i],
        slug: TEST_SLUGS[i],
        destinationUrl: `https://example.com/${i}`,
        userId: TEST_USER_ID,
      },
    });
  }

  // Seed 1000 click events spread across the links
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  seededClicks = [];
  for (let i = 0; i < 1000; i++) {
    const linkIndex = i % TEST_LINK_IDS.length;
    const click = {
      linkId: TEST_LINK_IDS[linkIndex],
      ip: faker.internet.ip(),
      country: faker.helpers.arrayElement(COUNTRIES),
      referrer: faker.helpers.arrayElement(REFERRERS),
      deviceType: faker.helpers.arrayElement([...DEVICE_TYPES]),
      browser: faker.helpers.arrayElement(BROWSERS),
      os: faker.helpers.arrayElement(OS_LIST),
      clickedAt: faker.date.between({ from: thirtyDaysAgo, to: now }),
    };
    seededClicks.push(click);
  }

  // Bulk insert for speed
  await prisma.clickEvent.createMany({
    data: seededClicks.map((c) => ({
      linkId: c.linkId,
      ip: c.ip,
      country: c.country,
      referrer: c.referrer,
      deviceType: c.deviceType as any,
      browser: c.browser,
      os: c.os,
      clickedAt: c.clickedAt,
      userAgent: 'test-agent',
    })),
  });
}, 30000);

afterAll(async () => {
  // Clean up test data
  await prisma.clickEvent.deleteMany({ where: { linkId: { in: TEST_LINK_IDS } } });
  await prisma.link.deleteMany({ where: { id: { in: TEST_LINK_IDS } } });
  await prisma.user.delete({ where: { id: TEST_USER_ID } });
  await prisma.$disconnect();
});

describe('getClickSummary', () => {
  it('returns correct total clicks for a link', async () => {
    const linkId = TEST_LINK_IDS[0];
    const expected = seededClicks.filter((c) => c.linkId === linkId).length;

    const summary = await getClickSummary(linkId);
    expect(summary.totalClicks).toBe(expected);
  });

  it('returns correct unique visitor count (distinct IPs)', async () => {
    const linkId = TEST_LINK_IDS[0];
    const linkClicks = seededClicks.filter((c) => c.linkId === linkId);
    const uniqueIps = new Set(linkClicks.map((c) => c.ip)).size;

    const summary = await getClickSummary(linkId);
    expect(summary.uniqueVisitors).toBe(uniqueIps);
  });

  it('returns device breakdown that sums to total', async () => {
    const linkId = TEST_LINK_IDS[0];
    const summary = await getClickSummary(linkId);
    const deviceTotal =
      summary.deviceBreakdown.desktop +
      summary.deviceBreakdown.mobile +
      summary.deviceBreakdown.tablet +
      summary.deviceBreakdown.unknown;
    expect(deviceTotal).toBe(summary.totalClicks);
  });

  it('respects date range filtering', async () => {
    const linkId = TEST_LINK_IDS[0];
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const expected = seededClicks.filter(
      (c) => c.linkId === linkId && c.clickedAt >= sevenDaysAgo && c.clickedAt < now
    ).length;

    const summary = await getClickSummary(linkId, sevenDaysAgo.toISOString(), now.toISOString());
    expect(summary.totalClicks).toBe(expected);
  });
});

describe('getTimeSeries', () => {
  it('returns daily buckets by default', async () => {
    const linkId = TEST_LINK_IDS[0];
    const result = await getTimeSeries(linkId);

    expect(result.data.length).toBeGreaterThan(0);
    // Each entry should have YYYY-MM-DD format
    for (const point of result.data) {
      expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(point.clicks).toBeGreaterThan(0);
      expect(point.uniqueVisitors).toBeGreaterThan(0);
      expect(point.uniqueVisitors).toBeLessThanOrEqual(point.clicks);
    }
  });

  it('returns hourly buckets when granularity=hour', async () => {
    const linkId = TEST_LINK_IDS[0];
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const result = await getTimeSeries(linkId, threeDaysAgo.toISOString(), now.toISOString(), 'hour');

    if (result.data.length > 0) {
      // Hourly format: YYYY-MM-DDTHH:00
      expect(result.data[0].date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:00$/);
    }
  });

  it('total clicks across buckets matches summary total', async () => {
    const linkId = TEST_LINK_IDS[0];
    const ts = await getTimeSeries(linkId);
    const summary = await getClickSummary(linkId);

    const tsTotal = ts.data.reduce((sum, p) => sum + p.clicks, 0);
    expect(tsTotal).toBe(summary.totalClicks);
  });
});

describe('getOverview', () => {
  it('returns correct total links for user', async () => {
    const overview = await getOverview(TEST_USER_ID);
    expect(overview.totalLinks).toBe(TEST_LINK_IDS.length);
  });

  it('returns correct total clicks across all links', async () => {
    const overview = await getOverview(TEST_USER_ID);
    expect(overview.totalClicks).toBe(1000);
  });

  it('identifies the most clicked link', async () => {
    const overview = await getOverview(TEST_USER_ID);
    expect(overview.mostClickedLink).not.toBeNull();
    expect(TEST_LINK_IDS).toContain(overview.mostClickedLink!.id);
  });

  it('returns daily clicks timeseries', async () => {
    const overview = await getOverview(TEST_USER_ID);
    expect(overview.clicksPerDay.length).toBeGreaterThan(0);

    const totalFromTimeseries = overview.clicksPerDay.reduce((sum, d) => sum + d.clicks, 0);
    expect(totalFromTimeseries).toBe(overview.totalClicks);
  });
});

describe('getTopReferrers', () => {
  it('returns referrers sorted by count descending', async () => {
    const linkId = TEST_LINK_IDS[0];
    const referrers = await getTopReferrers(linkId);

    expect(referrers.length).toBeGreaterThan(0);
    for (let i = 1; i < referrers.length; i++) {
      expect(referrers[i - 1].count).toBeGreaterThanOrEqual(referrers[i].count);
    }
  });

  it('respects limit parameter', async () => {
    const linkId = TEST_LINK_IDS[0];
    const referrers = await getTopReferrers(linkId, undefined, undefined, 3);
    expect(referrers.length).toBeLessThanOrEqual(3);
  });
});

describe('getGeoBreakdown', () => {
  it('returns countries sorted by count descending', async () => {
    const linkId = TEST_LINK_IDS[0];
    const countries = await getGeoBreakdown(linkId);

    expect(countries.length).toBeGreaterThan(0);
    for (let i = 1; i < countries.length; i++) {
      expect(countries[i - 1].count).toBeGreaterThanOrEqual(countries[i].count);
    }
  });

  it('country counts sum to total clicks', async () => {
    const linkId = TEST_LINK_IDS[0];
    const countries = await getGeoBreakdown(linkId, undefined, undefined, 100);
    const summary = await getClickSummary(linkId);

    const countryTotal = countries.reduce((sum, c) => sum + c.count, 0);
    expect(countryTotal).toBe(summary.totalClicks);
  });
});

describe('getDeviceBreakdown', () => {
  it('returns all device types', async () => {
    const linkId = TEST_LINK_IDS[0];
    const devices = await getDeviceBreakdown(linkId);
    expect(devices.length).toBeGreaterThan(0);
  });
});
