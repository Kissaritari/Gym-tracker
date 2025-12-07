import { cookies } from "next/headers"
import { sql } from "@/lib/db"
import bcrypt from "bcryptjs"

export interface User {
  id: string
  email: string
  full_name: string | null
  created_at: string
}

const SESSION_COOKIE = "gym_session"
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

// Simple session token generation
function generateSessionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

// Store sessions in memory (in production, use Redis or database)
const sessions = new Map<string, { userId: string; expiresAt: number }>()

export async function createUser(
  email: string,
  password: string,
  fullName?: string,
): Promise<{ user?: User; error?: string }> {
  try {
    // Check if user already exists
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`
    if (existing.length > 0) {
      return { error: "User with this email already exists" }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user
    const result = await sql`
      INSERT INTO users (email, password_hash, full_name)
      VALUES (${email}, ${passwordHash}, ${fullName || null})
      RETURNING id, email, full_name, created_at
    `

    if (result.length === 0) {
      return { error: "Failed to create user" }
    }

    const user = result[0] as User

    // Also create profile
    await sql`
      INSERT INTO profiles (id, full_name)
      VALUES (${user.id}, ${fullName || null})
    `

    return { user }
  } catch (error) {
    console.error("Error creating user:", error)
    return { error: "Failed to create user" }
  }
}

export async function verifyUser(email: string, password: string): Promise<{ user?: User; error?: string }> {
  try {
    const result = await sql`
      SELECT id, email, full_name, password_hash, created_at
      FROM users WHERE email = ${email}
    `

    if (result.length === 0) {
      return { error: "Invalid email or password" }
    }

    const userData = result[0]
    const isValid = await bcrypt.compare(password, userData.password_hash)

    if (!isValid) {
      return { error: "Invalid email or password" }
    }

    const user: User = {
      id: userData.id,
      email: userData.email,
      full_name: userData.full_name,
      created_at: userData.created_at,
    }

    return { user }
  } catch (error) {
    console.error("Error verifying user:", error)
    return { error: "Authentication failed" }
  }
}

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken()
  const expiresAt = Date.now() + SESSION_DURATION

  sessions.set(token, { userId, expiresAt })

  // Set cookie
  const cookieStore = cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(expiresAt),
    path: "/",
  })

  return token
}

export async function getSession(): Promise<User | null> {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get(SESSION_COOKIE)?.value

    if (!token) return null

    const session = sessions.get(token)
    if (!session) return null

    if (Date.now() > session.expiresAt) {
      sessions.delete(token)
      return null
    }

    // Get user from database
    const result = await sql`
      SELECT id, email, full_name, created_at
      FROM users WHERE id = ${session.userId}
    `

    if (result.length === 0) {
      sessions.delete(token)
      return null
    }

    return result[0] as User
  } catch (error) {
    console.error("Error getting session:", error)
    return null
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value

  if (token) {
    sessions.delete(token)
  }

  cookieStore.delete(SESSION_COOKIE)
}

// For use in client components - check if user is logged in
export async function getCurrentUser(): Promise<User | null> {
  return getSession()
}
