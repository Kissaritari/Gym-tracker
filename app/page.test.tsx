// @vitest-environment jsdom
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import HomePage from "./page"

const { client, inserts, state } = vi.hoisted(() => ({
  client: { auth: { getUser: vi.fn(), onAuthStateChange: vi.fn() }, from: vi.fn(), rpc: vi.fn() },
  inserts: vi.fn(),
  state: { history: [] as any[], plans: [] as any[], failLoad: false, failCreate: false, failLinks: false, denyDelete: false },
}))
vi.mock("@/lib/supabase/client", () => ({ createClient: () => client }))
vi.mock("@/lib/generate-training-program", () => ({ generateTrainingProgram: vi.fn() }))
vi.mock("@/components/workout/training-session", () => ({ TrainingSession: ({ program, initialDay, initialSessionId }: any) => <div data-testid="workout" data-day={initialDay} data-session-id={initialSessionId}>{program.id}: {program.name}</div> }))
const programs = ["First", "Second", "Third"].map((name, i) => ({ id: `real-database-id-${i}`, name, description: "Workout", difficulty_level: "beginner", duration_weeks: 4 }))
let container: HTMLDivElement
let root: Root

beforeEach(async () => {
  vi.clearAllMocks(); (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  client.auth.getUser.mockResolvedValue({ data: { user: { id: "user", email: "user@example.com" } } })
  client.auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
  state.history = [{ id: "saved-session", workout_plan_id: programs[2].id, started_at: "2026-10-04T08:00:00Z", completed_at: "2026-10-04T09:00:00Z", notes: "Day 1: Completed 4/4 exercises" }]
  state.plans = [...programs]; state.failLoad = false; state.failCreate = false; state.failLinks = false; state.denyDelete = false
  client.rpc.mockImplementation((_name: string, args: any) => ({ single: async () => {
    if (state.failCreate || state.failLinks) return { data: null, error: { message: "Failed" } }
    const plan = { id: "generated-plan-id", name: args.p_name, description: args.p_description, difficulty_level: "beginner", duration_weeks: 4, created_by: "user" }
    state.plans.push(plan)
    return { data: plan, error: null }
  } }))
  client.from.mockImplementation((table: string) => {
    let operation = "read"
    let payload: any
    let single = false
    const query: any = {}
    const filters: Array<[string, unknown]> = []
    for (const method of ["select", "or", "order"]) query[method] = () => query
    query.eq = (field: string, value: unknown) => { filters.push([field, value]); return query }
    query.insert = (data: any) => { operation = "insert"; payload = data; inserts(table, data); return query }
    query.delete = () => { operation = "delete"; return query }
    query.single = () => { single = true; return query }
    query.then = (resolve: any, reject: any) => {
      let data: any = table === "workout_plans" ? state.plans : table === "workout_sessions" ? state.history : [{ id: "squat", name: "Squat" }, { id: "lunge", name: "Lunge" }]
      let error: any = state.failLoad ? { message: "Failed" } : null
      if (operation === "insert" && table === "workout_plans") {
        data = [{ ...payload, id: "generated-plan-id" }]
        error = state.failCreate ? { message: "Failed" } : null
        if (!error) state.plans.push(data[0])
      } else if (operation === "insert") {
        data = []; error = state.failLinks ? { message: "Failed" } : null
      } else if (operation === "delete") {
        if (!state.denyDelete) state.plans = state.plans.filter((item) => !filters.every(([field, value]) => item[field] === value))
        data = []; error = null
      }
      return Promise.resolve({ error, data: single ? data[0] : data }).then(resolve, reject)
    }
    return query
  })
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container)
  await act(async () => { root.render(<HomePage />) })
})
afterEach(async () => { await act(async () => root.unmount()); container.remove() })
async function tab(name: string) {
  await act(async () => { [...container.querySelectorAll("button")].find((button) => button.textContent === name)!.click() })
}

async function click(text: string) {
  await act(async () => { [...container.querySelectorAll("button")].find((button) => button.textContent?.includes(text))!.click() })
}
async function input(selector: string, value: string) {
  await act(async () => {
    const node = container.querySelector<HTMLInputElement>(selector)!
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(node, value)
    node.dispatchEvent(new Event("input", { bubbles: true }))
  })
}
async function openProgramForm() { await tab("programs"); await click("Custom program"); await input('[placeholder="My strength block"]', "My plan") }
async function submitProgram() { await act(async () => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })) }) }
async function reload() { await act(async () => { root.unmount(); root = createRoot(container); root.render(<HomePage />) }) }

describe("homepage training flow", () => {
  it("starts the third program using its real database identity", async () => {
    await tab("programs")
    expect(container.querySelectorAll("article")).toHaveLength(3)
    const third = container.querySelectorAll("article")[2]
    await act(async () => { third.querySelector("button")!.click() })
    expect(container.querySelector('[data-testid="workout"]')?.textContent).toBe("real-database-id-2: Third")
  })

  it("keeps an active workout mounted when switching tabs", async () => {
    await tab("programs"); await click("Start")
    const workout = container.querySelector('[data-testid="workout"]')
    await tab("overview")
    expect(container.querySelector('[data-testid="workout"]')).toBe(workout)
    expect(workout?.parentElement?.hidden).toBe(true)
    await tab("sessions")
    expect(container.querySelector('[data-testid="workout"]')).toBe(workout)
    expect(workout?.parentElement?.hidden).toBe(false)
  })

  it("shows stored sessions instead of the fixed lower-body sample workout", async () => {
    await tab("sessions")
    expect(container.textContent).toContain("Third")
    expect(container.textContent).toContain("Day 1: Completed 4/4 exercises")
    expect(container.textContent).toContain("Completed")
    expect(container.textContent).not.toContain("Strength Foundation")
    expect(container.textContent).not.toContain("Back squat")
  })
  it("passes the selected session's workout day when resuming", async () => {
    state.history = [{ id: "day-six-session", workout_plan_id: programs[2].id, started_at: "2026-10-04T08:00:00Z", completed_at: null, notes: "Day 6" }]
    await reload(); await tab("sessions"); await click("Resume workout")
    expect(container.querySelector('[data-testid="workout"]')?.getAttribute("data-day")).toBe("6")
  })

  it("passes the exact session identity rather than resuming the newest matching workout", async () => {
    state.history = [
      { id: "newer-session", workout_plan_id: programs[2].id, started_at: "2026-10-04T10:00:00Z", completed_at: null, notes: "Day 1" },
      { id: "chosen-older-session", workout_plan_id: programs[2].id, started_at: "2026-10-04T08:00:00Z", completed_at: null, notes: "Day 1" },
    ]
    await reload(); await tab("sessions")
    await act(async () => { container.querySelectorAll("article")[1].querySelector("button")!.click() })
    expect(container.querySelector('[data-testid="workout"]')?.getAttribute("data-session-id")).toBe("chosen-older-session")
  })

  it("requires exercises before creating a program", async () => {
    await openProgramForm(); await submitProgram()
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Select at least one exercise")
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it("links selected exercises to the database-generated program ID", async () => {
    await openProgramForm()
    await act(async () => { container.querySelectorAll<HTMLInputElement>('[type="checkbox"]')[1].click() })
    await submitProgram()
    expect(client.rpc).toHaveBeenCalledWith("create_training_program", { p_name: "My plan", p_description: "Your custom training plan.", p_exercise_ids: ["lunge"] })
    expect([...container.querySelectorAll("article")].some((item) => item.textContent?.includes("My plan"))).toBe(true)
  })

  it("retains the form and chosen exercises after a failed program insert", async () => {
    await openProgramForm()
    await act(async () => { container.querySelector<HTMLInputElement>('[type="checkbox"]')!.click() })
    state.failCreate = true; await submitProgram()
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Could not save")
    expect(container.querySelector<HTMLInputElement>('[placeholder="My strength block"]')!.value).toBe("My plan")
    expect(container.querySelector<HTMLInputElement>('[type="checkbox"]')!.checked).toBe(true)
    expect(state.plans.some((item) => item.id === "generated-plan-id")).toBe(false)
  })

  it("does not leave an empty program when exercise linking fails under the shipped policies", async () => {
    await openProgramForm()
    await act(async () => { container.querySelector<HTMLInputElement>('[type="checkbox"]')!.click() })
    state.failLinks = true; state.denyDelete = true; await submitProgram()
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Could not save")
    expect(state.plans.some((item) => item.id === "generated-plan-id")).toBe(false)
  })

  it("recovers from training-data errors through Retry", async () => {
    state.failLoad = true; await reload()
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Could not load")
    state.failLoad = false; await click("Retry"); await tab("programs")
    expect(container.querySelector('[role="alert"]')).toBeNull()
    expect(container.querySelectorAll("article")).toHaveLength(3)
  })

})
