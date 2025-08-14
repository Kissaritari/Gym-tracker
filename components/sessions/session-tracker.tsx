"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, CheckCircle, Clock, Calendar, TrendingUp, Activity, Target, Timer, BarChart3 } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { formatDistanceToNow, format } from "date-fns"

interface SessionTrackerProps {
  userId: string
}

interface WorkoutSession {
  id: string
  workout_plan_id: string
  started_at: string
  completed_at: string | null
  notes: string | null
  workout_plan: {
    name: string
    difficulty_level: string
  }
  exercise_logs: Array<{
    id: string
    exercise: {
      name: string
    }
    sets_completed: number
    reps_completed: number[]
    weight_used: number[]
  }>
}

interface SessionStats {
  totalSessions: number
  completedSessions: number
  totalWorkoutTime: number
  averageSessionTime: number
  currentStreak: number
  thisWeekSessions: number
}

export function SessionTracker({ userId }: SessionTrackerProps) {
  const [activeSessions, setActiveSessions] = useState<WorkoutSession[]>([])
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([])
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    fetchSessions()
    fetchSessionStats()
  }, [userId])

  const fetchSessions = async () => {
    try {
      // Fetch active sessions (not completed)
      const { data: activeData, error: activeError } = await supabase
        .from("workout_sessions")
        .select(`
          *,
          workout_plan:workout_plans(name, difficulty_level),
          exercise_logs(
            id,
            exercise:exercises(name),
            sets_completed,
            reps_completed,
            weight_used
          )
        `)
        .eq("user_id", userId)
        .is("completed_at", null)
        .order("started_at", { ascending: false })

      if (activeError) throw activeError
      setActiveSessions(activeData || [])

      // Fetch recent completed sessions
      const { data: recentData, error: recentError } = await supabase
        .from("workout_sessions")
        .select(`
          *,
          workout_plan:workout_plans(name, difficulty_level),
          exercise_logs(
            id,
            exercise:exercises(name),
            sets_completed,
            reps_completed,
            weight_used
          )
        `)
        .eq("user_id", userId)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(10)

      if (recentError) throw recentError
      setRecentSessions(recentData || [])
    } catch (error) {
      console.error("Error fetching sessions:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSessionStats = async () => {
    try {
      const { data: sessions, error } = await supabase
        .from("workout_sessions")
        .select("started_at, completed_at")
        .eq("user_id", userId)

      if (error) throw error

      const totalSessions = sessions.length
      const completedSessions = sessions.filter((s) => s.completed_at).length

      // Calculate total workout time
      const completedSessionsWithTime = sessions.filter((s) => s.completed_at && s.started_at)
      const totalWorkoutTime = completedSessionsWithTime.reduce((total, session) => {
        const start = new Date(session.started_at)
        const end = new Date(session.completed_at!)
        return total + (end.getTime() - start.getTime())
      }, 0)

      const averageSessionTime =
        completedSessionsWithTime.length > 0 ? totalWorkoutTime / completedSessionsWithTime.length : 0

      // Calculate current streak
      const sortedSessions = sessions
        .filter((s) => s.completed_at)
        .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())

      let currentStreak = 0
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (const session of sortedSessions) {
        const sessionDate = new Date(session.completed_at!)
        sessionDate.setHours(0, 0, 0, 0)

        const daysDiff = Math.floor((today.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24))

        if (daysDiff <= currentStreak + 1) {
          currentStreak++
        } else {
          break
        }
      }

      // Calculate this week's sessions
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)

      const thisWeekSessions = sessions.filter((s) => {
        const sessionDate = new Date(s.started_at)
        return sessionDate >= weekStart
      }).length

      setSessionStats({
        totalSessions,
        completedSessions,
        totalWorkoutTime,
        averageSessionTime,
        currentStreak,
        thisWeekSessions,
      })
    } catch (error) {
      console.error("Error fetching session stats:", error)
    }
  }

  const resumeSession = async (sessionId: string) => {
    // Navigate to the workout session
    const session = activeSessions.find((s) => s.id === sessionId)
    if (session) {
      window.location.href = `/workout/${session.workout_plan_id}?sessionId=${sessionId}`
    }
  }

  const formatDuration = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`
    }
    return `${remainingMinutes}m`
  }

  const getSessionDuration = (session: WorkoutSession) => {
    const start = new Date(session.started_at)
    const end = session.completed_at ? new Date(session.completed_at) : new Date()
    return end.getTime() - start.getTime()
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

  if (loading) {
    return <div>Loading session data...</div>
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {sessionStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Sessions</p>
                  <p className="text-2xl font-bold text-theme-primary">{sessionStats.totalSessions}</p>
                </div>
                <Activity className="h-8 w-8 text-theme-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-theme-primary">{sessionStats.completedSessions}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-theme-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                  <p className="text-2xl font-bold text-theme-primary">{sessionStats.currentStreak}</p>
                </div>
                <Target className="h-8 w-8 text-theme-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-2xl font-bold text-theme-primary">{sessionStats.thisWeekSessions}</p>
                </div>
                <Calendar className="h-8 w-8 text-theme-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active Sessions</TabsTrigger>
          <TabsTrigger value="recent">Recent Sessions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeSessions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Timer className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Sessions</h3>
                <p className="text-muted-foreground mb-4">Start a new workout to begin tracking your session.</p>
                <Button asChild className="bg-theme-primary hover:bg-theme-primary/90">
                  <Link href="/dashboard">
                    <Play className="mr-2 h-4 w-4" />
                    Start Workout
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            activeSessions.map((session) => (
              <Card key={session.id} className="border-l-4 border-l-theme-primary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {session.workout_plan.name}
                        <Badge
                          className={`${getDifficultyColor(session.workout_plan.difficulty_level)} text-white text-xs`}
                        >
                          {session.workout_plan.difficulty_level}
                        </Badge>
                      </CardTitle>
                      <CardDescription>Started {formatDistanceToNow(new Date(session.started_at))} ago</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-theme-primary border-theme-primary">
                        <Clock className="mr-1 h-3 w-3" />
                        {formatDuration(getSessionDuration(session))}
                      </Badge>
                      <Button
                        onClick={() => resumeSession(session.id)}
                        size="sm"
                        className="bg-theme-primary hover:bg-theme-primary/90"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Resume
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Exercises completed: {session.exercise_logs.length}</span>
                    <span>Session ID: {session.id.slice(0, 8)}...</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          {recentSessions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Recent Sessions</h3>
                <p className="text-muted-foreground">Complete your first workout to see session history here.</p>
              </CardContent>
            </Card>
          ) : (
            recentSessions.map((session) => (
              <Card key={session.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {session.workout_plan.name}
                        <Badge
                          className={`${getDifficultyColor(session.workout_plan.difficulty_level)} text-white text-xs`}
                        >
                          {session.workout_plan.difficulty_level}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Completed on {format(new Date(session.completed_at!), "MMM d, yyyy 'at' h:mm a")}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Duration</div>
                      <div className="text-lg font-semibold text-theme-primary">
                        {formatDuration(getSessionDuration(session))}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Exercises:</span>
                      <span className="ml-2 font-medium">{session.exercise_logs.length}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Sets:</span>
                      <span className="ml-2 font-medium">
                        {session.exercise_logs.reduce((total, log) => total + (log.sets_completed || 0), 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Reps:</span>
                      <span className="ml-2 font-medium">
                        {session.exercise_logs.reduce(
                          (total, log) => total + (log.reps_completed?.reduce((sum, reps) => sum + reps, 0) || 0),
                          0,
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="outline" className="ml-2 text-green-600 border-green-600">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Complete
                      </Badge>
                    </div>
                  </div>
                  {session.notes && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Notes: {session.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {sessionStats && (
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-theme-primary" />
                    Workout Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Completion Rate</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Completed Sessions</span>
                          <span>
                            {sessionStats.completedSessions}/{sessionStats.totalSessions}
                          </span>
                        </div>
                        <Progress
                          value={
                            sessionStats.totalSessions > 0
                              ? (sessionStats.completedSessions / sessionStats.totalSessions) * 100
                              : 0
                          }
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground">
                          {sessionStats.totalSessions > 0
                            ? Math.round((sessionStats.completedSessions / sessionStats.totalSessions) * 100)
                            : 0}
                          % completion rate
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Average Session Time</h4>
                      <div className="text-3xl font-bold text-theme-primary mb-2">
                        {formatDuration(sessionStats.averageSessionTime)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Based on {sessionStats.completedSessions} completed sessions
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Total Workout Time</h4>
                      <div className="text-3xl font-bold text-theme-primary mb-2">
                        {formatDuration(sessionStats.totalWorkoutTime)}
                      </div>
                      <p className="text-sm text-muted-foreground">Time spent working out</p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Weekly Activity</h4>
                      <div className="text-3xl font-bold text-theme-primary mb-2">{sessionStats.thisWeekSessions}</div>
                      <p className="text-sm text-muted-foreground">Sessions this week</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
