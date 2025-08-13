import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
        <CardHeader className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold text-white">Authentication Error</CardTitle>
          <CardDescription className="text-slate-300">
            There was an error with your authentication. Please try signing in again.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button asChild className="bg-theme-primary hover:bg-theme-secondary text-white">
            <Link href="/auth/login">Back to Sign In</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
