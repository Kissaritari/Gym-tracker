"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { signIn } from "@/lib/actions"
import { Dumbbell, Loader2 } from "lucide-react"

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    try {
      await signIn(formData)
    } catch (error) {
      console.error("Login error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Dumbbell className="h-12 w-12 text-theme-primary" />
        </div>
        <CardTitle className="text-2xl font-bold text-white">Welcome Back</CardTitle>
        <CardDescription className="text-slate-300">Sign in to continue your fitness journey</CardDescription>
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
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-slate-300">
            Don't have an account?{" "}
            <Link href="/auth/signup" className="text-theme-primary hover:text-theme-secondary font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
