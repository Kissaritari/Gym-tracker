import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { generateTrainingProgram } from "./generate-training-program"

const { generate, getUser, catalog } = vi.hoisted(() => ({ generate: vi.fn(), getUser: vi.fn(), catalog: vi.fn() }))
vi.mock("ai", () => ({ generateText: generate }))
vi.mock("@ai-sdk/groq", () => ({ groq: (model: string) => model }))
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser }, from: () => ({ select: () => ({ order: catalog }) }),
}) }))
const exercise = "00000000-0000-0000-0000-000000000021"
const program = { name: "Strength", description: "Add reps weekly", difficulty_level: "beginner", duration_weeks: 4,
  exercises: [{ exercise_id: exercise, day_number: 1, sets: 3, reps: "8-12", rest_seconds: 60 }] }
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("GROQ_API_KEY", "test-key"); vi.stubEnv("GROQ_MODEL", "configured-model")
  getUser.mockResolvedValue({ data: { user: { id: "user" } }, error: null })
  catalog.mockResolvedValue({ data: [{ id: exercise, name: "Squat", equipment: "Barbell" }], error: null })
  generate.mockResolvedValue({ text: JSON.stringify(program) })
})
afterEach(() => vi.unstubAllEnvs())
describe("authenticated program generation", () => {
  it("returns a validated preview using exercise names from the catalog", async () => {
    const result = await generateTrainingProgram("Train three days with a barbell")
    expect(result.program).toEqual({ ...program, exerciseNames: { [exercise]: "Squat" } })
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ model: "configured-model" }))
  })
  it("requires a signed-in user before calling the provider", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null })
    expect((await generateTrainingProgram("Train three days a week")).error).toContain("Sign in")
    expect(generate).not.toHaveBeenCalled()
  })
  it("reports missing configuration without attempting generation", async () => {
    vi.stubEnv("GROQ_MODEL", "")
    expect((await generateTrainingProgram("Train three days a week")).error).toContain("not configured")
    expect(generate).not.toHaveBeenCalled()
  })
  it.each(["not json", JSON.stringify({ ...program, exercises: [] }), JSON.stringify({ ...program, exercises: [{ ...program.exercises[0], sets: 0 }] }), JSON.stringify({ ...program, exercises: [{ ...program.exercises[0], exercise_id: "00000000-0000-0000-0000-000000000099" }] })])("rejects invalid or invented prescriptions", async (text) => {
    generate.mockResolvedValue({ text })
    expect((await generateTrainingProgram("Train three days a week")).program).toBeUndefined()
  })
})
