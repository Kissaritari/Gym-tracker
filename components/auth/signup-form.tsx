"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { signUp } from "@/lib/actions"
import { Dumbbell, Loader2, ArrowLeft } from "lucide-react"

export default function SignUpForm() {
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    try {
      await signUp(formData)
    } catch (error) {
      console.error("Sign up error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
      <CardHeader className="text-center">
        <div className="flex items-center justify-between mb-4">
          <Link href="/auth/login">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex-1 flex justify-center">
            <Dumbbell className="h-12 w-12 text-theme-primary" />
          </div>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>
        <CardTitle className="text-2xl font-bold text-white">Join FitTracker</CardTitle>
        <CardDescription className="text-slate-300">Create your account to start your fitness journey</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-200">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="your@email.com"
              required
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-200">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-theme-primary hover:bg-theme-secondary text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-slate-300">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-theme-primary hover:text-theme-secondary font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
