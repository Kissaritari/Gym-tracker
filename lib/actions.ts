"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { sql } from "@/lib/db"
import { createUser, verifyUser, createSession, destroySession, getSession } from "@/lib/auth"

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const fullName = formData.get("fullName") as string | undefined

  try {
    const { user, error } = await createUser(email, password, fullName)

    if (error) {
      return { success: false, error }
    }

    if (user) {
      await createSession(user.id)
    }

    revalidatePath("/", "layout")
    redirect("/dashboard")
  } catch (error: unknown) {
    if (error && typeof error === "object" && "digest" in error) {
      throw error
    }
    console.error("Signup error:", error)
    return { success: false, error: "Failed to create account. Please try again." }
  }
}

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  try {
    const { user, error } = await verifyUser(email, password)

    if (error) {
      return { success: false, error }
    }

    if (user) {
      await createSession(user.id)
    }

    revalidatePath("/", "layout")
    redirect("/dashboard")
  } catch (error: unknown) {
    if (error && typeof error === "object" && "digest" in error) {
      throw error
    }
    console.error("Login error:", error)
    return { success: false, error: "Failed to sign in. Please check your credentials." }
  }
}

export async function signOut() {
  await destroySession()
  redirect("/auth/login")
}

export async function deleteProgram(programId: string) {
  const user = await getSession()
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    // First delete associated workout plan exercises
    await sql`DELETE FROM workout_plan_exercises WHERE workout_plan_id = ${programId}`
    // Then delete the workout plan
    await sql`DELETE FROM workout_plans WHERE id = ${programId} AND created_by = ${user.id}`
    revalidatePath("/programs")
    return { success: true }
  } catch (error) {
    console.error("Error deleting program:", error)
    return { success: false, error: "Failed to delete program" }
  }
}

export async function createProgram(data: {
  name: string
  description: string
  difficultyLevel: string
  durationWeeks: number
  isPublic: boolean
  exercises: Array<{
    exerciseId: string
    dayNumber: number
    sets: number
    reps: string
    restSeconds: number
    orderInDay: number
  }>
}) {
  const user = await getSession()
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const result = await sql`
      INSERT INTO workout_plans (name, description, difficulty_level, duration_weeks, is_public, created_by)
      VALUES (${data.name}, ${data.description}, ${data.difficultyLevel}, ${data.durationWeeks}, ${data.isPublic}, ${user.id})
      RETURNING id
    `

    const planId = result[0].id

    if (data.exercises.length > 0) {
      for (const ex of data.exercises) {
        await sql`
          INSERT INTO workout_plan_exercises (workout_plan_id, exercise_id, day_number, sets, reps, rest_seconds, order_in_day)
          VALUES (${planId}, ${ex.exerciseId}, ${ex.dayNumber}, ${ex.sets}, ${ex.reps}, ${ex.restSeconds}, ${ex.orderInDay})
        `
      }
    }

    revalidatePath("/programs")
    return { success: true, planId }
  } catch (error) {
    console.error("Error creating program:", error)
    return { success: false, error: "Failed to create program" }
  }
}

export async function updateProgram(
  planId: string,
  data: {
    name: string
    description: string
    difficultyLevel: string
    durationWeeks: number
    isPublic: boolean
    exercises: Array<{
      exerciseId: string
      dayNumber: number
      sets: number
      reps: string
      restSeconds: number
      orderInDay: number
    }>
  },
) {
  const user = await getSession()
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    await sql`
      UPDATE workout_plans 
      SET name = ${data.name}, description = ${data.description}, difficulty_level = ${data.difficultyLevel}, 
          duration_weeks = ${data.durationWeeks}, is_public = ${data.isPublic}
      WHERE id = ${planId} AND created_by = ${user.id}
    `

    // Delete existing exercises
    await sql`DELETE FROM workout_plan_exercises WHERE workout_plan_id = ${planId}`

    // Insert new exercises
    if (data.exercises.length > 0) {
      for (const ex of data.exercises) {
        await sql`
          INSERT INTO workout_plan_exercises (workout_plan_id, exercise_id, day_number, sets, reps, rest_seconds, order_in_day)
          VALUES (${planId}, ${ex.exerciseId}, ${ex.dayNumber}, ${ex.sets}, ${ex.reps}, ${ex.restSeconds}, ${ex.orderInDay})
        `
      }
    }

    revalidatePath("/programs")
    return { success: true }
  } catch (error) {
    console.error("Error updating program:", error)
    return { success: false, error: "Failed to update program" }
  }
}

export async function startWorkoutSession(workoutPlanId: string) {
  const user = await getSession()
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const result = await sql`
      INSERT INTO workout_sessions (user_id, workout_plan_id, started_at)
      VALUES (${user.id}, ${workoutPlanId}, NOW())
      RETURNING id
    `
    return { success: true, sessionId: result[0].id }
  } catch (error) {
    console.error("Error starting session:", error)
    return { success: false, error: "Failed to start session" }
  }
}

export async function endWorkoutSession(sessionId: string, notes?: string) {
  const user = await getSession()
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    await sql`
      UPDATE workout_sessions 
      SET completed_at = NOW(), notes = ${notes || null}
      WHERE id = ${sessionId} AND user_id = ${user.id}
    `
    revalidatePath("/sessions")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error) {
    console.error("Error ending session:", error)
    return { success: false, error: "Failed to end session" }
  }
}

export async function logExercise(data: {
  sessionId: string
  exerciseId: string
  setsCompleted: number
  repsCompleted: number[]
  weightUsed: number[]
  notes?: string
}) {
  const user = await getSession()
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    await sql`
      INSERT INTO exercise_logs (session_id, exercise_id, sets_completed, reps_completed, weight_used, notes)
      VALUES (${data.sessionId}, ${data.exerciseId}, ${data.setsCompleted}, ${data.repsCompleted}, ${data.weightUsed}, ${data.notes || null})
    `
    return { success: true }
  } catch (error) {
    console.error("Error logging exercise:", error)
    return { success: false, error: "Failed to log exercise" }
  }
}

export async function fetchSessions() {
  const user = await getSession()
  if (!user) {
    return { success: false, error: "Not authenticated", activeSessions: [], recentSessions: [] }
  }

  try {
    // Fetch active sessions
    const activeSessions = await sql`
      SELECT ws.*, wp.name as plan_name, wp.difficulty_level
      FROM workout_sessions ws
      LEFT JOIN workout_plans wp ON ws.workout_plan_id = wp.id
      WHERE ws.user_id = ${user.id} AND ws.completed_at IS NULL
      ORDER BY ws.started_at DESC
    `

    // Fetch recent completed sessions
    const recentSessions = await sql`
      SELECT ws.*, wp.name as plan_name, wp.difficulty_level
      FROM workout_sessions ws
      LEFT JOIN workout_plans wp ON ws.workout_plan_id = wp.id
      WHERE ws.user_id = ${user.id} AND ws.completed_at IS NOT NULL
      ORDER BY ws.completed_at DESC
      LIMIT 10
    `

    return { success: true, activeSessions, recentSessions }
  } catch (error) {
    console.error("Error fetching sessions:", error)
    return { success: false, error: "Failed to fetch sessions", activeSessions: [], recentSessions: [] }
  }
}

export async function fetchSessionStats() {
  const user = await getSession()
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const sessions = await sql`
      SELECT started_at, completed_at FROM workout_sessions WHERE user_id = ${user.id}
    `

    const totalSessions = sessions.length
    const completedSessions = sessions.filter((s: any) => s.completed_at).length

    // Calculate this week's sessions
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const thisWeekSessions = sessions.filter((s: any) => {
      const sessionDate = new Date(s.started_at)
      return sessionDate >= weekStart
    }).length

    return {
      success: true,
      stats: {
        totalSessions,
        completedSessions,
        thisWeekSessions,
        currentStreak: 0, // Simplified for now
        totalWorkoutTime: 0,
        averageSessionTime: 0,
      },
    }
  } catch (error) {
    console.error("Error fetching stats:", error)
    return { success: false, error: "Failed to fetch stats" }
  }
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
  const user = await getSession()

  if (!user) {
    return { success: false, error: "User not authenticated" }
  }

  try {
    const planResult = await sql`
      INSERT INTO workout_plans (name, description, difficulty_level, duration_weeks, created_by, is_public)
      VALUES (${generatedProgram.name}, ${generatedProgram.description}, ${generatedProgram.level.toLowerCase()}, ${generatedProgram.duration_weeks}, ${user.id}, false)
      RETURNING id
    `

    if (planResult.length === 0) {
      throw new Error("Failed to create workout plan")
    }

    const planId = planResult[0].id

    for (const day of generatedProgram.days) {
      for (let i = 0; i < day.exercises.length; i++) {
        const exercise = day.exercises[i]

        const existingExercise = await sql`
          SELECT id FROM exercises WHERE LOWER(name) = LOWER(${exercise.exercise_name}) LIMIT 1
        `

        let exerciseId: string

        if (existingExercise.length > 0) {
          exerciseId = existingExercise[0].id
        } else {
          const newExercise = await sql`
            INSERT INTO exercises (name, description, muscle_groups, equipment, instructions, tips)
            VALUES (${exercise.exercise_name}, ${exercise.notes || exercise.exercise_name + " exercise"}, ARRAY[]::text[], 'Various', ${exercise.notes || ""}, ${exercise.notes || ""})
            RETURNING id
          `
          exerciseId = newExercise[0].id
        }

        await sql`
          INSERT INTO workout_plan_exercises (workout_plan_id, exercise_id, day_number, sets, reps, rest_seconds, order_in_day)
          VALUES (${planId}, ${exerciseId}, ${day.day_number}, ${exercise.sets}, ${exercise.reps}, ${exercise.rest_seconds}, ${i + 1})
        `
      }
    }

    revalidatePath("/programs")
    return { success: true, workoutPlanId: planId }
  } catch (error) {
    console.error("Error importing generated program:", error)
    return { success: false, error: "Failed to import program" }
  }
}
