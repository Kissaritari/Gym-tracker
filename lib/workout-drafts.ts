import { z } from "zod"

const DraftSchema = z.record(z.array(z.object({
  reps: z.number().finite().nonnegative(),
  weight: z.number().finite().nonnegative(),
})).max(100))
export type WorkoutDrafts = z.infer<typeof DraftSchema>
const key = (userId: string, sessionId: string) => `workout-drafts:${userId}:${sessionId}`

export function readWorkoutDrafts(userId: string, sessionId: string): WorkoutDrafts {
  try {
    const parsed = DraftSchema.safeParse(JSON.parse(sessionStorage.getItem(key(userId, sessionId)) || "{}"))
    return parsed.success ? parsed.data : {}
  } catch { return {} }
}

export function writeWorkoutDrafts(userId: string, sessionId: string, drafts: WorkoutDrafts) {
  try {
    if (Object.keys(drafts).length) sessionStorage.setItem(key(userId, sessionId), JSON.stringify(drafts))
    else sessionStorage.removeItem(key(userId, sessionId))
    return true
  } catch { return false }
}
