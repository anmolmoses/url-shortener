# LinkShort — Web Dashboard

React SPA for link management and analytics visualization.

## Tech Stack

- **React 18** + TypeScript
- **Vite** for build tooling
- **Tailwind CSS** with dark-mode-first design
- **Recharts** for analytics charts (Area, Bar, Pie)
- **React Router v6** for client-side routing
- **Axios** for API communication
- **Lucide React** for icons
- **date-fns** for date formatting

## Getting Started

```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api` requests to `http://localhost:3000`.

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── Layout.tsx       # Sidebar + top bar + responsive nav
│   ├── CopyButton.tsx   # Click-to-copy with toast
│   ├── CreateLinkModal.tsx  # New link creation form
│   ├── EmptyState.tsx   # Empty state placeholder
│   └── Skeleton.tsx     # Loading skeleton components
├── contexts/         # React context providers
│   ├── AuthContext.tsx  # JWT auth state management
│   └── ToastContext.tsx # Toast notifications
├── lib/              # Utilities and API
│   ├── api.ts          # Axios instance with interceptors
│   ├── hooks.ts        # Custom data-fetching hooks
│   └── utils.ts        # Formatters and helpers
├── pages/            # Route pages
│   ├── LoginPage.tsx    # Auth (login/register)
│   ├── DashboardPage.tsx # Overview with stats + charts
│   ├── LinksPage.tsx    # Full link list with pagination
│   └── LinkDetailPage.tsx # Single link analytics
├── App.tsx           # Routes and providers
├── main.tsx          # Entry point
└── index.css         # Tailwind + custom styles
```

## Design System

- **Dark mode** by default with light mode toggle
- **Slate** backgrounds (`#0F172A` base, `#1E293B` surface)
- **Indigo** (`#6366F1`) primary actions
- **Cyan** (`#22D3EE`) data highlights
- **Emerald** (`#10B981`) positive metrics
- **JetBrains Mono** for URLs and slugs
- **Inter** for all other text

## Production Build

```bash
npm run build
```

### Docker

```bash
docker build -t linkshort-web .
docker run -p 80:80 linkshort-web
```

The nginx config proxies `/api` to `http://api:3000` and serves the SPA with `try_files`.

## API Expectations

The dashboard expects these API endpoints:

- `POST /api/auth/login` — `{ email, password }` → `{ token }`
- `POST /api/auth/register` — `{ email, password }` → `{ token }`
- `GET /api/links` — `?page=&limit=&search=` → `{ links, total }`
- `POST /api/links` — `{ destination, slug?, expiresAt? }` → link object
- `GET /api/links/:id` — link detail
- `GET /api/links/:id/analytics` — `?since=` → `{ timeseries, referrers, countries, devices, browsers, totalClicks }`
- `GET /api/dashboard` — `?since=` → `{ totalLinks, totalClicks, topLink, clicksByDay, recentLinks }`
