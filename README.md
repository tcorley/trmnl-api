# TRMNL API Server (Bun + Hono)

Maintainable, TypeScript-first API server for TRMNL dashboards. This is a clean
starting point with strict types, simple routing, and OXC tooling for linting and
formatting.

## Why this shape works for TRMNL

TRMNL devices poll endpoints on a schedule (pull model). Responses should be
fast, small, and predictable. Avoid pushing updates; design endpoints so the
device can request on its normal cadence and still render meaningful screens.
Details: https://docs.usetrmnl.com/go/how-it-works

Private plugin screens accept JSON with merge variables and have payload
constraints. Keep responses compact and cache upstream calls where possible.
Details: https://docs.usetrmnl.com/go/private-plugins/create-a-screen

## Endpoints

- `GET /api/hello` -> `{ "message": "Hello, TRMNL!" }`
- `GET /api/no` -> proxies JSON from `https://naas.isalman.dev/no`
- `GET /api/plex/latest` -> latest movies and TV additions from Plex

## Authentication

All `/api/*` endpoints require bearer token authentication. Requests without a
valid token receive a `401 Unauthorized` response.

### Setup

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Generate a new access token (UUID):

```bash
uuidgen | tr '[:upper:]' '[:lower:]'
```

3. Add the token to your `.env` file:

```
ACCESS_TOKEN=your-generated-uuid
PLEX_BASE_URL=http://your-plex-host:32400
PLEX_TOKEN=your-plex-token
```

### Making authenticated requests

Include the `Authorization` header with your token:

```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" http://localhost:3000/api/hello
```

Plex latest additions endpoint (optional `count` query clamped to 3-5):

```bash
curl \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "http://localhost:3000/api/plex/latest?count=5"
```

The root endpoint (`GET /`) is public and can be used for health checks.

## Local dev

```bash
bun install
cp .env.example .env
# Edit .env and set ACCESS_TOKEN
bun run dev
```

Server binds `0.0.0.0` by default (good for same-WiFi device testing).
Override via `HOST` and `PORT` env vars.

## Scripts

- `bun run dev` - hot reload
- `bun run start` - production mode
- `bun run test` - run tests
- `bun run typecheck` - run TypeScript type checking
- `bun run lint` - run `oxlint`
- `bun run format` - run `oxfmt`

## Deploying to Linux VM

Keep `HOST=0.0.0.0`, set `PORT`, and run `bun run start`. Put a reverse proxy
(Caddy or Nginx) in front if you need TLS and a stable hostname.

## Adding new dashboards

See `docs/adding-endpoints.md` for a template and conventions.
