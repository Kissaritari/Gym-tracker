import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProgramGeneratorForm } from "@/components/programs/program-generator-form"

export default async function GenerateProgramPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-theme-primary mb-2">AI Program Generator</h1>
        <p className="text-muted-foreground">
          Create a personalized workout program tailored to your goals, experience level, and preferences.
        </p>
      </div>

      <Suspense fallback={<div>Loading generator...</div>}>
        <ProgramGeneratorForm />
      </Suspense>
    </div>
  )
}
