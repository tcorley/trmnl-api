import { app } from "./app"
import type { Bindings } from "./app"

const port = Number(process.env.PORT ?? 3000)
const hostname = process.env.HOST ?? "0.0.0.0"

// Pass env bindings to Hono context for local Bun development
const env: Bindings = {
  ACCESS_TOKEN: process.env.ACCESS_TOKEN ?? "",
  PLEX_BASE_URL: process.env.PLEX_BASE_URL ?? "",
  PLEX_TOKEN: process.env.PLEX_TOKEN ?? "",
}

Bun.serve({
  fetch: (req) => app.fetch(req, env),
  port,
  hostname,
})

console.log(`TRMNL API listening on http://${hostname}:${port}`)
