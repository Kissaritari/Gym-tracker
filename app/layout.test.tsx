import { renderToString } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import RootLayout from "./layout"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { ThemeProvider } from "@/lib/theme-context"

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "font-sans" }),
  Geist_Mono: () => ({ variable: "font-mono" }),
}))

describe("legacy route theme context", () => {
  it("renders the theme toggle when its required provider is available", () => {
    expect(() => renderToString(<RootLayout><ThemeProvider><ThemeToggle /></ThemeProvider></RootLayout>)).not.toThrow()
  })

  it("renders a legacy route's theme toggle under the actual root layout", () => {
    expect(() => renderToString(<RootLayout><ThemeToggle /></RootLayout>)).not.toThrow()
  })
})
