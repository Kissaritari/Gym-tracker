import { readFileSync } from "node:fs"
import { PGlite } from "@electric-sql/pglite"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
const { sql, cookieStore } = vi.hoisted(() => ({ sql: vi.fn(), cookieStore: { get: vi.fn(), set: vi.fn(), delete: vi.fn() } }))
vi.mock("@/lib/db", () => ({ sql }))
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }))
import { createUser, verifyUser, createSession, getSession, destroySession } from "./auth"
let db: PGlite
beforeAll(async () => {
  db = new PGlite()
  await db.exec(readFileSync("scripts/01-neon-create-tables.sql", "utf8"))
  await db.exec(readFileSync("scripts/05-neon-workout-integrity.sql", "utf8"))
  await db.exec(readFileSync("scripts/05-neon-workout-integrity.sql", "utf8"))
}, 30000)
afterAll(async () => { await db?.close() })
beforeEach(async () => {
  vi.resetAllMocks()
  await db.exec("TRUNCATE users CASCADE")
  sql.mockImplementation(async (strings: TemplateStringsArray, ...values: any[]) => {
    const query = strings.reduce((text, part, index) => text + (index ? `$${index}` : "") + part, "")
    return (await db.query(query, values)).rows
  })
})

describe("Neon authentication schema", () => {
  it("creates an account and verifies its password against the supplied schema", async () => {
    const created = await createUser("user@example.com", "test-password", "Test User")
    expect(created.error).toBeUndefined()
    expect(created.user?.name).toBe("Test User")
    expect((await verifyUser("user@example.com", "test-password")).user?.id).toBe(created.user?.id)
    expect((await verifyUser("user@example.com", "wrong-password")).error).toBe("Invalid email or password")
  })

  it("stores, reads, and destroys an authentication session", async () => {
    const { user } = await createUser("user@example.com", "test-password")
    const token = await createSession(user!.id)
    cookieStore.get.mockReturnValue({ value: token })
    expect(cookieStore.set).toHaveBeenCalledWith("gym_session", token, expect.objectContaining({ httpOnly: true, path: "/" }))
    expect((await getSession())?.id).toBe(user!.id)
    await destroySession()
    expect(cookieStore.delete).toHaveBeenCalledWith("gym_session")
    expect((await db.query("SELECT id FROM sessions")).rows).toEqual([])
  })

  it("rejects and removes expired authentication sessions", async () => {
    const { user } = await createUser("user@example.com", "test-password")
    const token = await createSession(user!.id)
    await db.query("UPDATE sessions SET expires_at = NOW() - INTERVAL '1 day' WHERE token=$1", [token])
    cookieStore.get.mockReturnValue({ value: token })
    expect(await getSession()).toBeNull()
    expect((await db.query("SELECT id FROM sessions")).rows).toEqual([])
  })

  it("preserves names when migrating a database with the older name column", async () => {
    await db.exec("ALTER TABLE users RENAME COLUMN full_name TO name")
    await db.exec("INSERT INTO users(email,password_hash,name) VALUES ('legacy@example.com','hash','Legacy Name')")
    await db.exec(readFileSync("scripts/05-neon-workout-integrity.sql", "utf8"))
    expect((await db.query<{full_name: string}>("SELECT full_name FROM users")).rows[0].full_name).toBe("Legacy Name")
  })
})
