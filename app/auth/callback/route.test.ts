import { beforeEach, describe, expect, it, vi } from "vitest"
import { GET } from "./route"

const { exchange } = vi.hoisted(() => ({ exchange: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { exchangeCodeForSession: exchange } }) }))
beforeEach(() => { exchange.mockReset(); exchange.mockResolvedValue({ error: null }) })

describe("Supabase confirmation callback", () => {
  it("returns a confirmed user to the Supabase homepage", async () => {
    const response = await GET(new Request("https://gym.example/auth/callback?code=valid"))
    expect(exchange).toHaveBeenCalledWith("valid")
    expect(response.headers.get("location")).toBe("https://gym.example/")
  })
  it.each(["//example.org", "/\\example.org", "https://example.org", "//gym.example@example.org", "http://["])("rejects unsafe redirect %s", async (next) => {
    const response = await GET(new Request(`https://gym.example/auth/callback?code=valid&next=${encodeURIComponent(next)}`))
    expect(response.headers.get("location")).toBe("https://gym.example/")
  })
  it("preserves a same-origin relative destination", async () => {
    const response = await GET(new Request("https://gym.example/auth/callback?code=valid&next=%2F%3Fwelcome%3D1"))
    expect(response.headers.get("location")).toBe("https://gym.example/?welcome=1")
  })
  it("does not redirect to the destination when code exchange fails", async () => {
    exchange.mockResolvedValue({ error: { message: "Expired code" } })
    const response = await GET(new Request("https://gym.example/auth/callback?code=expired"))
    expect(response.headers.get("location")).toContain("/auth/auth-code-error?")
  })
})
