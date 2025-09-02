import { generateText } from "ai"
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
  const prompt = `Create a comprehensive workout program based on these preferences and return it as valid JSON:

Goal: ${preferences.goal}
Experience Level: ${preferences.experience}
Days per week: ${preferences.daysPerWeek}
Session duration: ${preferences.sessionDuration} minutes
Available equipment: ${preferences.equipment.join(", ")}
Focus areas: ${preferences.focusAreas.join(", ") || "General fitness"}
Physical limitations: ${preferences.limitations || "None specified"}
Additional notes: ${preferences.additionalNotes || "None"}

Return ONLY a valid JSON object with this exact structure:
{
  "name": "Program Name",
  "description": "Brief program description",
  "level": "Beginner|Intermediate|Advanced",
  "duration_weeks": 8,
  "days_per_week": 3,
  "days": [
    {
      "day_number": 1,
      "name": "Day Name (e.g., Upper Body, Push Day)",
      "exercises": [
        {
          "exercise_name": "Exercise Name",
          "sets": 3,
          "reps": "8-12",
          "rest_seconds": 60,
          "notes": "Form tips or modifications"
        }
      ]
    }
  ]
}

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
Include compound movements and proper warm-up considerations.

IMPORTANT: Return ONLY the JSON object, no additional text or formatting.`

  const { text } = await generateText({
    model: groq("llama3-8b-8192"),
    prompt,
  })

  try {
    // Parse the JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("No JSON found in response")
    }

    const parsedObject = JSON.parse(jsonMatch[0])

    // Validate the parsed object against our schema
    const validatedObject = GeneratedProgramSchema.parse(parsedObject)

    return validatedObject
  } catch (error) {
    console.error("Failed to parse generated program:", error)
    throw new Error("Failed to generate a valid workout program. Please try again.")
  }
}
