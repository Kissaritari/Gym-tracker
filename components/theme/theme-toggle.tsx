"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "@/lib/theme-context"
import { Moon, Sun, Palette, Check } from "lucide-react"

const colorThemes = [
  { name: "orange", label: "Orange", color: "bg-orange-500" },
  { name: "blue", label: "Blue", color: "bg-blue-500" },
  { name: "green", label: "Green", color: "bg-green-500" },
  { name: "purple", label: "Purple", color: "bg-purple-500" },
  { name: "red", label: "Red", color: "bg-red-500" },
] as const

export function ThemeToggle() {
  const { theme, colorTheme, setTheme, setColorTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="border-slate-600 bg-transparent">
          <Palette className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-slate-800 border-slate-700">
        <DropdownMenuLabel className="text-slate-200">Theme Settings</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-700" />

        {/* Light/Dark Toggle */}
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700"
        >
          <Sun className="h-4 w-4 mr-2" />
          Light
          {theme === "light" && <Check className="h-4 w-4 ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700"
        >
          <Moon className="h-4 w-4 mr-2" />
          Dark
          {theme === "dark" && <Check className="h-4 w-4 ml-auto" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-slate-700" />
        <DropdownMenuLabel className="text-slate-200">Color Theme</DropdownMenuLabel>

        {/* Color Themes */}
        {colorThemes.map((ct) => (
          <DropdownMenuItem
            key={ct.name}
            onClick={() => setColorTheme(ct.name)}
            className="text-slate-200 hover:bg-slate-700 focus:bg-slate-700"
          >
            <div className={`h-4 w-4 rounded-full mr-2 ${ct.color}`} />
            {ct.label}
            {colorTheme === ct.name && <Check className="h-4 w-4 ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
