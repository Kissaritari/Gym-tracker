import { neon } from "@neondatabase/serverless"

// Create a SQL client using the Neon serverless driver
export const sql = neon(
  process.env.NEON_POSTGRES_URL || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "",
)

// Helper function to get the database client
export function getDb() {
  return sql
}
