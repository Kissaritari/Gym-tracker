import { neon } from "@neondatabase/serverless"

class HealthError extends Error {}
const requiredHeaders = ["apikey", "authorization", "content-type", "x-client-info", "x-supabase-api-version"]

function baseUrl(value) {
  try {
    const url = new URL(value)
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error()
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) throw new Error()
    return url.origin
  } catch { throw new HealthError("Invalid service URL. Use an HTTPS origin (HTTP is allowed for localhost).") }
}

function errorSummary(error) {
  if (error instanceof HealthError) return error.message
  const code = error?.cause?.code || error?.code
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "DNS lookup failed. Check the project URL and whether the project is active or paused."
  if (error?.name === "TimeoutError" || error?.name === "AbortError") return "Timed out waiting for the service."
  if (code === "ECONNREFUSED") return "The service refused the connection."
  if (code === "EACCES" || code === "EPERM") return "Network access was blocked by this environment."
  // Raw exceptions can contain database URLs, API keys, or response bodies.
  return "Service request failed. Check connectivity, credentials, and provider status."
}

async function runCheck(name, action, timeoutMs) {
  const start = Date.now()
  const controller = new AbortController()
  let timer
  try {
    const detail = await Promise.race([
      Promise.resolve().then(() => action(controller.signal)),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new HealthError("Timed out waiting for the service."))
          controller.abort()
        }, timeoutMs)
      }),
    ])
    return { name, status: "pass", detail, durationMs: Date.now() - start }
  } catch (error) {
    return { name, status: "fail", detail: errorSummary(error), durationMs: Date.now() - start }
  } finally { clearTimeout(timer) }
}

/** Read-only checks. Inject dependencies in tests so npm test never uses live services. */
export async function checkServices(env = process.env, dependencies = {}) {
  const fetcher = dependencies.fetch || globalThis.fetch
  const query = dependencies.query || (async (connection, signal) => {
    return neon(connection).query("SELECT 1 AS healthy", [], { fetchOptions: { signal } })
  })
  const timeoutMs = Number(env.HEALTHCHECK_TIMEOUT_MS || 10000)
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) {
    return [{ name: "Configuration", status: "fail", detail: "HEALTHCHECK_TIMEOUT_MS must be an integer from 1 to 60000.", durationMs: 0 }]
  }
  const jobs = []
  const add = (name, action) => jobs.push(runCheck(name, action, timeoutMs))
  const skip = (name, detail) => jobs.push(Promise.resolve({ name, status: "skip", detail, durationMs: 0 }))
  async function request(url, signal, options = {}) {
    const response = await fetcher(url, { ...options, signal, redirect: "error" })
    if (!response.ok) {
      if (response.status === 401) {
        const body = await response.json().catch(() => null)
        if (body?.message === "Invalid API key") throw new HealthError("HTTP 401: Invalid API key. Check the key for this project and rebuild the deployment if it changed.")
      }
      const hint = response.status === 401 || response.status === 403 ? " Check the service key and permissions." : ""
      throw new HealthError(`HTTP ${response.status}.${hint}`)
    }
    return response
  }

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  const appUrl = env.HEALTHCHECK_APP_URL?.trim()
  if (!supabaseUrl) {
    add("Supabase configuration", () => { throw new HealthError("Missing NEXT_PUBLIC_SUPABASE_URL. Supabase checks cannot run.") })
  } else {
    add("Supabase authentication", async (signal) => {
      const base = baseUrl(supabaseUrl)
      if (!key) throw new HealthError("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.")
      const settings = await (await request(`${base}/auth/v1/settings`, signal, { headers: { apikey: key } })).json()
      if (settings.external?.email !== true) throw new HealthError("Email authentication is disabled or the settings response is invalid.")
      if (settings.disable_signup !== false) throw new HealthError("Account signup is disabled or the settings response is invalid.")
      return "Auth settings API responds; email authentication and signup are enabled. This endpoint alone does not validate the key."
    })
    add("Supabase REST API", async (signal) => {
      const base = baseUrl(supabaseUrl)
      if (!key) throw new HealthError("Missing Supabase public key; REST API cannot be checked.")
      const headers = { apikey: key, Accept: "application/openapi+json" }
      // Legacy anon keys are JWTs and PostgREST expects their bearer header.
      // Publishable keys are not JWTs; the Supabase gateway handles those.
      if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`
      const schema = await (await request(`${base}/rest/v1/`, signal, { headers })).json()
      if ((!schema.swagger && !schema.openapi) || !schema.paths) throw new HealthError("REST API returned an unexpected schema response.")
      return "REST API responds with its schema; user-specific permissions and migrations are not verified."
    })
    for (const [label, path] of [["login", "/auth/v1/token?grant_type=password"], ["signup", "/auth/v1/signup"]]) {
      if (!appUrl) { skip(`Supabase ${label} CORS`, "Set HEALTHCHECK_APP_URL to check browser access from your deployment."); continue }
      add(`Supabase ${label} CORS`, async (signal) => {
        const origin = baseUrl(appUrl)
        const response = await request(`${baseUrl(supabaseUrl)}${path}`, signal, { method: "OPTIONS", headers: {
          Origin: origin,
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": requiredHeaders.join(","),
        } })
        const allowedOrigin = response.headers.get("access-control-allow-origin")
        const methods = (response.headers.get("access-control-allow-methods") || "").toUpperCase().split(",").map((s) => s.trim())
        const headers = (response.headers.get("access-control-allow-headers") || "").toLowerCase().split(",").map((s) => s.trim())
        if (allowedOrigin !== "*" && allowedOrigin !== origin) throw new HealthError("CORS does not allow the configured app origin.")
        if (!methods.includes("POST")) throw new HealthError("CORS does not allow POST requests.")
        // Authorization must be explicitly allowed, even with a wildcard header.
        if (!requiredHeaders.every((header) => headers.includes(header) || (header !== "authorization" && headers.includes("*")))) {
          throw new HealthError("CORS does not allow all authentication request headers.")
        }
        return "Authentication preflight accepts the app origin, POST method, and required headers."
      })
    }
  }

  if (appUrl) add("App deployment", async (signal) => {
    const response = await request(baseUrl(appUrl), signal)
    if (!response.headers.get("content-type")?.includes("text/html")) throw new HealthError("App did not return an HTML page.")
    return "App responds with HTML; this does not verify its bundled environment configuration."
  })
  else skip("App deployment", "Set HEALTHCHECK_APP_URL to check the deployed homepage.")

  const connection = env.NEON_POSTGRES_URL || env.NEON_DATABASE_URL || env.DATABASE_URL
  if (connection) add("Neon database", async (signal) => {
    const rows = await query(connection, signal)
    if (rows?.[0]?.healthy !== 1) throw new HealthError("Database returned an unexpected result for SELECT 1.")
    return "Database connection and read-only SELECT 1 succeeded."
  })
  else skip("Neon database", "No Neon connection configured; legacy routes are not checked.")

  if (env.GROQ_API_KEY || env.GROQ_MODEL) add("Groq model API", async (signal) => {
    if (!env.GROQ_API_KEY || !env.GROQ_MODEL) throw new HealthError("Both GROQ_API_KEY and GROQ_MODEL are required.")
    const models = await (await request("https://api.groq.com/openai/v1/models", signal, { headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` } })).json()
    if (!Array.isArray(models.data) || !models.data.some((model) => model.id === env.GROQ_MODEL && model.active !== false)) {
      throw new HealthError("Configured GROQ_MODEL is not available in the model API.")
    }
    return "API key and configured model are available; no inference request was made."
  })
  else skip("Groq model API", "No Groq configuration; AI program generation is not checked.")

  return Promise.all(jobs)
}

export function reportIsHealthy(results, strict = false) {
  return results.length > 0 && !results.some((result) => result.status === "fail" || (strict && result.status === "skip"))
}
