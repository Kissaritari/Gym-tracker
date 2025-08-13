import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Dumbbell, Target, TrendingUp, Users } from "lucide-react"

export default async function HomePage() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <Dumbbell className="h-16 w-16 text-theme-primary" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-6">FitTracker</h1>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Your personal gym companion. Track workouts, follow structured plans, and achieve your fitness goals with
            expert guidance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-theme-primary hover:bg-theme-secondary text-white">
              <Link href="/auth/signup">Get Started</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-slate-600 text-slate-200 hover:bg-slate-700 bg-transparent"
            >
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center p-6 bg-slate-800/50 rounded-lg border border-slate-700">
            <Target className="h-12 w-12 text-theme-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Structured Plans</h3>
            <p className="text-slate-300">Follow expertly designed workout plans tailored to your fitness level</p>
          </div>
          <div className="text-center p-6 bg-slate-800/50 rounded-lg border border-slate-700">
            <TrendingUp className="h-12 w-12 text-theme-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Track Progress</h3>
            <p className="text-slate-300">Monitor your performance and see your strength gains over time</p>
          </div>
          <div className="text-center p-6 bg-slate-800/50 rounded-lg border border-slate-700">
            <Users className="h-12 w-12 text-theme-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Expert Tips</h3>
            <p className="text-slate-300">Get real-time form tips and exercise guidance during your workouts</p>
          </div>
        </div>
      </div>
    </div>
  )
}
