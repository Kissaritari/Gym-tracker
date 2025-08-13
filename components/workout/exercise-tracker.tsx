"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Plus, Minus, Timer } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ExerciseTrackerProps {
  exercise: any
  planExercise: any
  sessionId: string
  onComplete: () => void
  isCompleted: boolean
}

export default function ExerciseTracker({
  exercise,
  planExercise,
  sessionId,
  onComplete,
  isCompleted,
}: ExerciseTrackerProps) {
  const [sets, setSets] = useState<Array<{ reps: number; weight: number }>>([])
  const [currentSet, setCurrentSet] = useState(0)
  const [isLogging, setIsLogging] = useState(false)
  const [restTimer, setRestTimer] = useState(0)
  const [isResting, setIsResting] = useState(false)

  const supabase = createClient()

  const addSet = () => {
    setSets([...sets, { reps: 0, weight: 0 }])
    setCurrentSet(sets.length)
  }

  const updateSet = (index: number, field: "reps" | "weight", value: number) => {
    const newSets = [...sets]
    newSets[index] = { ...newSets[index], [field]: Math.max(0, value) }
    setSets(newSets)
  }

  const startRestTimer = () => {
    setIsResting(true)
    setRestTimer(planExercise.rest_seconds)

    const interval = setInterval(() => {
      setRestTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          setIsResting(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const logExercise = async () => {
    if (sets.length === 0 || isCompleted) return

    setIsLogging(true)
    try {
      const { error } = await supabase.from("exercise_logs").insert({
        session_id: sessionId,
        exercise_id: exercise.id,
        sets_completed: sets.length,
        reps_completed: sets.map((s) => s.reps),
        weight_used: sets.map((s) => s.weight),
        notes: `Completed ${sets.length} sets`,
      })

      if (error) throw error

      onComplete()
    } catch (error) {
      console.error("Error logging exercise:", error)
    } finally {
      setIsLogging(false)
    }
  }

  if (isCompleted) {
    return (
      <Card className="bg-green-500/10 border-green-500/20">
        <CardContent className="p-4 text-center">
          <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
          <p className="text-green-400 font-medium">Exercise Completed!</p>
          <p className="text-slate-300 text-sm mt-1">{sets.length} sets logged</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-700/50 border-slate-600">
      <CardHeader>
        <CardTitle className="text-white text-lg flex items-center justify-between">
          Track Your Sets
          {isResting && (
            <div className="flex items-center gap-2 text-theme-primary">
              <Timer className="h-4 w-4" />
              <span className="text-sm font-mono">{restTimer}s</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Sets */}
        {sets.map((set, index) => (
          <div key={index} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
            <Badge variant="outline" className="border-slate-500 text-slate-300">
              Set {index + 1}
            </Badge>
            <div className="flex items-center gap-2">
              <Label className="text-slate-300 text-sm">Reps:</Label>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0 border-slate-600 bg-transparent hover:bg-slate-600"
                  onClick={() => updateSet(index, "reps", set.reps - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  value={set.reps}
                  onChange={(e) => updateSet(index, "reps", Number.parseInt(e.target.value) || 0)}
                  className="w-16 h-8 text-center bg-slate-700 border-slate-600 text-white"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0 border-slate-600 bg-transparent hover:bg-slate-600"
                  onClick={() => updateSet(index, "reps", set.reps + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-slate-300 text-sm">Weight:</Label>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0 border-slate-600 bg-transparent hover:bg-slate-600"
                  onClick={() => updateSet(index, "weight", set.weight - 5)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  value={set.weight}
                  onChange={(e) => updateSet(index, "weight", Number.parseInt(e.target.value) || 0)}
                  className="w-16 h-8 text-center bg-slate-700 border-slate-600 text-white"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0 border-slate-600 bg-transparent hover:bg-slate-600"
                  onClick={() => updateSet(index, "weight", set.weight + 5)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <span className="text-slate-400 text-sm">lbs</span>
            </div>
            {index === sets.length - 1 && sets.length < planExercise.sets && (
              <Button
                size="sm"
                onClick={startRestTimer}
                disabled={isResting}
                className="bg-theme-secondary hover:bg-theme-primary text-white"
              >
                <Timer className="h-3 w-3 mr-1" />
                Rest
              </Button>
            )}
          </div>
        ))}

        {/* Add Set Button */}
        <Button
          onClick={addSet}
          variant="outline"
          className="w-full border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
          disabled={sets.length >= planExercise.sets || isResting}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Set ({sets.length}/{planExercise.sets})
        </Button>

        {/* Complete Exercise Button */}
        {sets.length > 0 && (
          <Button
            onClick={logExercise}
            disabled={isLogging}
            className="w-full bg-theme-primary hover:bg-theme-secondary text-white"
          >
            {isLogging ? "Logging..." : "Complete Exercise"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
