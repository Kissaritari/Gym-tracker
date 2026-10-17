export type WorkoutExercise = {
  id: string
  exercise: { id: string; name: string }
}

export function exerciseKey(day: string, planExercise: WorkoutExercise) {
  return `${day}-${planExercise.id}`
}

export function findExerciseForKey(
  exercises: WorkoutExercise[],
  day: string,
  key: string | null,
) {
  return exercises.find((item) => exerciseKey(day, item) === key) ?? null
}

export type ExerciseLogIdentity = { exercise_id: string; workout_plan_exercise_id?: string | null }

export function completedExerciseKeys(
  days: string[],
  exercisesByDay: Record<string, WorkoutExercise[]>,
  logs: Array<ExerciseLogIdentity | string>,
) {
  const keys = new Set<string>()
  const planned = days.flatMap((day) => (exercisesByDay[day] || []).map((item) => ({ day, item })))
  for (const entry of logs) {
    const log = typeof entry === "string" ? { exercise_id: entry } : entry
    const candidates = planned.filter(({ item }) => item.exercise.id === log.exercise_id)
    const matched = log.workout_plan_exercise_id
      ? candidates.find(({ item }) => item.id === log.workout_plan_exercise_id)
      : candidates.length === 1 ? candidates[0] : undefined
    // Older logs cannot safely identify one of several occurrences.
    if (matched) keys.add(exerciseKey(matched.day, matched.item))
  }
  return keys
}

export function validSetCount(sets: Array<{ reps: number }>) {
  return sets.filter((set) => Number.isFinite(set.reps) && set.reps > 0).length
}
