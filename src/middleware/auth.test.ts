import { describe, expect, test, beforeAll } from "bun:test"
import { Hono } from "hono"
import { authMiddleware } from "./auth"

type ApiResponse = {
  error?: string
  message?: string
  status?: string
}

const TEST_TOKEN = "test-token-12345"

describe("authMiddleware", () => {
  let app: Hono

  beforeAll(() => {
    process.env.ACCESS_TOKEN = TEST_TOKEN

    app = new Hono()
    app.use("/api/*", authMiddleware)
    app.get("/api/test", (c) => c.json({ message: "success" }))
    app.get("/", (c) => c.json({ status: "ok" }))
  })

  test("returns 401 when no Authorization header is provided", async () => {
    const res = await app.request("/api/test")

    expect(res.status).toBe(401)
    const body = (await res.json()) as ApiResponse
    expect(body.error).toBe("Unauthorized")
  })

  test("returns 401 when Authorization header has wrong token", async () => {
    const res = await app.request("/api/test", {
      headers: {
        Authorization: "Bearer wrong-token",
      },
    })

    expect(res.status).toBe(401)
    const body = (await res.json()) as ApiResponse
    expect(body.error).toBe("Unauthorized")
  })

  test("returns 401 when Authorization header format is invalid", async () => {
    const res = await app.request("/api/test", {
      headers: {
        Authorization: TEST_TOKEN, // Missing "Bearer " prefix
      },
    })

    expect(res.status).toBe(401)
    const body = (await res.json()) as ApiResponse
    expect(body.error).toBe("Unauthorized")
  })

  test("returns 200 when valid token is provided", async () => {
    const res = await app.request("/api/test", {
      headers: {
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as ApiResponse
    expect(body.message).toBe("success")
  })

  test("accepts lowercase authorization header", async () => {
    const res = await app.request("/api/test", {
      headers: {
        authorization: `Bearer ${TEST_TOKEN}`,
      },
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as ApiResponse
    expect(body.message).toBe("success")
  })

  test("accepts mixed-case authorization header", async () => {
    const res = await app.request("/api/test", {
      headers: {
        AUTHORIZATION: `Bearer ${TEST_TOKEN}`,
      },
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as ApiResponse
    expect(body.message).toBe("success")
  })

  test("accepts lowercase bearer scheme", async () => {
    const res = await app.request("/api/test", {
      headers: {
        Authorization: `bearer ${TEST_TOKEN}`,
      },
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as ApiResponse
    expect(body.message).toBe("success")
  })

  test("accepts uppercase bearer scheme", async () => {
    const res = await app.request("/api/test", {
      headers: {
        Authorization: `BEARER ${TEST_TOKEN}`,
      },
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as ApiResponse
    expect(body.message).toBe("success")
  })

  test("root endpoint works without authentication", async () => {
    const res = await app.request("/")

    expect(res.status).toBe(200)
    const body = (await res.json()) as ApiResponse
    expect(body.status).toBe("ok")
  })

  test("returns 500 when ACCESS_TOKEN env var is not set", async () => {
    const originalToken = process.env.ACCESS_TOKEN
    delete process.env.ACCESS_TOKEN

    const testApp = new Hono()
    testApp.use("/api/*", authMiddleware)
    testApp.get("/api/test", (c) => c.json({ message: "success" }))

    const res = await testApp.request("/api/test", {
      headers: {
        Authorization: "Bearer some-token",
      },
    })

    expect(res.status).toBe(500)
    const body = (await res.json()) as ApiResponse
    expect(body.error).toBe("Server misconfigured")

    // Restore the token
    process.env.ACCESS_TOKEN = originalToken
  })
})
