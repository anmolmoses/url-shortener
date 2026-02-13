# ✂️ Snip — Self-Hosted URL Shortener

A fast, self-hosted URL shortener with analytics, API key auth, rate limiting, and a sleek dark dashboard. Built with Next.js 14, Prisma, PostgreSQL, and Redis.

## Features

- 🔗 **Short links** with custom slugs and expiration dates
- 📊 **Click analytics** — time series, referrers, devices, countries
- 🔐 **API key authentication** on all management endpoints
- ⏱️ **Rate limiting** (sliding window, Redis-backed)
- 🏥 **Health check** endpoint with dependency status
- 🐳 **Docker deployment** — one command to production
- 🌙 **Dark theme** dashboard — Vercel/Linear-inspired design

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   Client / Browser                │
└──────────────┬──────────────────┬────────────────┘
               │ API (auth)       │ Redirect (no auth)
               ▼                  ▼
┌──────────────────────────────────────────────────┐
│              Next.js App (Port 3000)             │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Auth     │ │ Rate     │ │ API Routes       │  │
│  │ Middleware│ │ Limiter  │ │ /api/links       │  │
│  └────┬─────┘ └────┬─────┘ │ /api/links/[slug]│  │
│       │            │       │ /api/health       │  │
│       └────────────┘       └────────┬─────────┘  │
└──────────────────────────────┬──────┴────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                                ▼
┌──────────────────────┐       ┌──────────────────────┐
│   PostgreSQL 16      │       │     Redis 7          │
│   • links table      │       │     • rate limits     │
│   • clicks table     │       │     • caching         │
│   • api_keys table   │       │                       │
└──────────────────────┘       └──────────────────────┘
```

## Quick Start

### Docker (Recommended)

```bash
# 1. Clone the repo
git clone https://github.com/your-org/snip.git && cd snip

# 2. Set your API key
export API_KEYS="$(openssl rand -hex 32)"
echo "Your API key: $API_KEYS"

# 3. Launch
docker compose up -d

# 4. Verify
curl http://localhost:3000/api/health
```

That's it. Postgres, Redis, and the app are all running.

### Local Development

```bash
# Install deps
npm install

# Copy env file
cp .env.example .env
# Edit .env with your values

# Start Postgres & Redis (or use docker compose up postgres redis)
# Run migrations
npx prisma migrate dev

# Start dev server
npm run dev
```

## Environment Variables

| Variable       | Description                              | Default                       | Required |
| -------------- | ---------------------------------------- | ----------------------------- | -------- |
| `DATABASE_URL` | PostgreSQL connection string             | —                             | ✅       |
| `REDIS_URL`    | Redis connection string                  | `redis://localhost:6379`      | ✅       |
| `API_KEYS`     | Comma-separated valid API keys           | —                             | ✅       |
| `BASE_URL`     | Public base URL for short links          | `http://localhost:3000`       | ✅       |
| `NODE_ENV`     | Environment (`development`/`production`) | `development`                 | No       |

## API Documentation

All management endpoints require the `X-API-Key` header. The redirect endpoint (`GET /:slug`) does **not** require auth.

### Health Check

```bash
curl http://localhost:3000/api/health
```

Response:
```json
{"status":"ok","postgres":true,"redis":true,"uptime":123,"timestamp":"2025-01-01T00:00:00.000Z"}
```

### Create a Short Link

```bash
curl -X POST http://localhost:3000/api/links \
  -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "slug": "demo"}'
```

Response (`201`):
```json
{
  "id": "clx...",
  "slug": "demo",
  "url": "https://example.com",
  "shortUrl": "http://localhost:3000/demo",
  "expiresAt": null,
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

### List Links

```bash
curl http://localhost:3000/api/links \
  -H "X-API-Key: YOUR_KEY"

# With search and pagination
curl "http://localhost:3000/api/links?search=example&page=1&limit=10" \
  -H "X-API-Key: YOUR_KEY"
```

### Get Link Details

```bash
curl http://localhost:3000/api/links/demo \
  -H "X-API-Key: YOUR_KEY"
```

### Update a Link

```bash
curl -X PATCH http://localhost:3000/api/links/demo \
  -H "X-API-Key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://new-url.com"}'
```

### Delete a Link

```bash
curl -X DELETE http://localhost:3000/api/links/demo \
  -H "X-API-Key: YOUR_KEY"
```

### Get Click Analytics

```bash
# Default: last 7 days
curl http://localhost:3000/api/links/demo/clicks \
  -H "X-API-Key: YOUR_KEY"

# Custom range: 24h, 7d, 30d, 90d, all
curl "http://localhost:3000/api/links/demo/clicks?range=30d" \
  -H "X-API-Key: YOUR_KEY"
```

Response:
```json
{
  "slug": "demo",
  "totalClicks": 42,
  "range": "30d",
  "timeSeries": [{"date": "2025-01-01", "clicks": 5}],
  "referrers": [{"source": "twitter.com", "clicks": 20}],
  "devices": [{"device": "Desktop", "clicks": 30}],
  "countries": [{"country": "US", "clicks": 25}]
}
```

### Redirect

```bash
# No auth needed — this is the public short URL
curl -L http://localhost:3000/demo
```

## Rate Limits

| Endpoint         | Limit    | Window |
| ---------------- | -------- | ------ |
| `POST /api/links` | 100 req | 1 hour |

Rate limit headers are included in responses:
- `X-RateLimit-Limit` — Maximum requests allowed
- `X-RateLimit-Remaining` — Requests remaining
- `X-RateLimit-Reset` — Unix timestamp when the window resets

Exceeding the limit returns `429` with a `Retry-After` header.

## Error Responses

| Status | Meaning                   |
| ------ | ------------------------- |
| `400`  | Bad request / invalid input |
| `401`  | Missing or invalid API key  |
| `404`  | Link not found              |
| `409`  | Slug already taken          |
| `429`  | Rate limit exceeded         |
| `503`  | Service degraded            |

## License

MIT
