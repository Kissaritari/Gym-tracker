import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const requestedNext = url.searchParams.get("next") || "/"
  // URL parsing also catches protocol-relative URLs and backslash variants.
  let destination = new URL("/", url.origin)
  try {
    const candidate = new URL(requestedNext, url.origin)
    if (requestedNext.startsWith("/") && candidate.origin === url.origin) destination = candidate
  } catch { /* Invalid destinations return to the homepage. */ }
  if (!code) return NextResponse.redirect(new URL("/auth/auth-code-error?reason=missing_code", url.origin))

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return NextResponse.redirect(new URL(`/auth/auth-code-error?reason=${encodeURIComponent(error.message)}`, url.origin))
  return NextResponse.redirect(destination)
}
