import { PrismaClient, DeviceType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash,
    },
  });

  console.log(`Created test user: ${user.email} (${user.id})`);

  const links = [
    { slug: 'github', destinationUrl: 'https://github.com' },
    { slug: 'google', destinationUrl: 'https://google.com' },
    { slug: 'docs', destinationUrl: 'https://developer.mozilla.org/en-US/' },
    { slug: 'hn', destinationUrl: 'https://news.ycombinator.com' },
    { slug: 'reddit', destinationUrl: 'https://reddit.com' },
  ];

  for (const link of links) {
    const created = await prisma.link.upsert({
      where: { slug: link.slug },
      update: {},
      create: {
        slug: link.slug,
        destinationUrl: link.destinationUrl,
        userId: user.id,
      },
    });
    console.log(`Created link: /${created.slug} -> ${created.destinationUrl}`);
  }

  // Add some sample click events for the first link
  const firstLink = await prisma.link.findUnique({ where: { slug: 'github' } });
  if (firstLink) {
    const devices: DeviceType[] = ['desktop', 'mobile', 'tablet', 'desktop', 'mobile'];
    const browsers = ['Chrome', 'Safari', 'Firefox', 'Edge', 'Chrome'];
    const oses = ['Windows', 'iOS', 'Android', 'macOS', 'Linux'];
    const countries = ['US', 'IN', 'DE', 'GB', 'JP'];

    for (let i = 0; i < 5; i++) {
      await prisma.clickEvent.create({
        data: {
          linkId: firstLink.id,
          ip: `192.168.1.${i + 1}`,
          country: countries[i],
          city: ['New York', 'Mumbai', 'Berlin', 'London', 'Tokyo'][i],
          referrer: ['https://google.com', 'https://twitter.com', null, 'https://reddit.com', null][i],
          userAgent: `Mozilla/5.0 (seed-agent-${i})`,
          deviceType: devices[i],
          browser: browsers[i],
          os: oses[i],
          clickedAt: new Date(Date.now() - i * 3600_000),
        },
      });
    }
    console.log('Created 5 sample click events for /github');
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
