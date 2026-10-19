"use client"

import { T, useI18n } from "@/lib/i18n/context"


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
import { completedExerciseKeys, exerciseKey } from "@/lib/workout-tracker"

interface WorkoutSessionProps {
  workoutPlan: any
  exercisesByDay: Record<string, any[]>
  userId: string
}

type LoggedSet = { reps: number; weight: number }

export default function WorkoutSession({ workoutPlan, exercisesByDay }: WorkoutSessionProps) {
  const { t } = useI18n()

  const router = useRouter()
  const days = useMemo(() => Object.keys(exercisesByDay).sort((a, b) => Number(a) - Number(b)), [exercisesByDay])
  const [currentDay, setCurrentDay] = useState(days[0] || "1")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [activeExerciseKey, setActiveExerciseKey] = useState<string | null>(null)
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set())
  const [loggedSets, setLoggedSets] = useState<Record<string, LoggedSet[]>>({})

  const currentDayExercises = useMemo(() => exercisesByDay[currentDay] || [], [exercisesByDay, currentDay])
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
    if (isStarting || isSessionActive || currentDayExercises.length === 0) return
    setError(null)
    setIsStarting(true)
    try {
      const result = await startWorkoutSession(workoutPlan.id)
      if (!result.success || !result.sessionId) {
        setError(result.error || "Unable to start workout. Please try again.")
        return
      }
      const progressResult = await fetchWorkoutProgress(result.sessionId)
      if (!progressResult.success) {
        setError("Unable to load saved workout progress. Please try starting again.")
        return
      }
      const completed = completedExerciseKeys(days, exercisesByDay, progressResult.logs || [])
      const sets: Record<string, LoggedSet[]> = {}
      for (const day of days) {
        for (const item of exercisesByDay[day] || []) {
          if (!completed.has(exerciseKey(day, item))) continue
          const log = (progressResult.logs || []).find((entry: any) => entry.workout_plan_exercise_id === item.id || (
            !entry.workout_plan_exercise_id && entry.exercise_id === item.exercise.id
          ))
          if (log) sets[item.id] = (log.reps_completed || []).map((reps: number, index: number) => ({ reps, weight: Number(log.weight_used?.[index] || 0) }))
        }
      }
      setSessionId(result.sessionId)
      setCompletedExercises(completed)
      setLoggedSets(sets)
      setIsSessionActive(true)
      setSessionStartTime(new Date())
    } catch {
      setError("Unable to start workout. Please try again.")
    } finally {
      setIsStarting(false)
    }
  }

  const finishSession = async () => {
    if (!sessionId || isFinishing) return
    setError(null)
    setIsFinishing(true)
    try {
      const total = Object.values(exercisesByDay).reduce((count, exercises) => count + exercises.length, 0)
      const result = await endWorkoutSession(sessionId, `Completed ${completedExercises.size}/${total} exercises`)
      if (result.success) router.push("/dashboard")
      else setError(result.error || "Unable to finish workout. Please try again.")
    } catch {
      setError("Unable to finish workout. Please try again.")
    } finally {
      setIsFinishing(false)
    }
  }

  const selectExercise = (day: string, item: any) => {
    if (!isSessionActive) return
    setActiveExerciseKey(exerciseKey(day, item))
  }


  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <header className="border-b border-slate-700 bg-slate-800/50">
        <div className="container mx-auto flex flex-col gap-4 sm:flex-row sm:items-center justify-between px-4 py-4">
          <div className="flex flex-wrap items-center gap-4 min-w-0">
            <Button variant="ghost" size="sm" asChild className="text-slate-300 hover:text-white"><Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /><T text={"Back to Dashboard"} /></Link></Button>
            <div><h1 className="text-2xl font-bold text-white">{workoutPlan.name}</h1><div className="mt-1 flex items-center gap-2"><Badge className="bg-slate-600 text-white"><T>{workoutPlan.difficulty}</T></Badge>{isSessionActive && <span className="font-mono text-sm text-theme-primary">{formatTime(elapsedTime)}</span>}</div></div>
          </div>
          <div className="flex items-center gap-2"><ThemeToggle />{!isSessionActive ? <Button onClick={startSession} disabled={isStarting || currentDayExercises.length === 0} className="bg-theme-primary text-white"><Play className="mr-2 h-4 w-4" /><T>{isStarting ? "Starting..." : "Start workout"}</T></Button> : <Button onClick={finishSession} disabled={isFinishing} variant="outline" className="border-slate-600 bg-transparent text-slate-200"><CheckCircle className="mr-2 h-4 w-4" /><T>{isFinishing ? "Saving..." : "End workout"}</T></Button>}</div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {error && <p role="alert" className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-red-300"><T>{error}</T></p>}
        {days.length === 0 && <Card className="border-slate-700 bg-slate-800/50"><CardContent className="p-6 text-slate-300"><T text={"This program has no exercises yet. Choose another program or add exercises before starting a workout."} /></CardContent></Card>}
        {isSessionActive && <Card className="mb-6 border-slate-700 bg-slate-800/50"><CardContent className="p-6"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-white"><T text={"Day "} />{currentDay}<T text={" progress"} /></h2><span className="text-slate-300">{completedCount}/{currentDayExercises.length}<T text={" exercises"} /></span></div><Progress value={progress} className="h-2" /></CardContent></Card>}

        <Tabs value={currentDay} onValueChange={setCurrentDay}>
          <TabsList aria-label={t("Workout days")} className="mb-6 flex h-auto w-full flex-wrap justify-start gap-2 bg-slate-800">{days.map((day) => <TabsTrigger key={day} value={day} disabled={isStarting || isFinishing} className="flex-none min-w-20 data-[state=active]:bg-theme-primary data-[state=active]:text-white"><T text={"Day "} />{day}</TabsTrigger>)}</TabsList>
          {days.map((day) => <TabsContent key={day} value={day}><div className="space-y-4">{(exercisesByDay[day] || []).map((item, index) => {
            const key = exerciseKey(day, item)
            const isActive = activeExerciseKey === key
            const isCompleted = completedExercises.has(key)
            return <Card key={item.id} className={`border-slate-700 bg-slate-800/50 ${isActive ? "ring-2 ring-theme-primary" : ""}`}>
              <CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2 text-white">{item.exercise.name}{isCompleted && <CheckCircle className="h-5 w-5 text-green-400" />}</CardTitle><CardDescription className="mt-2 text-slate-300">{item.exercise.description || <T text="Track your working sets and actual reps." />}</CardDescription></div><Badge variant="outline" className="shrink-0 border-slate-600 text-slate-300">{index + 1}<T text={" of "} />{(exercisesByDay[day] || []).length}</Badge></div></CardHeader>
              <CardContent className="space-y-4"><div className="grid grid-cols-2 gap-4 text-sm text-slate-300 md:grid-cols-4"><span><T text={"Sets: "} /><strong className="text-white">{item.sets}</strong></span><span><T text={"Reps: "} /><strong className="text-white">{item.reps}</strong></span><span><T text={"Rest: "} /><strong className="text-white">{item.rest_seconds}s</strong></span><span><T text={"Equipment: "} /><strong className="text-white"><T>{item.exercise.equipment || "None"}</T></strong></span></div>{item.exercise.instructions && <div className="rounded-lg border border-slate-600 bg-slate-700/50 p-3 text-sm text-slate-300"><strong className="text-slate-200"><T text={"Instructions"} /></strong><p className="mt-1">{item.exercise.instructions}</p></div>}{item.exercise.tips && <div className="rounded-lg border border-theme-primary/20 bg-theme-primary/10 p-3 text-sm text-slate-300"><div className="flex gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-theme-primary" /><span>{item.exercise.tips}</span></div></div>}
                {!isSessionActive ? <p className="text-sm text-slate-400"><T text={"Start the workout to track this exercise."} /></p> : isActive && sessionId ? <ExerciseTracker exercise={item.exercise} planExercise={item} sessionId={sessionId} isCompleted={isCompleted} initialSets={loggedSets[item.id]} onComplete={(sets) => { setLoggedSets((current) => ({ ...current, [item.id]: sets })); setCompletedExercises((current) => new Set(current).add(key)); setActiveExerciseKey(null) }} /> : <Button type="button" onClick={() => selectExercise(day, item)} className="w-full bg-theme-primary text-white"><T>{isCompleted ? "Review exercise" : "Start exercise"}</T></Button>}
              </CardContent>
            </Card>
          })}</div></TabsContent>)}
        </Tabs>
      </div>
    </main>
  )
}
