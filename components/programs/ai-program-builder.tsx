"use client"

import { T, useI18n } from "@/lib/i18n/context"


import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { generateTrainingProgram } from "@/lib/generate-training-program"
import { TrainingProgramSchema, type TrainingProgramPreview } from "@/lib/generated-training-program"
import type { TrainingProgram } from "@/components/workout/training-session"

export function AIProgramBuilder({ onSaved }: { onSaved: (program: TrainingProgram) => void }) {
  const { t } = useI18n()

  const [brief, setBrief] = useState("")
  const [program, setProgram] = useState<TrainingProgramPreview | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function generate(event: React.FormEvent) {
    event.preventDefault()
    if (pending) return
    setPending(true); setError(null)
    try {
      const result = await generateTrainingProgram(brief)
      if (!result.program) throw new Error(result.error || "Could not generate a program.")
      setProgram(result.program)
    } catch (error) { setError(error instanceof Error ? error.message : "Could not generate a program. Please retry.") }
    finally { setPending(false) }
  }
  async function save() {
    if (!program || pending) return
    setPending(true); setError(null)
    try {
      const result = await createClient().rpc("create_training_program_details", { p_program: TrainingProgramSchema.parse(program) }).single<TrainingProgram>()
      if (result.error || !result.data) throw result.error || new Error("Missing program")
      onSaved(result.data)
    } catch { setError("Could not save the program. Your preview is still here; please retry.") }
    finally { setPending(false) }
  }
  return <section className="mb-10 rounded-2xl border bg-card p-6">
    <h2 className="text-2xl font-semibold"><T text={"Generate your program"} /></h2>
    <p className="mt-2 text-muted-foreground"><T text={"Describe your goals, experience, training days, equipment, and any limitations. Review the result before saving it to your library."} /></p>
    <form onSubmit={generate} className="mt-5 space-y-4">
      <label className="grid gap-2 text-sm font-medium"><T text={"Training preferences"} /><Textarea required minLength={10} maxLength={4000} value={brief} onChange={(event) => setBrief(event.target.value)} disabled={pending} placeholder={t("I am a beginner training three days a week with dumbbells, for 45 minutes...")} /></label>
      <Button type="submit" disabled={pending}><T>{pending ? "Working..." : program ? "Generate another preview" : "Generate program"}</T></Button>
    </form>
    {error && <p role="alert" className="mt-4"><T>{error}</T></p>}
    {program && <div className="mt-6 space-y-4">
      <h3 className="text-xl font-semibold">{program.name}</h3><p>{program.description}</p>
      <p className="text-sm text-muted-foreground">{program.duration_weeks}<T text={" weeks · "} /><T>{program.difficulty_level}</T></p>
      {[...new Set(program.exercises.map((exercise) => exercise.day_number))].sort((a, b) => a - b).map((day) => <div key={day} className="rounded-lg border p-4">
        <h4 className="font-medium"><T text={"Day "} />{day}</h4><ul className="mt-2 space-y-2 text-sm">{program.exercises.filter((exercise) => exercise.day_number === day).map((exercise, index) => <li key={index}>{program.exerciseNames[exercise.exercise_id]} — {exercise.sets}<T text={" sets × "} />{exercise.reps}; {exercise.rest_seconds}<T text={"s rest"} /></li>)}</ul>
      </div>)}
      <Button disabled={pending} onClick={save}><T text={"Save to my programs"} /></Button>
    </div>}
  </section>
}
