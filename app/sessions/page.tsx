import { Suspense } from "react"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SessionTracker } from "@/components/sessions/session-tracker"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default async function SessionsPage() {
  const user = await getSession()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" asChild className="mb-6 text-slate-300 hover:text-white">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-theme-primary mb-2">Session Tracking</h1>
          <p className="text-muted-foreground">
            Monitor your workout sessions, track progress, and analyze your training patterns.
          </p>
        </div>

        <Suspense fallback={<div>Loading sessions...</div>}>
          <SessionTracker userId={user.id} />
        </Suspense>
      </div>
    </div>
  )
}
