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

export function completedExerciseKeys(
  days: string[],
  exercisesByDay: Record<string, WorkoutExercise[]>,
  loggedExerciseIds: string[],
) {
  const keys = new Set<string>()
  for (const exerciseId of loggedExerciseIds) {
    for (const day of days) {
      const planExercise = (exercisesByDay[day] ?? []).find((item) => item.exercise.id === exerciseId)
      if (planExercise) keys.add(exerciseKey(day, planExercise))
    }
  }
  return keys
}

export function validSetCount(sets: Array<{ reps: number }>) {
  return sets.filter((set) => Number.isFinite(set.reps) && set.reps > 0).length
}
