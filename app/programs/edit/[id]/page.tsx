import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import { ProgramForm } from "@/components/programs/program-form"

export default async function EditProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession()
  if (!user) redirect("/auth/login")
  const { id } = await params
  const programs = await sql`SELECT * FROM workout_plans WHERE id = ${id} AND created_by = ${user.id}`
  if (programs.length === 0) notFound()
  const exercises = await sql`SELECT * FROM exercises ORDER BY name`
  const planExercises = await sql`SELECT * FROM workout_plan_exercises WHERE workout_plan_id = ${id} ORDER BY day_number, order_in_day`
  return <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800"><div className="container mx-auto px-4 py-8"><h1 className="text-3xl font-bold text-white mb-8">Edit program</h1><ProgramForm exercises={exercises || []} userId={user.id} initialData={{ ...programs[0], workout_plan_exercises: planExercises }} /></div></main>
}
