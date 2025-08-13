"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Play, CheckCircle, Info } from "lucide-react"
import Link from "next/link"
import ExerciseTracker from "./exercise-tracker"
import { createClient } from "@/lib/supabase/client"
import { ThemeToggle } from "@/components/theme/theme-toggle"

interface WorkoutSessionProps {
  workoutPlan: any
  exercisesByDay: any
  userId: string
}

export default function WorkoutSession({ workoutPlan, exercisesByDay, userId }: WorkoutSessionProps) {
  const router = useRouter()
  const [currentDay, setCurrentDay] = useState("1")
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set())
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  const supabase = createClient()
  const days = Object.keys(exercisesByDay).sort((a, b) => Number.parseInt(a) - Number.parseInt(b))
  const currentDayExercises = exercisesByDay[currentDay] || []
  const totalExercises = currentDayExercises.length
  const completedCount = currentDayExercises.filter((ex: any) =>
    completedExercises.has(`${currentDay}-${ex.exercise.id}`),
  ).length
  const progress = totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isSessionActive && sessionStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - sessionStartTime.getTime()) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isSessionActive, sessionStartTime])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const startSession = async () => {
    try {
      const { data, error } = await supabase
        .from("workout_sessions")
        .insert({
          user_id: userId,
          workout_plan_id: workoutPlan.id,
          started_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      setSessionId(data.id)
      setIsSessionActive(true)
      setSessionStartTime(new Date())
    } catch (error) {
      console.error("Error starting session:", error)
    }
  }

  const endSession = async () => {
    if (!sessionId) return

    try {
      const { error } = await supabase
        .from("workout_sessions")
        .update({
          completed_at: new Date().toISOString(),
          notes: `Completed ${completedCount}/${totalExercises} exercises`,
        })
        .eq("id", sessionId)

      if (error) throw error

      setIsSessionActive(false)
      router.push("/dashboard")
    } catch (error) {
      console.error("Error ending session:", error)
    }
  }

  const handleExerciseComplete = (exerciseId: string) => {
    const key = `${currentDay}-${exerciseId}`
    setCompletedExercises((prev) => new Set([...prev, key]))
  }

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case "beginner":
        return "bg-green-500"
      case "intermediate":
        return "bg-yellow-500"
      case "advanced":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild className="text-slate-300 hover:text-white">
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white">{workoutPlan.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`${getDifficultyColor(workoutPlan.difficulty_level)} text-white text-xs`}>
                    {workoutPlan.difficulty_level}
                  </Badge>
                  {isSessionActive && (
                    <span className="text-theme-primary font-mono text-sm">{formatTime(elapsedTime)}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {!isSessionActive ? (
                <Button onClick={startSession} className="bg-theme-primary hover:bg-theme-secondary text-white">
                  <Play className="h-4 w-4 mr-2" />
                  Start Workout
                </Button>
              ) : (
                <Button
                  onClick={endSession}
                  variant="outline"
                  className="border-slate-600 text-slate-200 hover:bg-slate-700 bg-transparent"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  End Workout
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Progress */}
        {isSessionActive && (
          <Card className="bg-slate-800/50 border-slate-700 mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Day {currentDay} Progress</h3>
                <span className="text-slate-300">
                  {completedCount}/{totalExercises} exercises
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              {progress === 100 && (
                <div className="flex items-center gap-2 mt-3 text-theme-primary">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Day {currentDay} Complete!</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Day Selection */}
        <Tabs value={currentDay} onValueChange={setCurrentDay} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800 mb-6">
            {days.map((day) => (
              <TabsTrigger
                key={day}
                value={day}
                className="data-[state=active]:bg-theme-primary data-[state=active]:text-white"
              >
                Day {day}
              </TabsTrigger>
            ))}
          </TabsList>

          {days.map((day) => (
            <TabsContent key={day} value={day}>
              <div className="space-y-6">
                {exercisesByDay[day]?.map((planExercise: any, index: number) => (
                  <Card key={planExercise.id} className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-white flex items-center gap-2">
                            {planExercise.exercise.name}
                            {completedExercises.has(`${day}-${planExercise.exercise.id}`) && (
                              <CheckCircle className="h-5 w-5 text-green-400" />
                            )}
                          </CardTitle>
                          <CardDescription className="text-slate-300 mt-2">
                            {planExercise.exercise.description}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="border-slate-600 text-slate-300">
                          {index + 1} of {exercisesByDay[day].length}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Exercise Details */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-slate-400">Sets:</span>
                              <span className="text-white ml-2">{planExercise.sets}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Reps:</span>
                              <span className="text-white ml-2">{planExercise.reps}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Rest:</span>
                              <span className="text-white ml-2">{planExercise.rest_seconds}s</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Equipment:</span>
                              <span className="text-white ml-2">{planExercise.exercise.equipment || "None"}</span>
                            </div>
                          </div>

                          {/* Instructions */}
                          {planExercise.exercise.instructions && (
                            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
                              <h4 className="text-slate-200 font-medium text-sm mb-2">Instructions</h4>
                              <p className="text-slate-300 text-sm">{planExercise.exercise.instructions}</p>
                            </div>
                          )}

                          {/* Tips */}
                          {planExercise.exercise.tips && (
                            <div className="bg-theme-primary/10 border border-theme-primary/20 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <Info className="h-4 w-4 text-theme-primary mt-0.5 flex-shrink-0" />
                                <div>
                                  <h4 className="text-theme-primary font-medium text-sm">Pro Tip</h4>
                                  <p className="text-slate-300 text-sm mt-1">{planExercise.exercise.tips}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Exercise Tracker */}
                        {isSessionActive && sessionId && (
                          <ExerciseTracker
                            exercise={planExercise.exercise}
                            planExercise={planExercise}
                            sessionId={sessionId}
                            onComplete={() => handleExerciseComplete(planExercise.exercise.id)}
                            isCompleted={completedExercises.has(`${day}-${planExercise.exercise.id}`)}
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
