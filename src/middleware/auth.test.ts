import { describe, expect, test, beforeAll } from "bun:test"
import { Hono } from "hono"
import { authMiddleware } from "./auth"
import type { Bindings } from "../app"

type ApiResponse = {
  error?: string
  message?: string
  status?: string
}

const TEST_TOKEN = "test-token-12345"

const testEnv: Bindings = {
  ACCESS_TOKEN: TEST_TOKEN,
  PLEX_BASE_URL: "http://127.0.0.1:32400",
  PLEX_TOKEN: "test-plex-token",
}

describe("authMiddleware", () => {
  let app: Hono<{ Bindings: Bindings }>

  beforeAll(() => {
    app = new Hono<{ Bindings: Bindings }>()
    app.use("/api/*", authMiddleware)
    app.get("/api/test", (c) => c.json({ message: "success" }))
    app.get("/", (c) => c.json({ status: "ok" }))
  })

  test("returns 401 when no Authorization header is provided", async () => {
    const res = await app.request("/api/test", {}, testEnv)

    expect(res.status).toBe(401)
    const body = (await res.json()) as ApiResponse
    expect(body.error).toBe("Unauthorized")
  })

  test("returns 401 when Authorization header has wrong token", async () => {
    const res = await app.request(
      "/api/test",
      {
        headers: {
          Authorization: "Bearer wrong-token",
        },
      },
      testEnv,
    )

    expect(res.status).toBe(401)
    const body = (await res.json()) as ApiResponse
    expect(body.error).toBe("Unauthorized")
  })

  test("returns 401 when Authorization header format is invalid", async () => {
    const res = await app.request(
      "/api/test",
      {
        headers: {
          Authorization: TEST_TOKEN, // Missing "Bearer " prefix
        },
      },
      testEnv,
    )

    expect(res.status).toBe(401)
    const body = (await res.json()) as ApiResponse
    expect(body.error).toBe("Unauthorized")
  })

  test("returns 200 when valid token is provided", async () => {
    const res = await app.request(
      "/api/test",
      {
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
        },
      },
      testEnv,
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as ApiResponse
    expect(body.message).toBe("success")
  })

  test("accepts lowercase authorization header", async () => {
    const res = await app.request(
      "/api/test",
      {
        headers: {
          authorization: `Bearer ${TEST_TOKEN}`,
        },
      },
      testEnv,
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as ApiResponse
    expect(body.message).toBe("success")
  })

  test("accepts mixed-case authorization header", async () => {
    const res = await app.request(
      "/api/test",
      {
        headers: {
          AUTHORIZATION: `Bearer ${TEST_TOKEN}`,
        },
      },
      testEnv,
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as ApiResponse
    expect(body.message).toBe("success")
  })

  test("accepts lowercase bearer scheme", async () => {
    const res = await app.request(
      "/api/test",
      {
        headers: {
          Authorization: `bearer ${TEST_TOKEN}`,
        },
      },
      testEnv,
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as ApiResponse
    expect(body.message).toBe("success")
  })

  test("accepts uppercase bearer scheme", async () => {
    const res = await app.request(
      "/api/test",
      {
        headers: {
          Authorization: `BEARER ${TEST_TOKEN}`,
        },
      },
      testEnv,
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as ApiResponse
    expect(body.message).toBe("success")
  })

  test("root endpoint works without authentication", async () => {
    const res = await app.request("/", {}, testEnv)

    expect(res.status).toBe(200)
    const body = (await res.json()) as ApiResponse
    expect(body.status).toBe("ok")
  })

  test("returns 500 when ACCESS_TOKEN env var is not set", async () => {
    const testApp = new Hono<{ Bindings: Bindings }>()
    testApp.use("/api/*", authMiddleware)
    testApp.get("/api/test", (c) => c.json({ message: "success" }))

    // Pass empty string for ACCESS_TOKEN to simulate misconfigured server
    const res = await testApp.request(
      "/api/test",
      {
        headers: {
          Authorization: "Bearer some-token",
        },
      },
      { ACCESS_TOKEN: "", PLEX_BASE_URL: "", PLEX_TOKEN: "" },
    )

    expect(res.status).toBe(500)
    const body = (await res.json()) as ApiResponse
    expect(body.error).toBe("Server misconfigured")
  })
})
