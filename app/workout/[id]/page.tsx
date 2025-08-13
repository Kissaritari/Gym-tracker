import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import WorkoutSession from "@/components/workout/workout-session"

interface WorkoutPageProps {
  params: {
    id: string
  }
}

export default async function WorkoutPage({ params }: WorkoutPageProps) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch workout plan with exercises
  const { data: workoutPlan } = await supabase
    .from("workout_plans")
    .select(`
      *,
      workout_plan_exercises (
        *,
        exercises (*)
      )
    `)
    .eq("id", params.id)
    .single()

  if (!workoutPlan) {
    notFound()
  }

  // Group exercises by day
  const exercisesByDay = workoutPlan.workout_plan_exercises.reduce((acc: any, item: any) => {
    if (!acc[item.day_number]) {
      acc[item.day_number] = []
    }
    acc[item.day_number].push({
      ...item,
      exercise: item.exercises,
    })
    return acc
  }, {})

  // Sort exercises within each day by order
  Object.keys(exercisesByDay).forEach((day) => {
    exercisesByDay[day].sort((a: any, b: any) => a.order_in_day - b.order_in_day)
  })

  return <WorkoutSession workoutPlan={workoutPlan} exercisesByDay={exercisesByDay} userId={user.id} />
}
