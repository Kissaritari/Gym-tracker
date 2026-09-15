import { describe, expect, it } from "vitest"
import { completedExerciseKeys, exerciseKey, findExerciseForKey, validSetCount } from "./workout-tracker"

const exercises = {
  "1": [
    { id: "plan-back", exercise: { id: "back", name: "Back squat" } },
    { id: "plan-rdl", exercise: { id: "rdl", name: "Romanian deadlift" } },
    { id: "plan-lunge", exercise: { id: "lunge", name: "Walking lunge" } },
  ],
}

describe("session tracker selection", () => {
  it("creates a unique key for every planned exercise", () => {
    expect(exerciseKey("1", exercises["1"][0])).toBe("1-plan-back")
    expect(exerciseKey("1", exercises["1"][2])).toBe("1-plan-lunge")
    expect(new Set(exercises["1"].map((item) => exerciseKey("1", item))).size).toBe(3)
  })

  it("opens exactly the selected exercise, including the third exercise", () => {
    const selected = findExerciseForKey(exercises["1"], "1", "1-plan-lunge")
    expect(selected?.exercise.name).toBe("Walking lunge")
    expect(findExerciseForKey(exercises["1"], "1", "1-plan-back")?.exercise.name).toBe("Back squat")
  })

  it("maps logged exercise ids back to their plan rows", () => {
    expect([...completedExerciseKeys(["1"], exercises, ["rdl"])]).toEqual(["1-plan-rdl"])
  })

  it("counts only sets with actual reps", () => {
    expect(validSetCount([{ reps: 8 }, { reps: 0 }, { reps: 10 }])).toBe(2)
  })
})
