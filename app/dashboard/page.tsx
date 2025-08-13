import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { signOut } from "@/lib/actions"
import { Dumbbell, LogOut, Play, Clock, Target } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme/theme-toggle"

export default async function DashboardPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch workout plans
  const { data: workoutPlans } = await supabase
    .from("workout_plans")
    .select("*")
    .eq("is_public", true)
    .order("difficulty_level")

  // Fetch recent workout sessions
  const { data: recentSessions } = await supabase
    .from("workout_sessions")
    .select(`
      *,
      workout_plans (name, difficulty_level)
    `)
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(3)

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
            <div className="flex items-center gap-3">
              <Dumbbell className="h-8 w-8 text-theme-primary" />
              <h1 className="text-2xl font-bold text-white">FitTracker</h1>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <span className="text-slate-300">Welcome, {user.email}</span>
              <form action={signOut}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-200 hover:bg-slate-700 bg-transparent"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Workout Plans */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-white mb-6">Available Workout Plans</h2>
            <div className="grid gap-6">
              {workoutPlans?.map((plan) => (
                <Card key={plan.id} className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-white">{plan.name}</CardTitle>
                        <CardDescription className="text-slate-300 mt-2">{plan.description}</CardDescription>
                      </div>
                      <Badge className={`${getDifficultyColor(plan.difficulty_level)} text-white`}>
                        {plan.difficulty_level}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-slate-300">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{plan.duration_weeks} weeks</span>
                        </div>
                      </div>
                      <Button asChild className="bg-theme-primary hover:bg-theme-secondary text-white">
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
            <h2 className="text-2xl font-bold text-white mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {recentSessions?.length ? (
                recentSessions.map((session) => (
                  <Card key={session.id} className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white">{session.workout_plans?.name}</h3>
                        <Badge
                          className={`${getDifficultyColor(session.workout_plans?.difficulty_level)} text-white text-xs`}
                        >
                          {session.workout_plans?.difficulty_level}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-300">{new Date(session.started_at).toLocaleDateString()}</p>
                      {session.completed_at && (
                        <div className="flex items-center gap-1 mt-2 text-green-400 text-sm">
                          <Target className="h-3 w-3" />
                          Completed
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-6 text-center">
                    <Target className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-300">No workouts yet</p>
                    <p className="text-sm text-slate-400 mt-1">Start your first workout to see your progress here</p>
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
