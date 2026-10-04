"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Check, ChevronRight } from "lucide-react"

export type TrainingProgram = { id: string; name: string; description: string; difficulty_level: string; duration_weeks: number; is_public?: boolean }
type PlannedExercise = { id: string; exercise_id: string; day_number: number; sets: number; reps: string; rest_seconds: number; exercise: { name: string; instructions?: string } }
type SetEntry = { reps: number; weight: number }

export function TrainingSession({ program, userId, onFinish, onBack, initialDay }: { program: TrainingProgram; userId: string; onFinish: () => void; onBack: () => void; initialDay?: number }) {
  const client = useMemo(() => createClient(), [])
  const [exercises, setExercises] = useState<PlannedExercise[]>([])
  const [day, setDay] = useState(1)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<{ id: string; started_at: string } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, SetEntry[]>>({})
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const days = [...new Set(exercises.map((item) => item.day_number))].sort((a, b) => a - b)
  const today = exercises.filter((item) => item.day_number === day)
  const active = today.find((item) => item.id === selected)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const result = await client.from("workout_plan_exercises").select("id, exercise_id, day_number, sets, reps, rest_seconds, exercise:exercises(name, instructions)").eq("workout_plan_id", program.id).order("day_number").order("order_in_day")
        if (result.error) throw result.error
        if (cancelled) return
        const rows = (result.data || []) as unknown as PlannedExercise[]
        setExercises(rows)
        setDay(rows.some((item) => item.day_number === initialDay) ? initialDay! : rows[0]?.day_number || 1)
      } catch {
        if (!cancelled) setError("Could not load this program's exercises. Please reopen the program to retry.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [client, program.id, initialDay])

  async function start() {
    if (pending || session || today.length === 0) return
    setPending(true); setError(null)
    try {
      const existing = await client.from("workout_sessions").select("id, started_at").eq("user_id", userId).eq("workout_plan_id", program.id).is("completed_at", null).eq("notes", `Day ${day}`).order("started_at", { ascending: false }).limit(1)
      if (existing.error) throw existing.error
      let current = existing.data?.[0]
      if (!current) {
        const created = await client.from("workout_sessions").insert({ user_id: userId, workout_plan_id: program.id, notes: `Day ${day}` }).select("id, started_at").single()
        if (created.error) throw created.error
        current = created.data
      }
      const logs = await client.from("exercise_logs").select("exercise_id, reps_completed, weight_used").eq("session_id", current.id)
      if (logs.error) throw logs.error
      const done = new Set<string>()
      const saved: Record<string, SetEntry[]> = {}
      for (const item of today) {
        const log = logs.data?.find((entry) => entry.exercise_id === item.exercise_id)
        if (log) {
          done.add(item.id)
          saved[item.id] = (log.reps_completed || []).map((reps: number, index: number) => ({ reps, weight: Number(log.weight_used?.[index] || 0) }))
        }
      }
      setCompleted(done); setDrafts(saved); setSession(current)
    } catch {
      setError("Could not start your workout. Please try again.")
    } finally { setPending(false) }
  }

  function select(item: PlannedExercise) {
    setSelected(item.id)
    setDrafts((current) => current[item.id] ? current : { ...current, [item.id]: Array.from({ length: Math.max(1, item.sets) }, () => ({ reps: 0, weight: 0 })) })
  }

  function update(index: number, field: "reps" | "weight", value: string) {
    if (!active) return
    setDrafts((current) => ({ ...current, [active.id]: current[active.id].map((entry, i) => i === index ? { ...entry, [field]: Math.max(0, Number(value) || 0) } : entry) }))
  }

  async function saveExercise() {
    if (!active || !session || pending || completed.has(active.id)) return
    const sets = (drafts[active.id] || []).filter((entry) => Number.isInteger(entry.reps) && entry.reps > 0)
    if (!sets.length) { setError("Enter reps for at least one set before completing this exercise."); return }
    setPending(true); setError(null)
    try {
      const result = await client.from("exercise_logs").insert({ session_id: session.id, exercise_id: active.exercise_id, sets_completed: sets.length, reps_completed: sets.map((entry) => entry.reps), weight_used: sets.map((entry) => entry.weight) })
      if (result.error) throw result.error
      setCompleted((current) => new Set(current).add(active.id))
      setSelected(null)
    } catch { setError("Could not save this exercise. Your entered sets are still here; please retry.") }
    finally { setPending(false) }
  }

  async function finish() {
    if (!session || pending) return
    if (Object.entries(drafts).some(([id, sets]) => !completed.has(id) && sets.some((entry) => entry.reps > 0))) {
      setError("Complete the exercise with your entered sets before finishing the workout.")
      return
    }
    setPending(true); setError(null)
    try {
      const result = await client.from("workout_sessions").update({ completed_at: new Date().toISOString(), notes: `Day ${day}: Completed ${completed.size}/${today.length} exercises` }).eq("id", session.id).eq("user_id", userId).select("id").single()
      if (result.error) throw result.error
      onFinish()
    } catch { setError("Could not finish your workout. Please try again.") }
    finally { setPending(false) }
  }

  return <section className="rounded-2xl border bg-card p-6" aria-busy={loading || pending}>
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-widest text-primary">{session ? `Day ${day} workout` : "Choose your workout day"}</p><h2 className="mt-2 text-2xl font-semibold">{program.name}</h2></div><Badge>{session ? "In progress" : "Ready to start"}</Badge></div>
    {error && <p role="alert" className="mt-4 rounded-lg border border-destructive/50 p-3 text-sm">{error}</p>}
    {loading ? <p className="mt-6 text-muted-foreground">Loading exercises...</p> : !exercises.length ? <p className="mt-6 text-muted-foreground">This program has no exercises yet. Choose a program with exercises to start a workout.</p> : <>
      <div className="my-6 flex flex-wrap gap-2" aria-label="Workout days">{days.map((value) => <Button key={value} variant={day === value ? "default" : "outline"} disabled={!!session || pending} onClick={() => { setDay(value); setSelected(null) }}>Day {value}</Button>)}</div>
      {session && <p className="mb-4 text-sm text-muted-foreground">{completed.size}/{today.length} exercises completed</p>}
      <div className="flex flex-col gap-3">{today.map((item, index) => <div key={item.id}>
        <button type="button" disabled={!session || pending} onClick={() => select(item)} aria-expanded={selected === item.id} className={`flex w-full items-center justify-between rounded-xl border p-4 text-left disabled:opacity-60 ${selected === item.id || completed.has(item.id) ? "border-primary bg-primary/10" : "hover:bg-muted"}`}>
          <span className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full border text-xs">{completed.has(item.id) ? <Check className="size-4" /> : index + 1}</span><span><span className="block font-medium">{item.exercise.name}</span><span className="text-xs text-muted-foreground">{item.sets} sets ? {item.reps} reps ? {item.rest_seconds}s rest</span></span></span><ChevronRight className="size-4" />
        </button>
        {selected === item.id && <div className="mt-2 rounded-xl border p-4">
          {item.exercise.instructions && <p className="mb-4 text-sm text-muted-foreground">{item.exercise.instructions}</p>}
          {(drafts[item.id] || []).map((entry, i) => <div key={i} className="mb-3 grid grid-cols-[auto_1fr_1fr] items-end gap-3"><span className="pb-2 text-sm">Set {i + 1}</span><label className="text-xs">Reps<Input aria-label={`${item.exercise.name} set ${i + 1} reps`} type="number" min="0" step="1" disabled={pending || completed.has(item.id)} value={entry.reps || ""} onChange={(e) => update(i, "reps", e.target.value)} /></label><label className="text-xs">Weight<Input aria-label={`${item.exercise.name} set ${i + 1} weight`} type="number" min="0" step="0.5" disabled={pending || completed.has(item.id)} value={entry.weight || ""} onChange={(e) => update(i, "weight", e.target.value)} /></label></div>)}
          {completed.has(item.id) ? <p className="text-sm text-primary">Exercise completed</p> : <Button onClick={saveExercise} disabled={pending}>{pending ? "Saving..." : "Complete exercise"}</Button>}
        </div>}
      </div>)}</div>
      <Button className="mt-6 w-full" disabled={pending} onClick={session ? finish : start}>{pending ? "Saving..." : session ? "Finish workout" : `Start day ${day} workout`}</Button>
    </>}
    <Button variant="ghost" className="mt-4" disabled={pending} onClick={onBack}>{"Back to programs"}</Button>
  </section>
}
