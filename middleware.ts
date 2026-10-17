import { NextResponse } from "next/server"

export async function middleware() {
  // Simple middleware - auth is checked in individual pages using getSession()
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
