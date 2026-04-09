import { createMiddleware } from "hono/factory"
import type { Bindings } from "../app"

export const authMiddleware = createMiddleware<{ Bindings: Bindings }>(
  async (c, next) => {
    const authHeader = c.req.header("Authorization")
    const token = c.env.ACCESS_TOKEN

    if (!token) {
      return c.json({ error: "Server misconfigured" }, 500)
    }

    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401)
    }

    // RFC 6750: Bearer scheme is case-insensitive
    const match = authHeader.match(/^bearer\s+(.+)$/i)
    if (!match || match[1] !== token) {
      return c.json({ error: "Unauthorized" }, 401)
    }

    await next()
  },
)
