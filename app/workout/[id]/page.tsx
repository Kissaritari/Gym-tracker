import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import WorkoutSession from "@/components/workout/workout-session"

interface WorkoutPageProps {
  params: {
    id: string
  }
}

export default async function WorkoutPage({ params }: WorkoutPageProps) {
  const user = await getSession()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch workout plan using Neon SQL
  const workoutPlans = await sql`
    SELECT * FROM workout_plans WHERE id = ${params.id}
  `

  if (!workoutPlans || workoutPlans.length === 0) {
    notFound()
  }

  const workoutPlan = workoutPlans[0]

  // Fetch workout plan exercises with exercise details
  const planExercises = await sql`
    SELECT wpe.*, e.name, e.description, e.muscle_group, e.equipment, e.instructions, e.tips
    FROM workout_plan_exercises wpe
    JOIN exercises e ON wpe.exercise_id = e.id
    WHERE wpe.workout_plan_id = ${params.id}
    ORDER BY wpe.day_number, wpe.order_index
  `

  // Group exercises by day
  const exercisesByDay = planExercises.reduce((acc: any, item: any) => {
    if (!acc[item.day_number]) {
      acc[item.day_number] = []
    }
    acc[item.day_number].push({
      ...item,
      exercise: {
        id: item.exercise_id,
        name: item.name,
        description: item.description,
        muscle_group: item.muscle_group,
        equipment: item.equipment,
        instructions: item.instructions,
        tips: item.tips,
      },
    })
    return acc
  }, {})

  // Sort exercises within each day by order
  Object.keys(exercisesByDay).forEach((day) => {
    exercisesByDay[day].sort((a: any, b: any) => a.order_index - b.order_index)
  })

  return <WorkoutSession workoutPlan={workoutPlan} exercisesByDay={exercisesByDay} userId={user.id} />
}
