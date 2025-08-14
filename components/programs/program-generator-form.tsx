"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, Download, Eye } from "lucide-react"
import { generateWorkoutProgram } from "@/lib/ai-actions"
import { importGeneratedProgram } from "@/lib/actions"
import { useRouter } from "next/navigation"

interface GeneratedProgram {
  name: string
  description: string
  level: string
  duration_weeks: number
  days_per_week: number
  days: Array<{
    day_number: number
    name: string
    exercises: Array<{
      exercise_name: string
      sets: number
      reps: string
      rest_seconds: number
      notes?: string
    }>
  }>
}

export function ProgramGeneratorForm() {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [generatedProgram, setGeneratedProgram] = useState<GeneratedProgram | null>(null)

  const [formData, setFormData] = useState({
    goal: "",
    experience: "",
    daysPerWeek: "",
    sessionDuration: "",
    equipment: [] as string[],
    focusAreas: [] as string[],
    limitations: "",
    additionalNotes: "",
  })

  const goals = [
    "Build muscle mass",
    "Lose weight/fat",
    "Increase strength",
    "Improve endurance",
    "General fitness",
    "Athletic performance",
    "Rehabilitation/recovery",
  ]

  const experiences = [
    "Beginner (0-6 months)",
    "Intermediate (6 months - 2 years)",
    "Advanced (2+ years)",
    "Expert (5+ years)",
  ]

  const equipmentOptions = [
    "Dumbbells",
    "Barbell",
    "Resistance bands",
    "Pull-up bar",
    "Kettlebells",
    "Cable machine",
    "Smith machine",
    "Bodyweight only",
    "Full gym access",
  ]

  const focusOptions = [
    "Upper body",
    "Lower body",
    "Core/abs",
    "Cardio",
    "Flexibility",
    "Functional movement",
    "Sport-specific",
  ]

  const handleEquipmentChange = (equipment: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      equipment: checked ? [...prev.equipment, equipment] : prev.equipment.filter((e) => e !== equipment),
    }))
  }

  const handleFocusChange = (focus: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      focusAreas: checked ? [...prev.focusAreas, focus] : prev.focusAreas.filter((f) => f !== focus),
    }))
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const program = await generateWorkoutProgram(formData)
      setGeneratedProgram(program)
    } catch (error) {
      console.error("Failed to generate program:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleImport = async () => {
    if (!generatedProgram) return

    setIsImporting(true)
    try {
      const result = await importGeneratedProgram(generatedProgram)
      if (result.success) {
        router.push("/programs")
      }
    } catch (error) {
      console.error("Failed to import program:", error)
    } finally {
      setIsImporting(false)
    }
  }

  const isFormValid =
    formData.goal &&
    formData.experience &&
    formData.daysPerWeek &&
    formData.sessionDuration &&
    formData.equipment.length > 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-theme-primary" />
            Program Preferences
          </CardTitle>
          <CardDescription>
            Tell us about your fitness goals and preferences to generate a personalized program.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="goal">Primary Goal *</Label>
              <Select
                value={formData.goal}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, goal: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your main goal" />
                </SelectTrigger>
                <SelectContent>
                  {goals.map((goal) => (
                    <SelectItem key={goal} value={goal}>
                      {goal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Experience Level *</Label>
              <Select
                value={formData.experience}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, experience: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your experience" />
                </SelectTrigger>
                <SelectContent>
                  {experiences.map((exp) => (
                    <SelectItem key={exp} value={exp}>
                      {exp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="daysPerWeek">Days Per Week *</Label>
              <Select
                value={formData.daysPerWeek}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, daysPerWeek: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="How many days?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 days</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="4">4 days</SelectItem>
                  <SelectItem value="5">5 days</SelectItem>
                  <SelectItem value="6">6 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionDuration">Session Duration *</Label>
              <Select
                value={formData.sessionDuration}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, sessionDuration: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="How long per session?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Available Equipment *</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {equipmentOptions.map((equipment) => (
                <div key={equipment} className="flex items-center space-x-2">
                  <Checkbox
                    id={equipment}
                    checked={formData.equipment.includes(equipment)}
                    onCheckedChange={(checked) => handleEquipmentChange(equipment, checked as boolean)}
                  />
                  <Label htmlFor={equipment} className="text-sm">
                    {equipment}
                  </Label>
                </div>
              ))}
            </div>
            {formData.equipment.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.equipment.map((eq) => (
                  <Badge key={eq} variant="secondary">
                    {eq}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>Focus Areas (Optional)</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {focusOptions.map((focus) => (
                <div key={focus} className="flex items-center space-x-2">
                  <Checkbox
                    id={focus}
                    checked={formData.focusAreas.includes(focus)}
                    onCheckedChange={(checked) => handleFocusChange(focus, checked as boolean)}
                  />
                  <Label htmlFor={focus} className="text-sm">
                    {focus}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="limitations">Physical Limitations or Injuries</Label>
            <Textarea
              id="limitations"
              placeholder="Any injuries, physical limitations, or exercises to avoid..."
              value={formData.limitations}
              onChange={(e) => setFormData((prev) => ({ ...prev, limitations: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalNotes">Additional Notes</Label>
            <Textarea
              id="additionalNotes"
              placeholder="Any other preferences or requirements..."
              value={formData.additionalNotes}
              onChange={(e) => setFormData((prev) => ({ ...prev, additionalNotes: e.target.value }))}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!isFormValid || isGenerating}
            className="w-full bg-theme-primary hover:bg-theme-primary/90"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Program...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Program
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedProgram && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Generated Program: {generatedProgram.name}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={isImporting}
                  size="sm"
                  className="bg-theme-primary hover:bg-theme-primary/90"
                >
                  {isImporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Import Program
                </Button>
              </div>
            </CardTitle>
            <CardDescription>{generatedProgram.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-theme-primary">{generatedProgram.duration_weeks}</div>
                <div className="text-sm text-muted-foreground">Weeks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-theme-primary">{generatedProgram.days_per_week}</div>
                <div className="text-sm text-muted-foreground">Days/Week</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-theme-primary">{generatedProgram.level}</div>
                <div className="text-sm text-muted-foreground">Level</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-theme-primary">{generatedProgram.days.length}</div>
                <div className="text-sm text-muted-foreground">Workouts</div>
              </div>
            </div>

            <div className="space-y-4">
              {generatedProgram.days.map((day) => (
                <Card key={day.day_number} className="border-l-4 border-l-theme-primary">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">
                      Day {day.day_number}: {day.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {day.exercises.map((exercise, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                          <div>
                            <span className="font-medium">{exercise.exercise_name}</span>
                            {exercise.notes && <p className="text-sm text-muted-foreground">{exercise.notes}</p>}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {exercise.sets} × {exercise.reps} • {exercise.rest_seconds}s rest
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
