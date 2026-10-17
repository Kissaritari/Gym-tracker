import { neon } from "@neondatabase/serverless"

// Keep legacy routes build-safe when database variables are unavailable during static collection.
const connectionString = process.env.NEON_POSTGRES_URL || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL
export const sql = connectionString
  ? neon(connectionString)
  : ((..._args: unknown[]) => Promise.resolve([])) as any

// Helper function to get the database client
export function getDb() {
  return sql
}
