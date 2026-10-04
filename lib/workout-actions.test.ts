import { beforeEach, describe, expect, it, vi } from "vitest"

const { sql, getSession } = vi.hoisted(() => ({ sql: vi.fn(), getSession: vi.fn() }))
vi.mock("@/lib/db", () => ({ sql }))
vi.mock("@/lib/auth", () => ({ getSession, createUser: vi.fn(), verifyUser: vi.fn(), createSession: vi.fn(), destroySession: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
import { startWorkoutSession } from "./actions"

describe("starting workouts", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getSession.mockResolvedValue({ id: "user" })
  })

  it.each(["first-plan", "second-plan", "third-plan", "last-plan"])("starts %s without limiting selection to the first two plans", async (planId) => {
    sql.mockResolvedValueOnce([{ id: planId }]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "session" }])
    expect(await startWorkoutSession(planId)).toEqual({ success: true, sessionId: "session", resumed: false })
    expect(sql.mock.calls[2].slice(1)).toEqual(["user", planId])
    expect(sql.mock.calls[0][0].join("")).toContain("created_by")
  })

  it("resumes an existing workout instead of creating another session", async () => {
    sql.mockResolvedValueOnce([{ id: "plan" }]).mockResolvedValueOnce([{ id: "existing-session" }])
    expect(await startWorkoutSession("plan")).toEqual({ success: true, sessionId: "existing-session", resumed: true })
    expect(sql).toHaveBeenCalledTimes(2)
  })

  it("reports empty or inaccessible programs without inserting a session", async () => {
    sql.mockResolvedValueOnce([])
    expect(await startWorkoutSession("empty-plan")).toMatchObject({ success: false, error: expect.stringContaining("no exercises") })
    expect(sql).toHaveBeenCalledTimes(1)
  })

  it("requires an authenticated user", async () => {
    getSession.mockResolvedValue(null)
    expect(await startWorkoutSession("plan")).toEqual({ success: false, error: "Not authenticated" })
    expect(sql).not.toHaveBeenCalled()
  })
})
