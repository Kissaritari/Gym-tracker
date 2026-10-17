import { z } from "zod"

export const TrainingProgramSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(2000),
  difficulty_level: z.enum(["beginner", "intermediate", "advanced"]),
  duration_weeks: z.number().int().min(1).max(52),
  exercises: z.array(z.object({
    exercise_id: z.string().uuid(),
    day_number: z.number().int().min(1).max(7),
    sets: z.number().int().min(1).max(20),
    reps: z.string().trim().min(1).max(80),
    rest_seconds: z.number().int().min(0).max(600),
  })).min(1).max(84),
})
export type GeneratedTrainingProgram = z.infer<typeof TrainingProgramSchema>
export type TrainingProgramPreview = GeneratedTrainingProgram & { exerciseNames: Record<string, string> }
