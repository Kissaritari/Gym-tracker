import { getSession } from "@/lib/auth"
import { sql } from "@/lib/db"
import { redirect } from "next/navigation"
import { ProgramForm } from "@/components/programs/program-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Dumbbell } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme/theme-toggle"

export default async function CreateProgramPage() {
  const user = await getSession()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch all exercises for the form using Neon SQL
  const exercises = await sql`SELECT * FROM exercises ORDER BY name`

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild className="text-slate-300 hover:text-white">
                <Link href="/programs">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Programs
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <Dumbbell className="h-8 w-8 text-theme-primary" />
                <h1 className="text-2xl font-bold text-white">Create Program</h1>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <ProgramForm exercises={exercises || []} userId={user.id} />
      </div>
    </div>
  )
}
