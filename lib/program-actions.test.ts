import { readFileSync } from "node:fs"
import { PGlite } from "@electric-sql/pglite"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const { sql, getSession } = vi.hoisted(() => ({ sql: vi.fn(), getSession: vi.fn() }))
vi.mock("@/lib/db", () => ({ sql }))
vi.mock("@/lib/auth", () => ({ getSession, createUser: vi.fn(), verifyUser: vi.fn(), createSession: vi.fn(), destroySession: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
import { deleteProgram, updateProgram, logExercise } from "./actions"

const user = "00000000-0000-0000-0000-000000000001"
const other = "00000000-0000-0000-0000-000000000002"
const mine = "00000000-0000-0000-0000-000000000011"
const foreign = "00000000-0000-0000-0000-000000000012"
const original = "00000000-0000-0000-0000-000000000021"
const replacement = "00000000-0000-0000-0000-000000000022"
const data = { name: "Updated", description: "", difficultyLevel: "beginner", durationWeeks: 4, isPublic: false, exercises: [{ exerciseId: replacement, dayNumber: 1, sets: 3, reps: "8", restSeconds: 60, orderInDay: 1 }] }
let db: PGlite

beforeAll(async () => {
  db = new PGlite()
  await db.exec(readFileSync("scripts/01-neon-create-tables.sql", "utf8"))
  await db.exec(readFileSync("scripts/05-neon-workout-integrity.sql", "utf8"))
}, 30000)
afterAll(async () => { await db?.close() })
beforeEach(async () => {
  vi.resetAllMocks()
  getSession.mockResolvedValue({ id: user })
  sql.mockImplementation(async (strings: TemplateStringsArray, ...values: any[]) => {
    const query = strings.reduce((text, part, index) => text + (index ? `$${index}` : "") + part, "")
    return (await db.query(query, values)).rows
  })
  await db.exec("TRUNCATE users, exercises CASCADE")
  await db.query("INSERT INTO users (id,email,password_hash) VALUES ($1,'a@example.com','hash'),($2,'b@example.com','hash')", [user, other])
  await db.query("INSERT INTO workout_plans (id,name,created_by) VALUES ($1,'Mine',$2),($3,'Foreign',$4)", [mine, user, foreign, other])
  await db.query("INSERT INTO exercises (id,name) VALUES ($1,'Original'),($2,'Replacement')", [original, replacement])
  await db.query("INSERT INTO workout_plan_exercises (workout_plan_id,exercise_id,day_number) VALUES ($1,$2,1),($3,$2,1)", [mine, original, foreign])
})
async function exerciseIds(plan: string) {
  return (await db.query<{ exercise_id: string }>("SELECT exercise_id FROM workout_plan_exercises WHERE workout_plan_id = $1", [plan])).rows.map((row) => row.exercise_id)
}

describe("program ownership and atomic replacement", () => {
  it("allows an owner to delete their program and cascade its exercises", async () => {
    expect(await deleteProgram(mine)).toEqual({ success: true })
    expect(await exerciseIds(mine)).toEqual([])
    expect((await db.query("SELECT id FROM workout_plans WHERE id=$1", [mine])).rows).toEqual([])
    expect(await exerciseIds(foreign)).toEqual([original])
  })

  it("allows an owner to replace their own program exercises", async () => {
    expect(await updateProgram(mine, data)).toEqual({ success: true })
    expect(await exerciseIds(mine)).toEqual([replacement])
    expect(await exerciseIds(foreign)).toEqual([original])
  })

  it("rejects deleting another user's program without deleting its exercises", async () => {
    expect((await deleteProgram(foreign)).success).toBe(false)
    expect(await exerciseIds(foreign)).toEqual([original])
  })

  it("rejects updating another user's program without replacing its exercises", async () => {
    expect((await updateProgram(foreign, data)).success).toBe(false)
    expect(await exerciseIds(foreign)).toEqual([original])
  })

  it("rolls back the metadata and exercise deletion when a replacement insert fails", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    expect((await updateProgram(mine, { ...data, exercises: [{ ...data.exercises[0], exerciseId: "00000000-0000-0000-0000-000000000099" }] })).success).toBe(false)
    expect(await exerciseIds(mine)).toEqual([original])
    expect((await db.query<{name: string}>("SELECT name FROM workout_plans WHERE id=$1", [mine])).rows[0].name).toBe("Mine")
    error.mockRestore()
  })

  it("supports removing all exercises from an owned program", async () => {
    expect((await updateProgram(mine, { ...data, exercises: [] })).success).toBe(true)
    expect(await exerciseIds(mine)).toEqual([])
  })

  it("does not access the database for unauthenticated mutations", async () => {
    getSession.mockResolvedValue(null)
    expect((await deleteProgram(mine)).success).toBe(false)
    expect((await updateProgram(mine, data)).success).toBe(false)
    expect(sql).not.toHaveBeenCalled()
  })
  it("logs repeated exercises by planned-row identity instead of blocking the second occurrence", async () => {
    const second = (await db.query<{ id: string }>("INSERT INTO workout_plan_exercises(workout_plan_id,exercise_id,day_number) VALUES ($1,$2,2) RETURNING id", [mine, original])).rows[0].id
    const first = (await db.query<{ id: string }>("SELECT id FROM workout_plan_exercises WHERE workout_plan_id=$1 AND day_number=1", [mine])).rows[0].id
    const session = (await db.query<{ id: string }>("INSERT INTO workout_sessions(user_id,workout_plan_id) VALUES ($1,$2) RETURNING id", [user, mine])).rows[0].id
    const log = { sessionId: session, exerciseId: original, planExerciseId: first, setsCompleted: 1, repsCompleted: [8], weightUsed: [10] }
    expect((await logExercise(log)).success).toBe(true)
    expect((await logExercise({ ...log, planExerciseId: second })).success).toBe(true)
    expect((await logExercise(log)).success).toBe(false)
    expect((await db.query("SELECT id FROM exercise_logs WHERE session_id=$1", [session])).rows).toHaveLength(2)
  })

  it("does not accept a foreign planned exercise or a completed session when logging", async () => {
    const foreignRow = (await db.query<{id: string}>("SELECT id FROM workout_plan_exercises WHERE workout_plan_id=$1", [foreign])).rows[0].id
    const ownRow = (await db.query<{id: string}>("SELECT id FROM workout_plan_exercises WHERE workout_plan_id=$1", [mine])).rows[0].id
    const session = (await db.query<{id: string}>("INSERT INTO workout_sessions(user_id,workout_plan_id) VALUES ($1,$2) RETURNING id", [user, mine])).rows[0].id
    const log = { sessionId: session, exerciseId: original, planExerciseId: foreignRow, setsCompleted: 1, repsCompleted: [8], weightUsed: [10] }
    expect((await logExercise(log)).success).toBe(false)
    await db.query("UPDATE workout_sessions SET completed_at=NOW() WHERE id=$1", [session])
    expect((await logExercise({ ...log, planExerciseId: ownRow })).success).toBe(false)
    expect((await db.query("SELECT id FROM exercise_logs WHERE session_id=$1", [session])).rows).toEqual([])
  })

})
