import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Home, Search } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-700">
        <CardHeader className="text-center">
          <Search className="h-12 w-12 text-slate-500 mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold text-white">Page Not Found</CardTitle>
          <CardDescription className="text-slate-300">
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button asChild className="bg-theme-primary hover:bg-theme-secondary text-white">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
