"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Save } from "lucide-react"
import { createProgram, updateProgram } from "@/lib/actions"

interface Exercise {
  id: string
  name: string
  description: string
  muscle_groups: string[]
  equipment: string
}

interface ProgramExercise {
  exerciseId: string
  dayNumber: number
  sets: number
  reps: string
  restSeconds: number
  orderInDay: number
}

interface ProgramFormProps {
  exercises: Exercise[]
  userId: string
  initialData?: any
}

export function ProgramForm({ exercises, userId, initialData }: ProgramFormProps) {
  const router = useRouter()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    difficultyLevel: initialData?.difficulty_level || "beginner",
    durationWeeks: initialData?.duration_weeks || 4,
    isPublic: initialData?.is_public || false,
  })

  const [programExercises, setProgramExercises] = useState<ProgramExercise[]>(
    initialData?.workout_plan_exercises?.map((ex: any) => ({
      exerciseId: ex.exercise_id,
      dayNumber: ex.day_number,
      sets: ex.sets,
      reps: ex.reps,
      restSeconds: ex.rest_seconds,
      orderInDay: ex.order_in_day,
    })) || [],
  )

  const addExercise = () => {
    setProgramExercises([
      ...programExercises,
      {
        exerciseId: "",
        dayNumber: 1,
        sets: 3,
        reps: "8-12",
        restSeconds: 60,
        orderInDay: programExercises.filter((ex) => ex.dayNumber === 1).length + 1,
      },
    ])
  }

  const removeExercise = (index: number) => {
    setProgramExercises(programExercises.filter((_, i) => i !== index))
  }

  const updateExercise = (index: number, field: keyof ProgramExercise, value: any) => {
    const updated = [...programExercises]
    updated[index] = { ...updated[index], [field]: value }

    if (field === "dayNumber") {
      const dayExercises = updated.filter((ex) => ex.dayNumber === value)
      updated[index].orderInDay = dayExercises.length
    }

    setProgramExercises(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || programExercises.length === 0) return

    setIsSubmitting(true)
    try {
      const data = {
        name: formData.name,
        description: formData.description,
        difficultyLevel: formData.difficultyLevel,
        durationWeeks: formData.durationWeeks,
        isPublic: formData.isPublic,
        exercises: programExercises,
      }

      let result
      if (initialData?.id) {
        result = await updateProgram(initialData.id, data)
      } else {
        result = await createProgram(data)
      }

      if (result.success) {
        router.push("/programs")
      } else {
        console.error("Error saving program:", result.error)
      }
    } catch (error) {
      console.error("Error saving program:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getExerciseById = (id: string) => exercises.find((ex) => ex.id === id)
  const maxDay = Math.max(...programExercises.map((ex) => ex.dayNumber), 0)

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Info */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Program Details</CardTitle>
          <CardDescription className="text-slate-300">
            Set up the basic information for your workout program
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-slate-200">
                Program Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="e.g., My Custom Workout"
                required
              />
            </div>
            <div>
              <Label htmlFor="difficulty" className="text-slate-200">
                Difficulty Level
              </Label>
              <Select
                value={formData.difficultyLevel}
                onValueChange={(value) => setFormData({ ...formData, difficultyLevel: value })}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-slate-200">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="Describe your workout program..."
              rows={3}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration" className="text-slate-200">
                Duration (weeks)
              </Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="52"
                value={formData.durationWeeks}
                onChange={(e) => setFormData({ ...formData, durationWeeks: Number.parseInt(e.target.value) || 4 })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Switch
                id="public"
                checked={formData.isPublic}
                onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
              />
              <Label htmlFor="public" className="text-slate-200">
                Make program public
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exercises */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Exercises</CardTitle>
              <CardDescription className="text-slate-300">
                Add exercises to your program organized by day
              </CardDescription>
            </div>
            <Button
              type="button"
              onClick={addExercise}
              className="bg-theme-primary hover:bg-theme-secondary text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Exercise
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {programExercises.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No exercises added yet. Click "Add Exercise" to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from({ length: maxDay }, (_, i) => i + 1).map((day) => (
                <div key={day} className="space-y-3">
                  <h3 className="text-lg font-semibold text-white border-b border-slate-600 pb-2">Day {day}</h3>
                  {programExercises
                    .filter((ex) => ex.dayNumber === day)
                    .map((exercise) => {
                      const globalIndex = programExercises.findIndex((ex) => ex === exercise)
                      const exerciseData = getExerciseById(exercise.exerciseId)

                      return (
                        <div key={globalIndex} className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                          <div className="grid md:grid-cols-6 gap-4 items-end">
                            <div className="md:col-span-2">
                              <Label className="text-slate-200">Exercise</Label>
                              <Select
                                value={exercise.exerciseId}
                                onValueChange={(value) => updateExercise(globalIndex, "exerciseId", value)}
                              >
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                  <SelectValue placeholder="Select exercise" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-700 border-slate-600">
                                  {exercises.map((ex) => (
                                    <SelectItem key={ex.id} value={ex.id}>
                                      {ex.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {exerciseData && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {exerciseData.muscle_groups?.map((muscle) => (
                                    <Badge
                                      key={muscle}
                                      variant="outline"
                                      className="text-xs border-slate-500 text-slate-300"
                                    >
                                      {muscle}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div>
                              <Label className="text-slate-200">Day</Label>
                              <Select
                                value={exercise.dayNumber.toString()}
                                onValueChange={(value) =>
                                  updateExercise(globalIndex, "dayNumber", Number.parseInt(value))
                                }
                              >
                                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-700 border-slate-600">
                                  {Array.from({ length: 7 }, (_, i) => i + 1).map((d) => (
                                    <SelectItem key={d} value={d.toString()}>
                                      Day {d}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label className="text-slate-200">Sets</Label>
                              <Input
                                type="number"
                                min="1"
                                max="10"
                                value={exercise.sets}
                                onChange={(e) =>
                                  updateExercise(globalIndex, "sets", Number.parseInt(e.target.value) || 1)
                                }
                                className="bg-slate-700 border-slate-600 text-white"
                              />
                            </div>

                            <div>
                              <Label className="text-slate-200">Reps</Label>
                              <Input
                                value={exercise.reps}
                                onChange={(e) => updateExercise(globalIndex, "reps", e.target.value)}
                                className="bg-slate-700 border-slate-600 text-white"
                                placeholder="8-12"
                              />
                            </div>

                            <div className="flex items-end gap-2">
                              <div className="flex-1">
                                <Label className="text-slate-200">Rest (sec)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="300"
                                  value={exercise.restSeconds}
                                  onChange={(e) =>
                                    updateExercise(globalIndex, "restSeconds", Number.parseInt(e.target.value) || 60)
                                  }
                                  className="bg-slate-700 border-slate-600 text-white"
                                />
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => removeExercise(globalIndex)}
                                className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting || !formData.name.trim() || programExercises.length === 0}
          className="bg-theme-primary hover:bg-theme-secondary text-white"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? "Saving..." : initialData ? "Update Program" : "Create Program"}
        </Button>
      </div>
    </form>
  )
}
