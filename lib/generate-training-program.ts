"use server"

import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
import { createClient } from "@/lib/supabase/server"
import { TrainingProgramSchema, type TrainingProgramPreview } from "@/lib/generated-training-program"

export async function generateTrainingProgram(brief: string): Promise<{ program?: TrainingProgramPreview; error?: string }> {
  if (typeof brief !== "string" || brief.trim().length < 10 || brief.length > 4000) {
    return { error: "Describe your goals, schedule, and equipment in 10–4000 characters." }
  }
  try {
    const client = await createClient()
    const { data: { user }, error } = await client.auth.getUser()
    if (error || !user) return { error: "Sign in before generating a program." }
    if (!process.env.GROQ_API_KEY || !process.env.GROQ_MODEL) {
      return { error: "Program generation is not configured yet. The app administrator must set GROQ_API_KEY and GROQ_MODEL." }
    }
    const catalog = await client.from("exercises").select("id, name, equipment, muscle_groups").order("name")
    if (catalog.error || !catalog.data?.length) return { error: "The exercise library is unavailable. Please try again later." }
    const { text } = await generateText({
      model: groq(process.env.GROQ_MODEL),
      maxOutputTokens: 6000,
      abortSignal: AbortSignal.timeout(60000),
      system: `Create a workout program using only exercise IDs in the supplied catalog. Respect the user's schedule, experience, equipment and limitations. Return only JSON with this structure:
{"name":"Program name","description":"Progression and warm-up guidance","difficulty_level":"beginner","duration_weeks":4,"exercises":[{"exercise_id":"catalog UUID","day_number":1,"sets":3,"reps":"8-12","rest_seconds":60}]}
Difficulty must be beginner, intermediate or advanced. Duration must be 1–52 weeks. Use days 1–7, 1–20 sets, 0–600 seconds rest, and at most 84 exercise entries. Order exercises by day and performance order. Do not invent exercises or IDs.`,
      prompt: JSON.stringify({ preferences: brief.trim(), exerciseCatalog: catalog.data }),
    })
    const json = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    const program = TrainingProgramSchema.parse(JSON.parse(json))
    const exerciseNames = Object.fromEntries(catalog.data.map((exercise) => [exercise.id, exercise.name]))
    if (program.exercises.some((exercise) => !exerciseNames[exercise.exercise_id])) throw new Error("Unknown exercise")
    return { program: { ...program, exerciseNames } }
  } catch {
    return { error: "Could not generate a valid program. Please try again." }
  }
}
