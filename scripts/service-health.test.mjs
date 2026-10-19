import { describe, expect, it, vi } from "vitest"
import { checkServices, reportIsHealthy } from "./service-health.mjs"

const env = {
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-test-key",
  HEALTHCHECK_APP_URL: "https://gym.example",
}
const cors = {
  "access-control-allow-origin": "https://gym.example",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "apikey, authorization, content-type, x-client-info, x-supabase-api-version",
}
function json(value, status = 200) { return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } }) }
function workingFetch(url, options) {
  if (options.method === "OPTIONS") return Promise.resolve(new Response(null, { status: 204, headers: cors }))
  if (url.includes("/auth/v1/settings")) return Promise.resolve(json({ external: { email: true }, disable_signup: false }))
  if (url.includes("/rest/v1/")) return Promise.resolve(json({ swagger: "2.0", paths: {} }))
  if (url.includes("/models")) return Promise.resolve(json({ data: [{ id: "model-test", active: true }] }))
  return Promise.resolve(new Response("<html></html>", { headers: { "content-type": "text/html" } }))
}

describe("live service checker (mocked network)", () => {
  it("checks all configured systems without writes, emails, or inference", async () => {
    const fetch = vi.fn(workingFetch)
    const query = vi.fn().mockResolvedValue([{ healthy: 1 }])
    const results = await checkServices({ ...env, NEON_DATABASE_URL: "postgres://test", GROQ_API_KEY: "secret-test", GROQ_MODEL: "model-test" }, { fetch, query })
    expect(results).toHaveLength(7)
    expect(results.every((result) => result.status === "pass")).toBe(true)
    expect(reportIsHealthy(results, true)).toBe(true)
    expect(query).toHaveBeenCalledWith("postgres://test", expect.any(AbortSignal))
    for (const [, options] of fetch.mock.calls) {
      expect([undefined, "OPTIONS"]).toContain(options.method)
      expect(options.body).toBeUndefined()
      expect(options.redirect).toBe("error")
    }
    expect(JSON.stringify(results)).not.toContain("secret-test")
  })

  it("fails when required Supabase configuration is missing", async () => {
    const fetch = vi.fn()
    const results = await checkServices({}, { fetch })
    expect(results[0].status).toBe("fail")
    expect(reportIsHealthy(results)).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })

  it("reports unconfigured optional services as skipped, and fails strict mode", async () => {
    const results = await checkServices(env, { fetch: workingFetch })
    expect(results.filter((result) => result.status === "skip").map((result) => result.name)).toEqual(["Neon database", "Groq model API"])
    expect(reportIsHealthy(results)).toBe(true)
    expect(reportIsHealthy(results, true)).toBe(false)
  })

  it("detects a paused/deleted hostname instead of blaming CORS", async () => {
    const results = await checkServices(env, { fetch: vi.fn().mockRejectedValue(Object.assign(new Error("fetch failed"), { cause: { code: "ENOTFOUND" } })) })
    expect(results.find((result) => result.name === "Supabase authentication").detail).toContain("DNS lookup failed")
    expect(reportIsHealthy(results)).toBe(false)
  })

  it.each([401, 403, 503])("fails on HTTP %s", async (status) => {
    const results = await checkServices(env, { fetch: () => Promise.resolve(json({}, status)) })
    expect(results[0].status).toBe("fail")
    expect(results[0].detail).toContain(`HTTP ${status}`)
  })

  it.each([
    [{ external: { email: false }, disable_signup: false }, "Email authentication is disabled"],
    [{ external: { email: true }, disable_signup: true }, "Account signup is disabled"],
  ])("detects disabled authentication settings", async (settings, message) => {
    const results = await checkServices(env, { fetch: (url, options) => url.includes("/settings") ? Promise.resolve(json(settings)) : workingFetch(url, options) })
    expect(results[0].detail).toContain(message)
    expect(reportIsHealthy(results)).toBe(false)
  })

  it.each([
    { ...cors, "access-control-allow-origin": "https://wrong.example" },
    { ...cors, "access-control-allow-methods": "GET" },
    { ...cors, "access-control-allow-headers": "*" },
  ])("fails invalid preflight responses", async (headers) => {
    const results = await checkServices(env, { fetch: (url, options) => options.method === "OPTIONS" ? Promise.resolve(new Response(null, { headers })) : workingFetch(url, options) })
    expect(results.filter((result) => result.name.endsWith("CORS")).every((result) => result.status === "fail")).toBe(true)
  })

  it("aborts stalled requests and returns a bounded result", async () => {
    const signals = []
    const results = await checkServices({ ...env, HEALTHCHECK_TIMEOUT_MS: "10" }, { fetch: (_url, options) => {
      signals.push(options.signal)
      return new Promise(() => {})
    } })
    expect(results.filter((result) => result.status === "fail").every((result) => result.detail.includes("Timed out"))).toBe(true)
    expect(signals.every((signal) => signal.aborted)).toBe(true)
  })

  it("rejects an HTML success page masquerading as a healthy REST API", async () => {
    const results = await checkServices(env, { fetch: (url, options) => url.includes("/rest/") ? Promise.resolve(json({})) : workingFetch(url, options) })
    expect(results.find((result) => result.name === "Supabase REST API").status).toBe("fail")
  })

  it("fails an invalid REST key even when public auth settings and CORS work", async () => {
    const results = await checkServices(env, { fetch: (url, options) => url.includes("/rest/") ? Promise.resolve(json({ message: "Invalid API key" }, 401)) : workingFetch(url, options) })
    expect(results.find((result) => result.name === "Supabase authentication").status).toBe("pass")
    expect(results.find((result) => result.name === "Supabase REST API").detail).toContain("Invalid API key")
    expect(reportIsHealthy(results)).toBe(false)
  })

  it("does not expose credentials from database exceptions", async () => {
    const results = await checkServices({ ...env, NEON_DATABASE_URL: "postgres://user:secret@host/db" }, { fetch: workingFetch, query: () => { throw new Error("postgres://user:secret@host/db failed") } })
    expect(results.find((result) => result.name === "Neon database").status).toBe("fail")
    expect(JSON.stringify(results)).not.toContain("secret")
  })

  it("detects unavailable Groq models without issuing a completion", async () => {
    const results = await checkServices({ ...env, GROQ_API_KEY: "secret", GROQ_MODEL: "removed-model" }, { fetch: workingFetch })
    expect(results.find((result) => result.name === "Groq model API").status).toBe("fail")
  })

  it("accepts legacy Supabase anon keys", async () => {
    const fetch = vi.fn(workingFetch)
    const results = await checkServices({ ...env, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "legacy-test" }, { fetch })
    expect(results[0].status).toBe("pass")
    expect(fetch.mock.calls.find(([url]) => url.includes("/settings"))[1].headers.apikey).toBe("legacy-test")
  })

  it("sends legacy JWT bearer authentication to REST, but not publishable keys", async () => {
    for (const key of ["eyJ.test.signature", "sb_publishable_test"]) {
      const fetch = vi.fn(workingFetch)
      await checkServices({ ...env, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key }, { fetch })
      const headers = fetch.mock.calls.find(([url]) => url.includes("/rest/v1/"))[1].headers
      expect(headers.Authorization).toBe(key.startsWith("eyJ") ? `Bearer ${key}` : undefined)
    }
  })

  it("rejects unsafe service URLs before sending a key", async () => {
    const fetch = vi.fn(workingFetch)
    const results = await checkServices({ NEXT_PUBLIC_SUPABASE_URL: "http://remote.example", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "secret" }, { fetch })
    expect(reportIsHealthy(results)).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })
})
