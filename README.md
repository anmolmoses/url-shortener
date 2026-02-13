# LinkShort — URL Shortener

A full-stack URL shortener with analytics, built with Fastify, Prisma, PostgreSQL, and React.

## Quick Start

```bash
# Copy environment file
cp .env.example .env

# Start all services
docker compose up --build
```

- **API:** http://localhost:3000
- **Web:** http://localhost:5173
- **PostgreSQL:** localhost:5432

## Auth Endpoints

### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email": "user@example.com", "password": "mypassword"}'
# → { "token": "eyJ..." }
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email": "user@example.com", "password": "mypassword"}'
# → { "token": "eyJ..." }
```

### Authenticated requests
```bash
curl http://localhost:3000/api/health \
  -H 'Authorization: Bearer <token>'
```

## Test User (after seeding)

- **Email:** test@example.com
- **Password:** password123

## Development

```bash
# Run migrations
cd api && npm run db:migrate

# Seed database
cd api && npm run db:seed

# Dev server (API)
cd api && npm run dev

# Dev server (Web)
cd web && npm run dev
```

## Tech Stack

- **API:** Fastify, Prisma, PostgreSQL, JWT, bcrypt, Zod
- **Web:** React, Vite, TypeScript
- **Infra:** Docker Compose, multi-stage builds
