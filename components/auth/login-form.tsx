"use client"

import { T, useI18n } from "@/lib/i18n/context"


import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { signIn } from "@/lib/actions"
import { Dumbbell, Loader2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function LoginForm() {
  const { t } = useI18n()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)

    console.log("[v0] Login attempt started")

    try {
      const result = await signIn(formData)
      console.log("[v0] Login result:", result)

      if (result && !result.success) {
        const errorMessage = result.error || "Invalid email or password. Please try again."
        setError(errorMessage)
        toast({
          title: t("Login Failed"),
          description: t(errorMessage),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Login error:", error)
      // Don't show error for redirect (NEXT_REDIRECT)
      if (error && typeof error === "object" && "digest" in error) {
        return // This is a redirect, not an error
      }
      const errorMessage = "An unexpected error occurred. Please try again."
      setError(errorMessage)
      toast({
        title: t("Login Failed"),
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      console.log("[v0] Login attempt completed")
    }
  }

  return (
    <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Dumbbell className="h-12 w-12 text-theme-primary" />
        </div>
        <CardTitle className="text-2xl font-bold text-white"><T text={"Welcome Back"} /></CardTitle>
        <CardDescription className="text-slate-300"><T text={"Sign in to continue your fitness journey"} /></CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-200">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm"><T>{error}</T></span>
          </div>
        )}

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-200"><T text={"Email"} /></Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t("your@email.com")}
              required
              disabled={isLoading}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 disabled:opacity-50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-200"><T text={"Password"} /></Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              disabled={isLoading}
              className="bg-slate-700 border-slate-600 text-white disabled:opacity-50"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-theme-primary hover:bg-theme-secondary text-white transition-all duration-200"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /><T text={"Signing in..."} /></>
            ) : (
              <T text={"Sign In"} />
            )}
          </Button>
        </form>
        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <Link href="/" className="text-sm text-slate-400 hover:text-white"><T text={"Back to home"} /></Link>
          <p className="text-slate-300"><T text={"Don't have an account?"} />{" "}
            <Link href="/auth/signup" className="text-theme-primary hover:text-theme-secondary font-medium"><T text={"Sign up"} /></Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
