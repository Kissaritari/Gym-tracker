// @vitest-environment jsdom
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { AIProgramBuilder } from "./ai-program-builder"
const { generate, rpc, save } = vi.hoisted(() => ({ generate: vi.fn(), rpc: vi.fn(), save: vi.fn() }))
vi.mock("@/lib/generate-training-program", () => ({ generateTrainingProgram: generate }))
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ rpc }) }))
const exerciseId = "00000000-0000-0000-0000-000000000021"
const program = { name: "My split", description: "Build strength", difficulty_level: "beginner", duration_weeks: 4,
  exercises: [{ exercise_id: exerciseId, day_number: 2, sets: 3, reps: "8-12", rest_seconds: 60 }] }
let container: HTMLDivElement
let root: Root
const onSaved = vi.fn()
beforeEach(async () => {
  vi.clearAllMocks(); (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  generate.mockResolvedValue({ program: { ...program, exerciseNames: { [exerciseId]: "Squat" } } })
  rpc.mockReturnValue({ single: save })
  save.mockResolvedValue({ error: null, data: { id: "saved-id", ...program } })
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container)
  await act(async () => root.render(<AIProgramBuilder onSaved={onSaved} />))
})
afterEach(async () => { await act(async () => root.unmount()); container.remove() })
async function preview() {
  await act(async () => {
    const input = container.querySelector("textarea")!
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(input, "Train three days with dumbbells")
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })
  await act(async () => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })) })
}
async function savePreview() { await act(async () => { [...container.querySelectorAll("button")].find((button) => button.textContent === "Save to my programs")!.click() }) }
it("shows a preview before saving and imports the full prescription", async () => {
  await preview()
  expect(generate).toHaveBeenCalledWith("Train three days with dumbbells")
  expect(container.textContent).toContain("Day 2")
  expect(container.textContent).toContain("Squat")
  expect(rpc).not.toHaveBeenCalled()
  await savePreview()
  expect(rpc).toHaveBeenCalledWith("create_training_program_details", { p_program: program })
  expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: "saved-id" }))
})
it("retains the preview and allows retrying a failed save", async () => {
  await preview()
  save.mockResolvedValueOnce({ error: { message: "offline" }, data: null })
  await savePreview()
  expect(onSaved).not.toHaveBeenCalled()
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("Your preview is still here")
  expect(container.textContent).toContain("Squat")
  await savePreview()
  expect(onSaved).toHaveBeenCalledOnce()
})
it("reports generation failures without offering to save an absent preview", async () => {
  generate.mockResolvedValue({ error: "Generation unavailable" })
  await preview()
  expect(container.querySelector('[role="alert"]')?.textContent).toBe("Generation unavailable")
  expect(container.textContent).not.toContain("Save to my programs")
})
