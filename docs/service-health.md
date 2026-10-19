# Service health checks

Run `npm run test:services` to check live dependencies. Run `npm test` for deterministic tests that mock external services and work offline. The live command exits with code 1 if any configured check fails, making it suitable for a deployment pipeline or external monitor.

The live command loads `.env.local` and other development environment files through Next.js. Environment variables already supplied by your shell or CI take precedence. It never prints keys, connection strings, raw provider error bodies, or user data.

## Configuration

Set these values in `.env.local` or your CI environment:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_KEY
HEALTHCHECK_APP_URL=https://v0-gym-app-requirements-coral.vercel.app
HEALTHCHECK_TIMEOUT_MS=10000
```

The existing `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported. Use the URL and key for the **same project as the deployment**; this command checks the supplied environment, not the values compiled into Vercel's JavaScript.

Optional services use the same variables as the app:

- Neon: `NEON_POSTGRES_URL`, `NEON_DATABASE_URL`, or `DATABASE_URL`, in that order.
- Groq: `GROQ_API_KEY` and `GROQ_MODEL`.

Supabase configuration is required. Unconfigured optional services and missing `HEALTHCHECK_APP_URL` produce explicit `SKIP` results. A partially configured Groq service fails.

```sh
npm run test:services
npm run test:services -- --strict
npm run test:services -- --json
```

`--strict` also fails on skipped checks: use it when all dependencies must be configured. For machine-readable stdout without npm's script banner, run `node scripts/check-services.mjs --json`. Timeout applies to each check, including reading the response body, and defaults to 10 seconds (maximum 60 seconds). Independent checks run concurrently. There are no automatic retries to hide intermittent failures.

## What gets checked

| Check | What passing proves |
| --- | --- |
| Supabase authentication | The settings API responds and email login and signup are enabled. This public endpoint alone does not validate the key. |
| Supabase REST API | PostgREST returns an OpenAPI schema. |
| Supabase login/signup CORS | Both preflights allow the app origin, POST, and all authentication headers. |
| App deployment | The configured app origin returns successful HTML without redirecting. |
| Neon database | The configured connection executes `SELECT 1 AS healthy`. |
| Groq model API | The API key can list models and the configured model is available. |

These are read-only availability checks. They do not create accounts, send confirmation emails, sign in as a user, read workouts, change database rows, or generate AI responses. A passing result does **not** prove SMTP delivery, real password authentication, per-user RLS permissions, required schema migrations, or successful inference. Existing application tests continue to cover mocked workflows and embedded database integrity.

## Diagnosing failures

- **DNS lookup failed:** confirm the project URL and inspect the Supabase dashboard for a paused/deleted/restoring project. Negative DNS caches can persist briefly after restoration.
- **HTTP 401/403:** check that the key belongs to the configured project and has the expected permissions.
- **CORS failure:** check the actual authentication endpoint and allowed origin/headers. A DNS failure is reported separately; changing CORS settings will not repair it.
- **Timed out / HTTP 5xx:** inspect the provider's status and project health, then rerun.
- **Network access blocked:** run from an environment that permits outbound connections. This is a runner restriction, not proof of a provider outage.

Run this manually after restoration or a deployment, or invoke it from your existing CI/monitor. No recurring schedule or notification delivery is installed by this change.

API references: [Supabase public auth settings](https://github.com/supabase/auth/blob/master/internal/api/settings.go), [Groq model API](https://console.groq.com/docs/api-reference).
