import { createRequire } from "node:module"
import { checkServices, reportIsHealthy } from "./service-health.mjs"

const args = process.argv.slice(2)
if (args.some((arg) => !["--json", "--strict"].includes(arg))) {
  console.error("Usage: npm run test:services -- [--json] [--strict]")
  process.exitCode = 1
} else {
  // Resolve Next's own env loader without adding a new dependency. Existing
  // process variables win; load .env.local/.env with development semantics.
  const require = createRequire(import.meta.url)
  const { loadEnvConfig } = require(require.resolve("@next/env", { paths: [require.resolve("next")] }))
  loadEnvConfig(process.cwd(), true, { info() {}, error() { console.error("Could not load environment files.") } })
  const results = await checkServices()
  const healthy = reportIsHealthy(results, args.includes("--strict"))
  if (args.includes("--json")) console.log(JSON.stringify({ healthy, checkedAt: new Date().toISOString(), results }, null, 2))
  else {
    for (const result of results) console.log(`${result.status.toUpperCase().padEnd(4)} ${result.name} (${result.durationMs}ms): ${result.detail}`)
    console.log(healthy ? "Configured checks passed. Review any SKIP results for unchecked services." : "Service checks failed. Resolve FAIL results (and SKIP results in strict mode).")
  }
  process.exitCode = healthy ? 0 : 1
}
