import { Hono } from "hono"
import { authMiddleware } from "./middleware/auth"
import { helloRoute } from "./routes/hello"
import { noRoute } from "./routes/no"
import { plexLatestRoute } from "./routes/plexLatest"

export type Bindings = {
  ACCESS_TOKEN: string
  PLEX_BASE_URL: string
  PLEX_TOKEN: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use("/api/*", authMiddleware)

app.route("/api", helloRoute)
app.route("/api", noRoute)
app.route("/api", plexLatestRoute)

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

export { app }
