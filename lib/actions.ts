"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

function getBaseUrl() {
  // Development environment variable
  if (process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL) {
    return process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
  }

  // Production - use Vercel URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // Fallback to localhost for development
  return "http://localhost:3000"
}

export async function signUp(formData: FormData) {
  const supabase = createClient()

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      emailRedirectTo: `${getBaseUrl()}/auth/callback`,
    },
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    redirect("/error")
  }

  revalidatePath("/", "layout")
  redirect("/auth/verify")
}

export async function signIn(formData: FormData) {
  const supabase = createClient()

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/", "layout")
  redirect("/dashboard")
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}

export async function importGeneratedProgram(generatedProgram: {
  name: string
  description: string
  level: string
  duration_weeks: number
  days_per_week: number
  days: Array<{
    day_number: number
    name: string
    exercises: Array<{
      exercise_name: string
      sets: number
      reps: string
      rest_seconds: number
      notes?: string
    }>
  }>
}) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "User not authenticated" }
  }

  try {
    // Create the workout plan
    const { data: workoutPlan, error: planError } = await supabase
      .from("workout_plans")
      .insert({
        name: generatedProgram.name,
        description: generatedProgram.description,
        difficulty_level: generatedProgram.level.toLowerCase(),
        duration_weeks: generatedProgram.duration_weeks,
        created_by: user.id,
        is_public: false,
      })
      .select()
      .single()

    if (planError) throw planError

    // Process each day and its exercises
    for (const day of generatedProgram.days) {
      for (let i = 0; i < day.exercises.length; i++) {
        const exercise = day.exercises[i]

        // First, try to find existing exercise or create new one
        const { data: existingExercise } = await supabase
          .from("exercises")
          .select("id")
          .eq("name", exercise.exercise_name)
          .single()

        let exerciseId = existingExercise?.id

        if (!exerciseId) {
          // Create new exercise
          const { data: newExercise, error: exerciseError } = await supabase
            .from("exercises")
            .insert({
              name: exercise.exercise_name,
              description: exercise.notes || `${exercise.exercise_name} exercise`,
              muscle_groups: [], // Could be enhanced with AI to determine muscle groups
              equipment: "Various", // Could be enhanced with AI to determine equipment
              instructions: exercise.notes || "",
              tips: exercise.notes || "",
            })
            .select()
            .single()

          if (exerciseError) throw exerciseError
          exerciseId = newExercise.id
        }

        // Add exercise to workout plan
        const { error: planExerciseError } = await supabase.from("workout_plan_exercises").insert({
          workout_plan_id: workoutPlan.id,
          exercise_id: exerciseId,
          day_number: day.day_number,
          sets: exercise.sets,
          reps: exercise.reps,
          rest_seconds: exercise.rest_seconds,
          order_in_day: i + 1,
        })

        if (planExerciseError) throw planExerciseError
      }
    }

    revalidatePath("/programs")
    return { success: true, workoutPlanId: workoutPlan.id }
  } catch (error) {
    console.error("Error importing generated program:", error)
    return { success: false, error: "Failed to import program" }
  }
}
