import { afterEach, describe, expect, it, vi } from "vitest"
import { getSupabaseConfig } from "./config"
import { authErrorMessage } from "./auth-errors"

afterEach(() => vi.unstubAllEnvs())
describe("authentication configuration", () => {
  it("accepts a publishable key without the legacy anon variable", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_example")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    expect(getSupabaseConfig()).toEqual({ url: "https://example.supabase.co", key: "sb_publishable_example" })
  })
  it("continues accepting legacy anon keys", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "legacy-key")
    expect(getSupabaseConfig().key).toBe("legacy-key")
  })
  it("reports missing deployment configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")
    expect(() => getSupabaseConfig()).toThrow("then rebuild the app")
  })
})

describe("authentication error feedback", () => {
  it.each([
    ["email_not_confirmed", "Confirm your email"],
    ["signup_disabled", "registration is disabled"],
    ["over_email_send_rate_limit", "Too many attempts"],
    ["invalid_credentials", "Invalid email or password"],
  ])("explains %s", (code, message) => {
    expect(authErrorMessage({ code })).toContain(message)
  })
  it("reports network errors without exposing raw server messages", () => {
    expect(authErrorMessage(new TypeError("Failed to fetch"))).toContain("Check your connection")
    expect(authErrorMessage({ message: "private backend detail" })).not.toContain("private backend detail")
  })
})
