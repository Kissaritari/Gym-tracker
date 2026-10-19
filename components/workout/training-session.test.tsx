// @vitest-environment jsdom
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TrainingSession } from "./training-session"

const { from, inserts, updates, state } = vi.hoisted(() => ({
  from: vi.fn(), inserts: vi.fn(), updates: vi.fn(),
  state: {
    failStart: false, failSave: false, failFinish: false, failLoad: false, failProgress: false,
    empty: false, resume: false, logs: [] as any[], sessions: [] as any[], rows: [] as any[],
  },
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
  sessionStorage.clear()
  vi.clearAllMocks(); state.failStart = false; state.failSave = false; state.empty = false; state.resume = false; state.logs = []; state.sessions = []; state.rows = rows.map((item) => ({ ...item })); state.failFinish = false; state.failLoad = false; state.failProgress = false
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  from.mockImplementation((table: string) => {
    let operation = "read"
    let selection = "*"
    let payload: any
    const filters: Array<[string, unknown]> = []
    let single = false
    let limit = Infinity
    const query: any = {}
    query.select = (columns: string) => { selection = columns; return query }
    query.eq = (field: string, value: unknown) => { filters.push([field, value]); return query }
    query.is = query.eq
    query.order = () => query
    query.limit = (count: number) => { limit = count; return query }
    query.single = () => { single = true; return query }
    query.insert = (data: any) => { operation = "insert"; payload = data; inserts(table, data); return query }
    query.update = (data: any) => { operation = "update"; payload = data; updates(table, data); return query }
    query.then = (resolve: any, reject: any) => {
      const matches = (item: any) => filters.every(([field, value]) => item[field] === value)
      let result: any
      if (table === "workout_plan_exercises") result = { data: state.empty ? [] : state.rows, error: state.failLoad ? { message: "Failed" } : null }
      else if (operation === "insert" && table === "workout_sessions") {
        const current = { ...payload, id: "session", started_at: "2026-10-04T08:00:00Z", completed_at: null }
        if (!state.failStart) state.sessions.push(current)
        result = { data: current, error: state.failStart ? { message: "Failed" } : null }
      } else if (operation === "insert" && table === "exercise_logs") {
        if (!state.failSave) state.logs.push(payload)
        result = { data: null, error: state.failSave ? { message: "Failed" } : null }
      } else if (operation === "update") {
        const current = state.sessions.find(matches)
        if (current && !state.failFinish) Object.assign(current, payload)
        result = { data: current || null, error: state.failFinish || !current ? { message: "Failed" } : null }
      } else if (table === "exercise_logs") {
        const data = state.logs.map((log) => ({ session_id: "session", ...log })).filter(matches)
        result = { data, error: state.failProgress ? { message: "Failed" } : selection.includes("workout_plan_exercise_id") ? { code: "42703", message: "column does not exist" } : null }
      } else {
        const sessions = state.resume ? [{ id: "session", user_id: "user", workout_plan_id: program.id, completed_at: null, notes: "Day 1", started_at: "2026-10-04T08:00:00Z" }, ...state.sessions] : state.sessions
        const data = sessions.filter(matches).slice(0, limit)
        result = { data: single ? data[0] : data, error: null }
      }
      return Promise.resolve(result).then(resolve, reject)
    }
    return query
  })
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container)
})
afterEach(async () => { await act(async () => root.unmount()); container.remove() })
async function render(initialDay?: number, initialSessionId?: string) { await act(async () => { root.render(<TrainingSession program={program} initialDay={initialDay} initialSessionId={initialSessionId} userId="user" onFinish={finish} onBack={vi.fn()} />) }) }

describe("workout interaction", () => {
  it("restores unsaved reps after leaving and reopening a session", async () => {
    await render(); await click("Start day 1 workout"); await click("Lunge"); await reps("Lunge", "9")
    await act(async () => { root.unmount(); root = createRoot(container) })
    await render(1, "session"); await click("Start day 1 workout"); await click("Lunge")
    expect(container.querySelector<HTMLInputElement>('[aria-label="Lunge set 1 reps"]')?.value).toBe("9")
    await click("Complete exercise"); await click("Finish workout")
    expect(sessionStorage.getItem("workout-drafts:user:session")).toBeNull()
  })

  it("locks a resumed session's day and trusts its stored day over the supplied day", async () => {
    state.rows.push({ ...rows[0], id: "day-two", day_number: 2, exercise: { name: "Day two squat" } })
    state.sessions = [{ id: "selected", user_id: "user", workout_plan_id: program.id, completed_at: null, notes: "Day 2" }]
    await render(1, "selected")
    expect(button("Day 1").disabled).toBe(true)
    expect(button("Day 2").disabled).toBe(true)
    await click("Start day 1 workout")
    expect(button("Day two squat").disabled).toBe(false)
    await click("Finish workout")
    expect(updates).toHaveBeenCalledWith("workout_sessions", expect.objectContaining({ notes: "Day 2: Completed 0/1 exercises" }))
  })

  it("keeps saved logs authoritative over stale browser drafts", async () => {
    state.resume = true
    sessionStorage.setItem("workout-drafts:user:session", JSON.stringify({ "plan-2": [{ reps: 99, weight: 99 }] }))
    state.logs = [{ exercise_id: rows[2].exercise_id, workout_plan_exercise_id: rows[2].id, reps_completed: [8], weight_used: [20] }]
    await render(); await click("Start day 1 workout"); await click("Lunge")
    expect(container.querySelector<HTMLInputElement>('[aria-label="Lunge set 1 reps"]')?.value).toBe("8")
    expect(container.querySelector<HTMLInputElement>('[aria-label="Lunge set 1 weight"]')?.value).toBe("20")
  })

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
    expect(inserts).toHaveBeenCalledWith("exercise_logs", expect.objectContaining({ exercise_id: "exercise-2", workout_plan_exercise_id: "plan-2", reps_completed: [8], sets_completed: 1 }))
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

  it("loads a requested sixth day and locks day selection during the session", async () => {
    state.rows.push({ ...rows[0], id: "day-six", day_number: 6, exercise: { name: "Day six squat" } })
    await render(6)
    expect(button("Day six squat").disabled).toBe(true)
    await click("Start day 6 workout")
    expect(inserts).toHaveBeenCalledWith("workout_sessions", expect.objectContaining({ notes: "Day 6" }))
    expect(button("Day 1").disabled).toBe(true)
    expect(button("Day 6").disabled).toBe(true)
    expect(button("Day six squat").disabled).toBe(false)
  })

  it("does not create another workout when loading progress fails after starting", async () => {
    state.failProgress = true
    await render(); await click("Start day 1 workout")
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Could not start")
    expect(button("Lunge").disabled).toBe(true)
    state.failProgress = false; await click("Start day 1 workout")
    expect(inserts.mock.calls.filter(([table]) => table === "workout_sessions")).toHaveLength(1)
    expect(button("Lunge").disabled).toBe(false)
  })

  it("keeps the session active after a failed finish and allows retrying", async () => {
    await render(); await click("Start day 1 workout")
    state.failFinish = true; await click("Finish workout")
    expect(finish).not.toHaveBeenCalled()
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Could not finish")
    expect(button("Finish workout").disabled).toBe(false)
    state.failFinish = false; await click("Finish workout")
    expect(finish).toHaveBeenCalledOnce()
  })

  it("blocks finishing while an unselected exercise has unsaved reps", async () => {
    await render(); await click("Start day 1 workout"); await click("Lunge"); await reps("Lunge", "8"); await click("Squat")
    await click("Finish workout")
    expect(updates).not.toHaveBeenCalled()
    expect(finish).not.toHaveBeenCalled()
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("entered sets")
  })

  it("reports loading failures without enabling workout start", async () => {
    state.failLoad = true; await render()
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Could not load")
    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
    expect(inserts).not.toHaveBeenCalled()
  })

  it("does not complete a second occurrence when only the first was logged", async () => {
    state.resume = true
    state.rows[3] = { ...rows[3], exercise_id: rows[2].exercise_id, exercise: { name: "Lunge second occurrence" } }
    state.logs = [{ exercise_id: rows[2].exercise_id, workout_plan_exercise_id: rows[2].id, reps_completed: [8], weight_used: [0] }]
    await render(); await click("Start day 1 workout")
    expect(button("Lunge").querySelector("svg.lucide-check")).not.toBeNull()
    expect(button("Lunge second occurrence").querySelector("svg.lucide-check")).toBeNull()
  })

  it("restores the exact selected session and never opens a different active workout", async () => {
    state.sessions = [
      { id: "newest", user_id: "user", workout_plan_id: program.id, completed_at: null, notes: "Day 1" },
      { id: "selected", user_id: "user", workout_plan_id: program.id, completed_at: null, notes: "Day 1" },
    ]
    state.logs = [{ session_id: "selected", exercise_id: rows[2].exercise_id, workout_plan_exercise_id: rows[2].id, reps_completed: [8], weight_used: [0] }]
    await render(1, "selected"); await click("Start day 1 workout")
    expect(inserts).not.toHaveBeenCalled()
    expect(button("Lunge").querySelector("svg.lucide-check")).not.toBeNull()
  })

  it("does not create a substitute workout when the selected session is no longer active", async () => {
    await render(1, "deleted-session"); await click("Start day 1 workout")
    expect(inserts).not.toHaveBeenCalled()
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Could not start")
  })

  it("does not guess which occurrence an ambiguous historical log completed", async () => {
    state.resume = true
    state.rows[3] = { ...rows[3], exercise_id: rows[2].exercise_id, exercise: { name: "Lunge second occurrence" } }
    state.logs = [{ exercise_id: rows[2].exercise_id, reps_completed: [8], weight_used: [0] }]
    await render(); await click("Start day 1 workout")
    expect(button("Lunge").querySelector("svg.lucide-check")).toBeNull()
    expect(button("Lunge second occurrence").querySelector("svg.lucide-check")).toBeNull()
  })

  it("does not offer to start an empty program", async () => {
    state.empty = true; await render()
    expect(container.textContent).toContain("no exercises yet")
    expect([...container.querySelectorAll("button")].some((item) => item.textContent?.includes("Start day"))).toBe(false)
  })
})

 it("starts with legacy logs that have no planned-exercise identity column", async () => {
    state.resume = true
    state.logs = [{ exercise_id: "exercise-0", reps_completed: [8], weight_used: [20] }]
    await render(); await click("Start day 1 workout")
    expect(container.querySelector('[role="alert"]')).toBeNull()
    expect(container.textContent).toContain("1/4 exercises completed")
    expect(button("Finish workout")).toBeDefined()
  })

 it("ignores planned rows whose exercises are unavailable", async () => {
    state.rows = [{ ...rows[0], exercise: null }]
    await render()
    expect(container.textContent).toContain("no exercises yet")
    expect(inserts).not.toHaveBeenCalled()
  })
