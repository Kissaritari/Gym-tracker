import { generateObject } from "ai"
import { groq } from "@ai-sdk/groq"
import { z } from "zod"

const GeneratedProgramSchema = z.object({
  name: z.string(),
  description: z.string(),
  level: z.enum(["Beginner", "Intermediate", "Advanced"]),
  duration_weeks: z.number(),
  days_per_week: z.number(),
  days: z.array(
    z.object({
      day_number: z.number(),
      name: z.string(),
      exercises: z.array(
        z.object({
          exercise_name: z.string(),
          sets: z.number(),
          reps: z.string(),
          rest_seconds: z.number(),
          notes: z.string().optional(),
        }),
      ),
    }),
  ),
})

export async function generateWorkoutProgram(preferences: {
  goal: string
  experience: string
  daysPerWeek: string
  sessionDuration: string
  equipment: string[]
  focusAreas: string[]
  limitations: string
  additionalNotes: string
}) {
  const prompt = `Create a comprehensive workout program based on these preferences:

Goal: ${preferences.goal}
Experience Level: ${preferences.experience}
Days per week: ${preferences.daysPerWeek}
Session duration: ${preferences.sessionDuration} minutes
Available equipment: ${preferences.equipment.join(", ")}
Focus areas: ${preferences.focusAreas.join(", ") || "General fitness"}
Physical limitations: ${preferences.limitations || "None specified"}
Additional notes: ${preferences.additionalNotes || "None"}

Create a structured workout program with:
- An appropriate program name and description
- Correct difficulty level based on experience
- Duration in weeks (typically 4-12 weeks)
- Individual workout days with specific exercises
- Proper sets, reps, and rest periods
- Exercise-specific tips and form cues when helpful
- Progressive overload considerations
- Balanced muscle group targeting

Ensure exercises match the available equipment and respect any limitations mentioned.
Make the program challenging but appropriate for the experience level.
Include compound movements and proper warm-up considerations.`

  const { object } = await generateObject({
    model: groq("llama-3.1-70b-versatile"),
    schema: GeneratedProgramSchema,
    prompt,
  })

  return object
}
