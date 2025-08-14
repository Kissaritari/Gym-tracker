import { Suspense } from "react"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { SessionTracker } from "@/components/sessions/session-tracker"

export default async function SessionsPage() {
  const supabase = createServerComponentClient({ cookies })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="container mx-auto px-4 py-8">
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
  )
}
