// @vitest-environment jsdom
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import HomePage from "./page"

const { client } = vi.hoisted(() => ({ client: { auth: { getUser: vi.fn(), onAuthStateChange: vi.fn() }, from: vi.fn() } }))
vi.mock("@/lib/supabase/client", () => ({ createClient: () => client }))
vi.mock("@/components/workout/training-session", () => ({ TrainingSession: ({ program }: any) => <div data-testid="workout">{program.id}: {program.name}</div> }))
const programs = ["First", "Second", "Third"].map((name, i) => ({ id: `real-database-id-${i}`, name, description: "Workout", difficulty_level: "beginner", duration_weeks: 4 }))
let container: HTMLDivElement
let root: Root

beforeEach(async () => {
  vi.clearAllMocks(); (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  client.auth.getUser.mockResolvedValue({ data: { user: { id: "user", email: "user@example.com" } } })
  client.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
  client.from.mockImplementation((table: string) => {
    const query: any = {}
    for (const method of ["select", "or", "eq", "order"]) query[method] = () => query
    query.then = (resolve: any, reject: any) => Promise.resolve({ error: null, data: table === "workout_plans" ? programs : table === "workout_sessions" ? [{ id: "saved-session", workout_plan_id: programs[2].id, started_at: "2026-10-04T08:00:00Z", completed_at: "2026-10-04T09:00:00Z", notes: "Day 1: Completed 4/4 exercises" }] : [] }).then(resolve, reject)
    return query
  })
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container)
  await act(async () => { root.render(<HomePage />) })
})
afterEach(async () => { await act(async () => root.unmount()); container.remove() })
async function tab(name: string) {
  await act(async () => { [...container.querySelectorAll("button")].find((button) => button.textContent === name)!.click() })
}

describe("homepage training flow", () => {
  it("starts the third program using its real database identity", async () => {
    await tab("programs")
    expect(container.querySelectorAll("article")).toHaveLength(3)
    const third = container.querySelectorAll("article")[2]
    await act(async () => { third.querySelector("button")!.click() })
    expect(container.querySelector('[data-testid="workout"]')?.textContent).toBe("real-database-id-2: Third")
  })

  it("shows stored sessions instead of the fixed lower-body sample workout", async () => {
    await tab("sessions")
    expect(container.textContent).toContain("Third")
    expect(container.textContent).toContain("Day 1: Completed 4/4 exercises")
    expect(container.textContent).toContain("Completed")
    expect(container.textContent).not.toContain("Strength Foundation")
    expect(container.textContent).not.toContain("Back squat")
  })
})
