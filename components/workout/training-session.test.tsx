// @vitest-environment jsdom
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TrainingSession } from "./training-session"

const { from, inserts, updates, state } = vi.hoisted(() => ({
  from: vi.fn(), inserts: vi.fn(), updates: vi.fn(),
  state: { failStart: false, failSave: false, empty: false, resume: false, logs: [] as any[] },
}))
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from }) }))

let container: HTMLDivElement
let root: Root
const finish = vi.fn()
const program = { id: "third-program", name: "Selected program", description: "", difficulty_level: "beginner", duration_weeks: 4 }
const rows = ["Squat", "Deadlift", "Lunge", "Calf raise"].map((name, index) => ({ id: `plan-${index}`, exercise_id: `exercise-${index}`, day_number: 1, sets: 2, reps: "8-12", rest_seconds: 60, exercise: { name } }))

function button(text: string) {
  const node = [...container.querySelectorAll("button")].find((item) => item.textContent?.includes(text))
  if (!node) throw new Error(`Button not found: ${text}`)
  return node
}
async function click(text: string) { await act(async () => { button(text).click() }) }
async function reps(name: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(`[aria-label="${name} set 1 reps"]`)!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value)
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })
}

beforeEach(async () => {
  vi.clearAllMocks(); state.failStart = false; state.failSave = false; state.empty = false; state.resume = false; state.logs = []
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  from.mockImplementation((table: string) => {
    let operation = "read"
    let payload: any
    const query: any = {}
    for (const method of ["select", "eq", "is", "order", "limit", "single"]) query[method] = () => query
    query.insert = (data: any) => { operation = "insert"; payload = data; inserts(table, data); return query }
    query.update = (data: any) => { operation = "update"; payload = data; updates(table, data); return query }
    query.then = (resolve: any, reject: any) => {
      let result: any
      if (table === "workout_plan_exercises") result = { data: state.empty ? [] : rows, error: null }
      else if (operation === "insert" && table === "workout_sessions") result = { data: { id: "session", started_at: "2026-10-04T08:00:00Z" }, error: state.failStart ? { message: "Failed" } : null }
      else if (operation === "insert" && table === "exercise_logs") {
        if (!state.failSave) state.logs.push(payload)
        result = { data: null, error: state.failSave ? { message: "Failed" } : null }
      } else if (operation === "update") result = { data: { id: "session" }, error: null }
      else result = { data: table === "exercise_logs" ? state.logs : state.resume ? [{ id: "session", started_at: "2026-10-04T08:00:00Z" }] : [], error: null }
      return Promise.resolve(result).then(resolve, reject)
    }
    return query
  })
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container)
})
afterEach(async () => { await act(async () => root.unmount()); container.remove() })
async function render() { await act(async () => { root.render(<TrainingSession program={program} userId="user" onFinish={finish} onBack={vi.fn()} />) }) }

describe("workout interaction", () => {
  it("starts the selected program and lets every exercise open independently", async () => {
    await render()
    expect(button("Lunge").disabled).toBe(true)
    await click("Start day 1 workout")
    expect(inserts).toHaveBeenCalledWith("workout_sessions", { user_id: "user", workout_plan_id: "third-program", notes: "Day 1" })
    for (const name of ["Squat", "Deadlift", "Lunge", "Calf raise"]) {
      await click(name)
      expect(container.querySelector(`[aria-label="${name} set 1 reps"]`)).not.toBeNull()
      expect(container.querySelectorAll('[aria-label$="set 1 reps"]')).toHaveLength(1)
    }
  })

  it("keeps separate drafts and completes only the exercise whose sets were saved", async () => {
    await render(); await click("Start day 1 workout"); await click("Lunge"); await reps("Lunge", "8")
    await click("Calf raise"); await reps("Calf raise", "12"); await click("Lunge")
    expect(container.querySelector<HTMLInputElement>('[aria-label="Lunge set 1 reps"]')!.value).toBe("8")
    await click("Complete exercise")
    expect(inserts).toHaveBeenCalledWith("exercise_logs", expect.objectContaining({ exercise_id: "exercise-2", reps_completed: [8], sets_completed: 1 }))
    expect(button("Lunge").querySelector("svg.lucide-check")).not.toBeNull()
    expect(button("Squat").querySelector("svg.lucide-check")).toBeNull()
    await click("Calf raise")
    expect(container.querySelector<HTMLInputElement>('[aria-label="Calf raise set 1 reps"]')!.value).toBe("12")
    await click("Complete exercise"); await click("Finish workout")
    expect(updates).toHaveBeenCalledWith("workout_sessions", expect.objectContaining({ completed_at: expect.any(String), notes: "Day 1: Completed 2/4 exercises" }))
    expect(finish).toHaveBeenCalledOnce()
  })

  it("shows start failures and allows retrying", async () => {
    state.failStart = true
    await render(); await click("Start day 1 workout")
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Could not start")
    expect(button("Lunge").disabled).toBe(true)
    state.failStart = false; await click("Start day 1 workout")
    expect(button("Lunge").disabled).toBe(false)
  })

  it("preserves entered sets when saving fails and does not mark an exercise completed", async () => {
    await render(); await click("Start day 1 workout"); await click("Calf raise"); await reps("Calf raise", "12")
    state.failSave = true; await click("Complete exercise")
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Could not save")
    expect(button("Calf raise").querySelector("svg.lucide-check")).toBeNull()
    expect(container.querySelector<HTMLInputElement>('[aria-label="Calf raise set 1 reps"]')!.value).toBe("12")
    state.failSave = false; await click("Complete exercise")
    expect(button("Calf raise").querySelector("svg.lucide-check")).not.toBeNull()
  })

  it("resumes saved progress without inserting another workout", async () => {
    state.resume = true
    state.logs = [{ exercise_id: "exercise-2", reps_completed: [10], weight_used: [20] }]
    await render(); await click("Start day 1 workout")
    expect(inserts).not.toHaveBeenCalled()
    expect(button("Lunge").querySelector("svg.lucide-check")).not.toBeNull()
    expect(button("Squat").querySelector("svg.lucide-check")).toBeNull()
    await click("Lunge")
    expect(container.querySelector<HTMLInputElement>('[aria-label="Lunge set 1 reps"]')!.value).toBe("10")
    expect(button("Finish workout").disabled).toBe(false)
  })

  it("does not offer to start an empty program", async () => {
    state.empty = true; await render()
    expect(container.textContent).toContain("no exercises yet")
    expect([...container.querySelectorAll("button")].some((item) => item.textContent?.includes("Start day"))).toBe(false)
  })
})
