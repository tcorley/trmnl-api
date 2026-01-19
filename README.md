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

## Local dev

```bash
bun install
bun run dev
```

Server binds `0.0.0.0` by default (good for same-WiFi device testing).
Override via `HOST` and `PORT` env vars.

## Scripts

- `bun run dev` - hot reload
- `bun run start` - production mode
- `bun run lint` - run `oxlint`
- `bun run format` - run `oxfmt`

## Deploying to Linux VM

Keep `HOST=0.0.0.0`, set `PORT`, and run `bun run start`. Put a reverse proxy
(Caddy or Nginx) in front if you need TLS and a stable hostname.

## Adding new dashboards

See `docs/adding-endpoints.md` for a template and conventions.
