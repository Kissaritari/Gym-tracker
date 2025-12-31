import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { signOut } from "@/lib/actions"
import { Dumbbell, LogOut, Play, Clock, Target } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme/theme-toggle"

export default async function DashboardPage() {
  const user = await getSession()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch workout plans using Neon SQL
  const workoutPlans = await sql`
    SELECT * FROM workout_plans 
    WHERE is_public = true 
    ORDER BY difficulty
  `

  // Fetch recent workout sessions
  const recentSessions = await sql`
    SELECT ws.*, wp.name as plan_name, wp.difficulty 
    FROM workout_sessions ws
    LEFT JOIN workout_plans wp ON ws.workout_plan_id = wp.id
    WHERE ws.user_id = ${user.id}
    ORDER BY ws.started_at DESC
    LIMIT 3
  `

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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Dumbbell className="h-8 w-8 text-theme-primary" />
              <h1 className="text-xl sm:text-2xl font-bold text-white">FitTracker</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-200 hover:bg-slate-700 bg-transparent text-xs sm:text-sm"
              >
                <Link href="/sessions">
                  <Clock className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Sessions</span>
                  <span className="xs:hidden">S</span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-200 hover:bg-slate-700 bg-transparent text-xs sm:text-sm"
              >
                <Link href="/programs">
                  <Dumbbell className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Programs</span>
                  <span className="xs:hidden">P</span>
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
        {/* Workout Plans */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Available Workout Plans</h2>
            <div className="grid gap-4 sm:gap-6">
              {workoutPlans?.map((plan: any) => (
                <Card key={plan.id} className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-3 sm:pb-6">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-white text-lg sm:text-xl">{plan.name}</CardTitle>
                        <CardDescription className="text-slate-300 mt-2 text-sm sm:text-base">
                          {plan.description}
                        </CardDescription>
                      </div>
                      <Badge className={`${getDifficultyColor(plan.difficulty)} text-white flex-shrink-0`}>
                        {plan.difficulty}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-4 text-slate-300">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm sm:text-base">{plan.duration_weeks} weeks</span>
                        </div>
                      </div>
                      <Button asChild className="bg-theme-primary hover:bg-theme-secondary text-white w-full sm:w-auto">
                        <Link href={`/workout/${plan.id}`}>
                          <Play className="h-4 w-4 mr-2" />
                          Start Workout
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {recentSessions?.length ? (
                recentSessions.map((session: any) => (
                  <Card key={session.id} className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-white text-sm sm:text-base flex-1 min-w-0">
                          {session.plan_name}
                        </h3>
                        <Badge className={`${getDifficultyColor(session.difficulty)} text-white text-xs flex-shrink-0`}>
                          {session.difficulty}
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300">
                        {new Date(session.started_at).toLocaleDateString()}
                      </p>
                      {session.completed_at && (
                        <div className="flex items-center gap-1 mt-2 text-green-400 text-xs sm:text-sm">
                          <Target className="h-3 w-3" />
                          Completed
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4 sm:p-6 text-center">
                    <Target className="h-8 sm:h-12 w-8 sm:w-12 text-slate-500 mx-auto mb-3 sm:mb-4" />
                    <p className="text-slate-300 text-sm sm:text-base">No workouts yet</p>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">
                      Start your first workout to see your progress here
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
