import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export type Granularity = 'hour' | 'day' | 'week';

interface ClickSummary {
  totalClicks: number;
  uniqueVisitors: number;
  topReferrers: { referrer: string; count: number }[];
  topCountries: { country: string; count: number }[];
  deviceBreakdown: { desktop: number; mobile: number; tablet: number; unknown: number };
  browserBreakdown: { browser: string; count: number }[];
  osBreakdown: { os: string; count: number }[];
}

interface TimeSeriesPoint {
  date: string;
  clicks: number;
  uniqueVisitors: number;
}

interface OverviewData {
  totalClicks: number;
  totalLinks: number;
  mostClickedLink: { id: string; slug: string; destinationUrl: string; clicks: number } | null;
  clicksPerDay: { date: string; clicks: number }[];
}

function defaultDateRange(from?: string, to?: string): { from: Date; to: Date } {
  const toDate = to ? new Date(to) : new Date();
  const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { from: fromDate, to: toDate };
}

export async function getClickSummary(
  linkId: string,
  from?: string,
  to?: string
): Promise<ClickSummary> {
  const range = defaultDateRange(from, to);

  // Total clicks and unique visitors
  const [stats] = await prisma.$queryRaw<{ total_clicks: bigint; unique_visitors: bigint }[]>(
    Prisma.sql`
      SELECT
        COUNT(*)::bigint AS total_clicks,
        COUNT(DISTINCT ip)::bigint AS unique_visitors
      FROM click_events
      WHERE link_id = ${linkId}::uuid
        AND clicked_at >= ${range.from}
        AND clicked_at < ${range.to}
    `
  );

  // Fetch all breakdowns in parallel
  const [topReferrers, topCountries, deviceRows, browserBreakdown, osBreakdown] = await Promise.all([
    getTopReferrers(linkId, from, to),
    getGeoBreakdown(linkId, from, to),
    getDeviceBreakdown(linkId, from, to),
    prisma.$queryRaw<{ browser: string; count: bigint }[]>(
      Prisma.sql`
        SELECT COALESCE(browser, 'Unknown') AS browser, COUNT(*)::bigint AS count
        FROM click_events
        WHERE link_id = ${linkId}::uuid
          AND clicked_at >= ${range.from}
          AND clicked_at < ${range.to}
        GROUP BY browser
        ORDER BY count DESC
        LIMIT 10
      `
    ),
    prisma.$queryRaw<{ os: string; count: bigint }[]>(
      Prisma.sql`
        SELECT COALESCE(os, 'Unknown') AS os, COUNT(*)::bigint AS count
        FROM click_events
        WHERE link_id = ${linkId}::uuid
          AND clicked_at >= ${range.from}
          AND clicked_at < ${range.to}
        GROUP BY os
        ORDER BY count DESC
        LIMIT 10
      `
    ),
  ]);

  // Build device breakdown object
  const deviceBreakdown = { desktop: 0, mobile: 0, tablet: 0, unknown: 0 };
  for (const row of deviceRows) {
    const key = row.device_type.toLowerCase() as keyof typeof deviceBreakdown;
    if (key in deviceBreakdown) {
      deviceBreakdown[key] = Number(row.count);
    } else {
      deviceBreakdown.unknown += Number(row.count);
    }
  }

  return {
    totalClicks: Number(stats.total_clicks),
    uniqueVisitors: Number(stats.unique_visitors),
    topReferrers,
    topCountries,
    deviceBreakdown,
    browserBreakdown: browserBreakdown.map((r) => ({ browser: r.browser, count: Number(r.count) })),
    osBreakdown: osBreakdown.map((r) => ({ os: r.os, count: Number(r.count) })),
  };
}

export async function getTimeSeries(
  linkId: string,
  from?: string,
  to?: string,
  granularity: Granularity = 'day'
): Promise<{ data: TimeSeriesPoint[] }> {
  const range = defaultDateRange(from, to);

  // Validate granularity to prevent SQL injection
  const validGranularities = ['hour', 'day', 'week'] as const;
  if (!validGranularities.includes(granularity)) {
    granularity = 'day';
  }

  // date_trunc requires a literal string, so we use conditional SQL
  const rows = await prisma.$queryRaw<{ bucket: Date; clicks: bigint; unique_visitors: bigint }[]>(
    granularity === 'hour'
      ? Prisma.sql`
          SELECT
            date_trunc('hour', clicked_at) AS bucket,
            COUNT(*)::bigint AS clicks,
            COUNT(DISTINCT ip)::bigint AS unique_visitors
          FROM click_events
          WHERE link_id = ${linkId}::uuid
            AND clicked_at >= ${range.from}
            AND clicked_at < ${range.to}
          GROUP BY bucket
          ORDER BY bucket ASC
        `
      : granularity === 'week'
        ? Prisma.sql`
            SELECT
              date_trunc('week', clicked_at) AS bucket,
              COUNT(*)::bigint AS clicks,
              COUNT(DISTINCT ip)::bigint AS unique_visitors
            FROM click_events
            WHERE link_id = ${linkId}::uuid
              AND clicked_at >= ${range.from}
              AND clicked_at < ${range.to}
            GROUP BY bucket
            ORDER BY bucket ASC
          `
        : Prisma.sql`
            SELECT
              date_trunc('day', clicked_at) AS bucket,
              COUNT(*)::bigint AS clicks,
              COUNT(DISTINCT ip)::bigint AS unique_visitors
            FROM click_events
            WHERE link_id = ${linkId}::uuid
              AND clicked_at >= ${range.from}
              AND clicked_at < ${range.to}
            GROUP BY bucket
            ORDER BY bucket ASC
          `
  );

  const formatDate = (d: Date, gran: Granularity): string => {
    if (gran === 'hour') {
      return d.toISOString().slice(0, 13) + ':00';
    }
    return d.toISOString().slice(0, 10);
  };

  return {
    data: rows.map((r) => ({
      date: formatDate(new Date(r.bucket), granularity),
      clicks: Number(r.clicks),
      uniqueVisitors: Number(r.unique_visitors),
    })),
  };
}

export async function getOverview(
  userId: string,
  from?: string,
  to?: string
): Promise<OverviewData> {
  const range = defaultDateRange(from, to);

  // Total links for user
  const [linkCount] = await prisma.$queryRaw<{ count: bigint }[]>(
    Prisma.sql`SELECT COUNT(*)::bigint AS count FROM links WHERE user_id = ${userId}::uuid`
  );

  // Total clicks across all user's links in date range
  const [clickCount] = await prisma.$queryRaw<{ count: bigint }[]>(
    Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM click_events ce
      JOIN links l ON l.id = ce.link_id
      WHERE l.user_id = ${userId}::uuid
        AND ce.clicked_at >= ${range.from}
        AND ce.clicked_at < ${range.to}
    `
  );

  // Most clicked link
  const mostClicked = await prisma.$queryRaw<
    { id: string; slug: string; destination_url: string; clicks: bigint }[]
  >(
    Prisma.sql`
      SELECT l.id, l.slug, l.destination_url, COUNT(ce.id)::bigint AS clicks
      FROM links l
      LEFT JOIN click_events ce ON ce.link_id = l.id
        AND ce.clicked_at >= ${range.from}
        AND ce.clicked_at < ${range.to}
      WHERE l.user_id = ${userId}::uuid
      GROUP BY l.id, l.slug, l.destination_url
      ORDER BY clicks DESC
      LIMIT 1
    `
  );

  // Clicks per day timeseries
  const dailyClicks = await prisma.$queryRaw<{ bucket: Date; clicks: bigint }[]>(
    Prisma.sql`
      SELECT
        date_trunc('day', ce.clicked_at) AS bucket,
        COUNT(*)::bigint AS clicks
      FROM click_events ce
      JOIN links l ON l.id = ce.link_id
      WHERE l.user_id = ${userId}::uuid
        AND ce.clicked_at >= ${range.from}
        AND ce.clicked_at < ${range.to}
      GROUP BY bucket
      ORDER BY bucket ASC
    `
  );

  return {
    totalClicks: Number(clickCount.count),
    totalLinks: Number(linkCount.count),
    mostClickedLink:
      mostClicked.length > 0 && Number(mostClicked[0].clicks) > 0
        ? {
            id: mostClicked[0].id,
            slug: mostClicked[0].slug,
            destinationUrl: mostClicked[0].destination_url,
            clicks: Number(mostClicked[0].clicks),
          }
        : null,
    clicksPerDay: dailyClicks.map((r) => ({
      date: new Date(r.bucket).toISOString().slice(0, 10),
      clicks: Number(r.clicks),
    })),
  };
}

export async function getTopReferrers(
  linkId: string,
  from?: string,
  to?: string,
  limit: number = 10
): Promise<{ referrer: string; count: number }[]> {
  const range = defaultDateRange(from, to);

  const rows = await prisma.$queryRaw<{ referrer: string; count: bigint }[]>(
    Prisma.sql`
      SELECT COALESCE(referrer, 'Direct') AS referrer, COUNT(*)::bigint AS count
      FROM click_events
      WHERE link_id = ${linkId}::uuid
        AND clicked_at >= ${range.from}
        AND clicked_at < ${range.to}
      GROUP BY referrer
      ORDER BY count DESC
      LIMIT ${limit}
    `
  );

  return rows.map((r) => ({ referrer: r.referrer, count: Number(r.count) }));
}

export async function getGeoBreakdown(
  linkId: string,
  from?: string,
  to?: string,
  limit: number = 20
): Promise<{ country: string; count: number }[]> {
  const range = defaultDateRange(from, to);

  const rows = await prisma.$queryRaw<{ country: string; count: bigint }[]>(
    Prisma.sql`
      SELECT COALESCE(country, 'Unknown') AS country, COUNT(*)::bigint AS count
      FROM click_events
      WHERE link_id = ${linkId}::uuid
        AND clicked_at >= ${range.from}
        AND clicked_at < ${range.to}
      GROUP BY country
      ORDER BY count DESC
      LIMIT ${limit}
    `
  );

  return rows.map((r) => ({ country: r.country, count: Number(r.count) }));
}

export async function getDeviceBreakdown(
  linkId: string,
  from?: string,
  to?: string
): Promise<{ device_type: string; count: bigint }[]> {
  const range = defaultDateRange(from, to);

  return prisma.$queryRaw<{ device_type: string; count: bigint }[]>(
    Prisma.sql`
      SELECT COALESCE(device_type::text, 'unknown') AS device_type, COUNT(*)::bigint AS count
      FROM click_events
      WHERE link_id = ${linkId}::uuid
        AND clicked_at >= ${range.from}
        AND clicked_at < ${range.to}
      GROUP BY device_type
      ORDER BY count DESC
    `
  );
}
