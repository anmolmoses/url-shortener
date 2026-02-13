# Sniplink — Self-Hosted URL Shortener

A fast, self-hosted URL shortener with analytics, API key auth, rate limiting, and a dark-themed dashboard.

## Features

- **URL Shortening** — Custom aliases or auto-generated slugs
- **Click Analytics** — Track clicks with referrer, device, country, and time-series data
- **API Key Auth** — Secure all endpoints with `X-API-Key` header
- **Rate Limiting** — Redis-backed sliding window (100 req/hour on link creation)
- **Health Checks** — `/api/health` for load balancer integration
- **Docker Deployment** — One command to run the full stack
- **Dark Dashboard** — Vercel/Linear-inspired UI with glassmorphism

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser    │────▶│  Next.js    │────▶│  PostgreSQL │
│   / cURL     │     │  (port 3000)│     │  (port 5432)│
└─────────────┘     │             │     └─────────────┘
                    │  ┌───────┐  │     ┌─────────────┐
                    │  │ Auth  │  │────▶│    Redis     │
                    │  │ Rate  │  │     │  (port 6379) │
                    │  │ Limit │  │     └─────────────┘
                    └──┴───────┴──┘
```

## Quick Start

### With Docker (recommended)

```bash
# 1. Clone the repo
git clone https://github.com/your-org/sniplink.git
cd sniplink

# 2. Set your API key
export API_KEYS=$(openssl rand -hex 32)
echo "Your API key: $API_KEYS"

# 3. Start everything
docker compose up -d

# 4. Verify it's running
curl http://localhost:3000/api/health
```

That's it. Postgres, Redis, and the app are all running.

### Local Development

```bash
cp .env.example .env
# Edit .env with your database and Redis URLs
npm install
npx prisma migrate dev
npm run dev
```

## Environment Variables

| Variable       | Description                           | Default                          |
| -------------- | ------------------------------------- | -------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string          | (required)                       |
| `REDIS_URL`    | Redis connection string               | `redis://localhost:6379`         |
| `API_KEYS`     | Comma-separated valid API keys        | (none — all requests allowed)    |
| `BASE_URL`     | Public URL for short links            | `http://localhost:3000`          |
| `NODE_ENV`     | Environment                           | `development`                    |

## API Documentation

All endpoints (except redirect and health) require the `X-API-Key` header.

### Health Check

```bash
curl http://localhost:3000/api/health
# {"status":"ok","postgres":true,"redis":true,"uptime":42}
```

### Create a Short Link

```bash
curl -X POST http://localhost:3000/api/links \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{"url": "https://example.com", "slug": "example"}'
# {"id":"...","url":"https://example.com","slug":"example","shortUrl":"http://localhost:3000/example"}
```

### List Links

```bash
curl http://localhost:3000/api/links \
  -H "X-API-Key: YOUR_KEY"
# {"links":[...],"pagination":{"page":1,"limit":20,"total":5,"pages":1}}
```

### Search Links

```bash
curl "http://localhost:3000/api/links?search=example" \
  -H "X-API-Key: YOUR_KEY"
```

### Update a Link

```bash
curl -X PATCH http://localhost:3000/api/links/example \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{"url": "https://new-url.com"}'
```

### Delete a Link

```bash
curl -X DELETE http://localhost:3000/api/links/example \
  -H "X-API-Key: YOUR_KEY"
```

### Get Click Analytics

```bash
curl "http://localhost:3000/api/links/example/clicks?days=30" \
  -H "X-API-Key: YOUR_KEY"
# {"slug":"example","totalClicks":142,"period":"30d","clicks":[...]}
```

### Redirect (no auth)

```bash
curl -L http://localhost:3000/example
# → Redirects to the original URL
```

## Rate Limits

| Endpoint         | Limit      | Window |
| ---------------- | ---------- | ------ |
| `POST /api/links`| 100        | 1 hour |

Rate limit headers are included in responses:
- `X-RateLimit-Limit` — Max requests per window
- `X-RateLimit-Remaining` — Requests remaining
- `X-RateLimit-Reset` — Unix timestamp when window resets

Exceeding the limit returns `429` with a `Retry-After` header.

## License

MIT
