"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Plus, Minus, Timer, SkipForward } from "lucide-react"
import { logExercise } from "@/lib/actions"

interface ExerciseTrackerProps {
  exercise: any
  planExercise: any
  sessionId: string
  onComplete: (sets: Array<{ reps: number; weight: number }>) => void
  isCompleted: boolean
  initialSets?: Array<{ reps: number; weight: number }>
}

export default function ExerciseTracker({ exercise, planExercise, sessionId, onComplete, isCompleted, initialSets = [] }: ExerciseTrackerProps) {
  const targetSets = Number(planExercise.sets) || 1
  const [sets, setSets] = useState(initialSets)
  const [isLogging, setIsLogging] = useState(false)
  const [restTimer, setRestTimer] = useState(0)
  const [isResting, setIsResting] = useState(false)

  useEffect(() => {
    if (!isResting) return
    const interval = window.setInterval(() => setRestTimer((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(interval)
  }, [isResting])

  useEffect(() => { if (isResting && restTimer === 0) setIsResting(false) }, [isResting, restTimer])

  const addSet = () => setSets((current) => [...current, { reps: 0, weight: 0 }])
  const updateSet = (index: number, field: "reps" | "weight", value: number) => {
    setSets((current) => current.map((set, i) => i === index ? { ...set, [field]: Math.max(0, value) } : set))
  }
  const startRestTimer = () => { setRestTimer(Number(planExercise.rest_seconds) || 60); setIsResting(true) }
  const validSets = sets.filter((set) => set.reps > 0)

  const handleLogExercise = async () => {
    if (validSets.length === 0 || isCompleted) return
    setIsLogging(true)
    const result = await logExercise({ sessionId, exerciseId: exercise.id, setsCompleted: validSets.length, repsCompleted: validSets.map((set) => set.reps), weightUsed: validSets.map((set) => set.weight), notes: `Completed ${validSets.length} sets` })
    if (result.success) onComplete(validSets)
    setIsLogging(false)
  }

  if (isCompleted) return <Card className="bg-green-500/10 border-green-500/20"><CardContent className="p-4 text-center"><CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" /><p className="text-green-400 font-medium">Exercise completed</p><p className="text-slate-300 text-sm mt-1">{sets.length} sets logged</p></CardContent></Card>

  return <Card className="bg-slate-700/50 border-slate-600" aria-busy={isLogging}>
    <CardHeader><CardTitle className="text-white text-lg flex items-center justify-between"><span>Track sets</span><Badge variant="outline" className="border-theme-primary text-theme-primary">{validSets.length}/{targetSets} sets</Badge></CardTitle></CardHeader>
    <CardContent className="space-y-3">
      {sets.map((set, index) => <div key={index} className="grid grid-cols-[auto_1fr_1fr_auto] items-end gap-2 p-3 bg-slate-800/50 rounded-lg">
        <Badge variant="outline" className="border-slate-500 text-slate-300 mb-2">{index + 1}</Badge>
        <label className="text-xs text-slate-300">Actual reps<Input aria-label={`Set ${index + 1} reps`} type="number" min="0" value={set.reps || ""} onChange={(e) => updateSet(index, "reps", Number(e.target.value) || 0)} className="mt-1 bg-slate-700 border-slate-600 text-white" /></label>
        <label className="text-xs text-slate-300">Weight<Input aria-label={`Set ${index + 1} weight`} type="number" min="0" step="0.5" value={set.weight || ""} onChange={(e) => updateSet(index, "weight", Number(e.target.value) || 0)} className="mt-1 bg-slate-700 border-slate-600 text-white" /></label>
        <div className="flex gap-1 mb-1"><Button type="button" size="icon" variant="ghost" aria-label="Decrease reps" onClick={() => updateSet(index, "reps", set.reps - 1)}><Minus className="h-3 w-3" /></Button><Button type="button" size="icon" variant="ghost" aria-label="Increase reps" onClick={() => updateSet(index, "reps", set.reps + 1)}><Plus className="h-3 w-3" /></Button></div>
      </div>)}
      <div className="flex gap-2"><Button type="button" onClick={addSet} variant="outline" disabled={sets.length >= targetSets || isResting} className="flex-1 border-slate-600 text-slate-300 bg-transparent"><Plus className="h-4 w-4 mr-2" />Add set</Button><Button type="button" onClick={startRestTimer} disabled={isResting} variant="outline" className="border-slate-600 text-slate-300 bg-transparent"><Timer className="h-4 w-4 mr-2" />{isResting ? `${restTimer}s` : "Rest"}</Button></div>
      {isResting && <Button type="button" variant="ghost" onClick={() => { setRestTimer(0); setIsResting(false) }} className="w-full text-slate-300"><SkipForward className="h-4 w-4 mr-2" />Skip rest</Button>}
      <Button type="button" onClick={handleLogExercise} disabled={isLogging || validSets.length === 0} className="w-full bg-theme-primary hover:bg-theme-secondary text-white">{isLogging ? "Saving set log..." : `Complete exercise (${validSets.length}/${targetSets})`}</Button>
    </CardContent>
  </Card>
}
