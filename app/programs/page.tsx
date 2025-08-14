import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { signOut } from "@/lib/actions"
import { Dumbbell, LogOut, Plus, Edit, Users, Lock, ArrowLeft, Sparkles } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { DeleteProgramButton } from "@/components/programs/delete-program-button"

export default async function ProgramsPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch all public programs and user's own programs
  const { data: allPrograms } = await supabase
    .from("workout_plans")
    .select(`
      *,
      workout_plan_exercises (
        id,
        exercise_id,
        day_number
      )
    `)
    .or(`is_public.eq.true,created_by.eq.${user.id}`)
    .order("created_at", { ascending: false })

  // Separate public and user programs
  const publicPrograms = allPrograms?.filter((p) => p.is_public && p.created_by !== user.id) || []
  const userPrograms = allPrograms?.filter((p) => p.created_by === user.id) || []

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

  const getExerciseCount = (program: any) => {
    return program.workout_plan_exercises?.length || 0
  }

  const getDayCount = (program: any) => {
    const days = new Set(program.workout_plan_exercises?.map((ex: any) => ex.day_number) || [])
    return days.size
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
              <Button variant="ghost" size="sm" asChild className="text-slate-300 hover:text-white self-start">
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span className="hidden xs:inline">Back to Dashboard</span>
                  <span className="xs:hidden">Back</span>
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <Dumbbell className="h-6 sm:h-8 w-6 sm:w-8 text-theme-primary" />
                <h1 className="text-xl sm:text-2xl font-bold text-white">Program Manager</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-theme-primary text-theme-primary hover:bg-theme-primary hover:text-white bg-transparent text-xs sm:text-sm"
              >
                <Link href="/programs/generate">
                  <Sparkles className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">AI Generator</span>
                  <span className="xs:hidden">AI</span>
                </Link>
              </Button>
              <Button asChild className="bg-theme-primary hover:bg-theme-secondary text-white text-xs sm:text-sm">
                <Link href="/programs/create">
                  <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Create Program</span>
                  <span className="xs:hidden">Create</span>
                </Link>
              </Button>
              <ThemeToggle />
              <span className="text-slate-300 text-xs sm:text-sm hidden md:block">Welcome, {user.email}</span>
              <span className="text-slate-300 text-xs sm:text-sm md:hidden">Hi!</span>
              <form action={signOut}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-200 hover:bg-slate-700 bg-transparent text-xs sm:text-sm"
                >
                  <LogOut className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Sign Out</span>
                  <span className="xs:hidden">Out</span>
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* User's Programs */}
        <div className="mb-8 sm:mb-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white">My Programs</h2>
            <Badge variant="outline" className="border-slate-600 text-slate-300 self-start sm:self-auto">
              {userPrograms.length} programs
            </Badge>
          </div>

          {userPrograms.length > 0 ? (
            /* Changed grid to be mobile-first: single column on mobile, 2 on tablet, 3 on desktop */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {userPrograms.map((program) => (
                <Card key={program.id} className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-3 sm:pb-6">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-white flex items-center gap-2 text-lg sm:text-xl">
                          <span className="truncate">{program.name}</span>
                          {program.is_public ? (
                            <Users className="h-4 w-4 text-theme-primary flex-shrink-0" />
                          ) : (
                            <Lock className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          )}
                        </CardTitle>
                        <CardDescription className="text-slate-300 mt-2 text-sm sm:text-base line-clamp-2">
                          {program.description}
                        </CardDescription>
                      </div>
                      <Badge
                        className={`${getDifficultyColor(program.difficulty_level)} text-white flex-shrink-0 text-xs`}
                      >
                        {program.difficulty_level}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs sm:text-sm text-slate-300">
                        <span>{program.duration_weeks} weeks</span>
                        <span>{getDayCount(program)} days</span>
                        <span>{getExerciseCount(program)} exercises</span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <Button
                          asChild
                          size="sm"
                          className="bg-theme-primary hover:bg-theme-secondary text-white flex-1 text-xs sm:text-sm"
                        >
                          <Link href={`/workout/${program.id}`}>Start Workout</Link>
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent flex-1 sm:flex-none"
                          >
                            <Link href={`/programs/edit/${program.id}`}>
                              <Edit className="h-3 w-3 mr-1 sm:mr-0" />
                              <span className="sm:hidden">Edit</span>
                            </Link>
                          </Button>
                          <DeleteProgramButton programId={program.id} programName={program.name} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6 sm:p-8 text-center">
                <Dumbbell className="h-12 sm:h-16 w-12 sm:w-16 text-slate-500 mx-auto mb-3 sm:mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No Programs Yet</h3>
                <p className="text-slate-300 mb-4 text-sm sm:text-base">
                  Create your first custom workout program to get started
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button asChild className="bg-theme-primary hover:bg-theme-secondary text-white w-full sm:w-auto">
                    <Link href="/programs/create">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Program
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="border-theme-primary text-theme-primary hover:bg-theme-primary hover:text-white bg-transparent w-full sm:w-auto"
                  >
                    <Link href="/programs/generate">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Use AI Generator
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Public Programs */}
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Public Programs</h2>
            <Badge variant="outline" className="border-slate-600 text-slate-300 self-start sm:self-auto">
              {publicPrograms.length} programs
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {publicPrograms.map((program) => (
              <Card key={program.id} className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-3 sm:pb-6">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-white flex items-center gap-2 text-lg sm:text-xl">
                        <span className="truncate">{program.name}</span>
                        <Users className="h-4 w-4 text-theme-primary flex-shrink-0" />
                      </CardTitle>
                      <CardDescription className="text-slate-300 mt-2 text-sm sm:text-base line-clamp-2">
                        {program.description}
                      </CardDescription>
                    </div>
                    <Badge
                      className={`${getDifficultyColor(program.difficulty_level)} text-white flex-shrink-0 text-xs`}
                    >
                      {program.difficulty_level}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs sm:text-sm text-slate-300">
                      <span>{program.duration_weeks} weeks</span>
                      <span>{getDayCount(program)} days</span>
                      <span>{getExerciseCount(program)} exercises</span>
                    </div>

                    <Button asChild className="w-full bg-theme-primary hover:bg-theme-secondary text-white text-sm">
                      <Link href={`/workout/${program.id}`}>Start Workout</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
