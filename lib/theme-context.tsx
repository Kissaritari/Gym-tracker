"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark"
type ColorTheme = "orange" | "blue" | "green" | "purple" | "red"

interface ThemeContextType {
  theme: Theme
  colorTheme: ColorTheme
  setTheme: (theme: Theme) => void
  setColorTheme: (colorTheme: ColorTheme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark")
  const [colorTheme, setColorTheme] = useState<ColorTheme>("orange")

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem("theme") as Theme
    const savedColorTheme = localStorage.getItem("colorTheme") as ColorTheme

    if (savedTheme) {
      setTheme(savedTheme)
    }
    if (savedColorTheme) {
      setColorTheme(savedColorTheme)
    }
  }, [])

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement

    // Remove all theme classes
    root.classList.remove("light", "dark")
    root.classList.remove("theme-orange", "theme-blue", "theme-green", "theme-purple", "theme-red")

    // Add current theme classes
    root.classList.add(theme)
    root.classList.add(`theme-${colorTheme}`)

    // Save to localStorage
    localStorage.setItem("theme", theme)
    localStorage.setItem("colorTheme", colorTheme)
  }, [theme, colorTheme])

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme)
  }

  const handleSetColorTheme = (newColorTheme: ColorTheme) => {
    setColorTheme(newColorTheme)
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colorTheme,
        setTheme: handleSetTheme,
        setColorTheme: handleSetColorTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
