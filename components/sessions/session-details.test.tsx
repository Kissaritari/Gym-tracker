// @vitest-environment jsdom
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { SessionDetails } from "./session-details"
const { load, eq } = vi.hoisted(() => ({ load: vi.fn(), eq: vi.fn() }))
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from: () => ({ select: () => ({ eq }) }) }) }))
let container: HTMLDivElement
let root: Root
beforeEach(async () => {
  vi.clearAllMocks(); (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  eq.mockReturnValue({ order: load })
  load.mockResolvedValue({ error: null, data: [{ id: "log", exercise: { name: "Squat" }, reps_completed: [8, 6], weight_used: [40, 45] }] })
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container)
  await act(async () => root.render(<SessionDetails sessionId="chosen-session" />))
})
afterEach(async () => { await act(async () => root.unmount()); container.remove() })
async function click(text: string) { await act(async () => { [...container.querySelectorAll("button")].find((button) => button.textContent?.includes(text))!.click() }) }
it("loads the selected session and displays each saved set", async () => {
  expect(load).not.toHaveBeenCalled()
  await click("View details")
  expect(eq).toHaveBeenCalledWith("session_id", "chosen-session")
  expect(container.querySelector("h4")?.textContent).toBe("Squat")
  expect([...container.querySelectorAll("tbody tr")].map((row) => [...row.querySelectorAll("td")].map((cell) => cell.textContent))).toEqual([["1", "8", "40"], ["2", "6", "45"]])
})
it("shows a retryable error without treating a failure as an empty workout", async () => {
  load.mockResolvedValueOnce({ data: null, error: { message: "offline" } })
  await click("View details")
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("Could not load")
  await click("Retry")
  expect(container.querySelector('[role="alert"]')).toBeNull()
  expect(container.querySelectorAll("tbody tr")).toHaveLength(2)
})
