import { Hono } from "hono"

const noRoute = new Hono()

const NO_AS_A_SERVICE_URL = "https://naas.isalman.dev/no"

noRoute.get("/no", async (c) => {
  const response = await fetch(NO_AS_A_SERVICE_URL)

  if (!response.ok) {
    return c.json(
      {
        error: "Upstream service error",
      },
      502,
    )
  }

  const data = (await response.json()) as Record<string, unknown>
  return c.json(data)
})

export { noRoute }
