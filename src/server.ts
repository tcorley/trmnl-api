import { Hono } from "hono"
import { helloRoute } from "./routes/hello"
import { noRoute } from "./routes/no"

const app = new Hono()

app.route("/api", helloRoute)
app.route("/api", noRoute)

app.get("/", (c) =>
  c.json({
    name: "trmnl-api",
    status: "ok",
    docs: "/docs",
  }),
)

app.onError((error, c) => {
  return c.json(
    {
      error: "Internal Server Error",
      message: error.message,
    },
    500,
  )
})

const port = Number(process.env.PORT ?? 3000)
const hostname = process.env.HOST ?? "0.0.0.0"

Bun.serve({
  fetch: app.fetch,
  port,
  hostname,
})

console.log(`TRMNL API listening on http://${hostname}:${port}`)
