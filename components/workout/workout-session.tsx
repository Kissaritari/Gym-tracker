"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle, Info, Play } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { endWorkoutSession, fetchWorkoutProgress, startWorkoutSession } from "@/lib/actions"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import ExerciseTracker from "./exercise-tracker"
import { completedExerciseKeys, exerciseKey, findExerciseForKey } from "@/lib/workout-tracker"

interface WorkoutSessionProps {
  workoutPlan: any
  exercisesByDay: Record<string, any[]>
  userId: string
}

type LoggedSet = { reps: number; weight: number }

export default function WorkoutSession({ workoutPlan, exercisesByDay }: WorkoutSessionProps) {
  const router = useRouter()
  const days = useMemo(() => Object.keys(exercisesByDay).sort((a, b) => Number(a) - Number(b)), [exercisesByDay])
  const [currentDay, setCurrentDay] = useState(days[0] || "1")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [activeExerciseKey, setActiveExerciseKey] = useState<string | null>(null)
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set())
  const [loggedSets, setLoggedSets] = useState<Record<string, LoggedSet[]>>({})

  const currentDayExercises = exercisesByDay[currentDay] || []
  const completedCount = currentDayExercises.filter((item) => completedExercises.has(`${currentDay}-${item.id}`)).length
  const progress = currentDayExercises.length ? (completedCount / currentDayExercises.length) * 100 : 0

  useEffect(() => {
    if (!isSessionActive || !sessionStartTime) return
    const timer = window.setInterval(() => setElapsedTime(Math.floor((Date.now() - sessionStartTime.getTime()) / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [isSessionActive, sessionStartTime])

  useEffect(() => {
    if (!currentDayExercises.some((item) => `${currentDay}-${item.id}` === activeExerciseKey)) setActiveExerciseKey(null)
  }, [currentDay, currentDayExercises, activeExerciseKey])

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
  const startSession = async () => {
    setIsStarting(true)
    try {
      const result = await startWorkoutSession(workoutPlan.id)
      if (!result.success || !result.sessionId) return
      const progressResult = await fetchWorkoutProgress(result.sessionId)
      const sets: Record<string, LoggedSet[]> = {}
      for (const log of progressResult.logs || []) {
        sets[log.exercise_id] = (log.reps_completed || []).map((reps: number, index: number) => ({ reps, weight: Number(log.weight_used?.[index] || 0) }))
      }
      const completed = completedExerciseKeys(days, exercisesByDay, (progressResult.logs || []).map((log: any) => log.exercise_id))
      setSessionId(result.sessionId)
      setCompletedExercises(completed)
      setLoggedSets(sets)
      setIsSessionActive(true)
      setSessionStartTime(new Date())
    } finally {
      setIsStarting(false)
    }
  }

  const finishSession = async () => {
    if (!sessionId) return
    const result = await endWorkoutSession(sessionId, `Completed ${completedCount}/${currentDayExercises.length} exercises`)
    if (result.success) router.push("/dashboard")
  }

  const selectExercise = (day: string, item: any) => {
    if (!isSessionActive) return
    setActiveExerciseKey(exerciseKey(day, item))
  }

  const activeExercise = findExerciseForKey(currentDayExercises, currentDay, activeExerciseKey)

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <header className="border-b border-slate-700 bg-slate-800/50">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="text-slate-300 hover:text-white"><Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back to Dashboard</Link></Button>
            <div><h1 className="text-2xl font-bold text-white">{workoutPlan.name}</h1><div className="mt-1 flex items-center gap-2"><Badge className="bg-slate-600 text-white">{workoutPlan.difficulty}</Badge>{isSessionActive && <span className="font-mono text-sm text-theme-primary">{formatTime(elapsedTime)}</span>}</div></div>
          </div>
          <div className="flex items-center gap-2"><ThemeToggle />{!isSessionActive ? <Button onClick={startSession} disabled={isStarting} className="bg-theme-primary text-white"><Play className="mr-2 h-4 w-4" />{isStarting ? "Starting..." : "Start workout"}</Button> : <Button onClick={finishSession} variant="outline" className="border-slate-600 bg-transparent text-slate-200"><CheckCircle className="mr-2 h-4 w-4" />End workout</Button>}</div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {isSessionActive && <Card className="mb-6 border-slate-700 bg-slate-800/50"><CardContent className="p-6"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-white">Day {currentDay} progress</h2><span className="text-slate-300">{completedCount}/{currentDayExercises.length} exercises</span></div><Progress value={progress} className="h-2" /></CardContent></Card>}

        <Tabs value={currentDay} onValueChange={setCurrentDay}>
          <TabsList className="mb-6 grid w-full grid-cols-3 bg-slate-800">{days.map((day) => <TabsTrigger key={day} value={day} className="data-[state=active]:bg-theme-primary data-[state=active]:text-white">Day {day}</TabsTrigger>)}</TabsList>
          {days.map((day) => <TabsContent key={day} value={day}><div className="space-y-4">{(exercisesByDay[day] || []).map((item, index) => {
            const key = exerciseKey(day, item)
            const isActive = activeExerciseKey === key
            const isCompleted = completedExercises.has(key)
            return <Card key={item.id} className={`border-slate-700 bg-slate-800/50 ${isActive ? "ring-2 ring-theme-primary" : ""}`}>
              <CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2 text-white">{item.exercise.name}{isCompleted && <CheckCircle className="h-5 w-5 text-green-400" />}</CardTitle><CardDescription className="mt-2 text-slate-300">{item.exercise.description || "Track your working sets and actual reps."}</CardDescription></div><Badge variant="outline" className="shrink-0 border-slate-600 text-slate-300">{index + 1} of {(exercisesByDay[day] || []).length}</Badge></div></CardHeader>
              <CardContent className="space-y-4"><div className="grid grid-cols-2 gap-4 text-sm text-slate-300 md:grid-cols-4"><span>Sets: <strong className="text-white">{item.sets}</strong></span><span>Reps: <strong className="text-white">{item.reps}</strong></span><span>Rest: <strong className="text-white">{item.rest_seconds}s</strong></span><span>Equipment: <strong className="text-white">{item.exercise.equipment || "None"}</strong></span></div>{item.exercise.instructions && <div className="rounded-lg border border-slate-600 bg-slate-700/50 p-3 text-sm text-slate-300"><strong className="text-slate-200">Instructions</strong><p className="mt-1">{item.exercise.instructions}</p></div>}{item.exercise.tips && <div className="rounded-lg border border-theme-primary/20 bg-theme-primary/10 p-3 text-sm text-slate-300"><div className="flex gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-theme-primary" /><span>{item.exercise.tips}</span></div></div>}
                {!isSessionActive ? <p className="text-sm text-slate-400">Start the workout to track this exercise.</p> : isActive && sessionId ? <ExerciseTracker exercise={item.exercise} planExercise={item} sessionId={sessionId} isCompleted={isCompleted} initialSets={loggedSets[item.exercise.id]} onComplete={(sets) => { setLoggedSets((current) => ({ ...current, [item.exercise.id]: sets })); setCompletedExercises((current) => new Set(current).add(key)); setActiveExerciseKey(null) }} /> : <Button type="button" onClick={() => selectExercise(day, item)} className="w-full bg-theme-primary text-white">{isCompleted ? "Review exercise" : "Start exercise"}</Button>}
              </CardContent>
            </Card>
          })}</div></TabsContent>)}
        </Tabs>
      </div>
    </main>
  )
}
