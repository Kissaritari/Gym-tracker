import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/lib/theme-context"
import { PwaProvider } from "@/components/pwa-provider"
import { LanguageProvider, LanguageSelector } from "@/lib/i18n/context"

const geistSans = Geist({ subsets: ["latin"], variable: "--font-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  applicationName: "FORM / ONE",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "FORM / ONE" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  title: "FORM / ONE — Training intelligence",
  description: "Find a program, build your own, and keep the proof of every session.",
}

export const viewport: Viewport = { themeColor: "#1d211b", width: "device-width", initialScale: 1 }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`}><body className="font-sans antialiased"><LanguageProvider><ThemeProvider><LanguageSelector /><PwaProvider />{children}</ThemeProvider></LanguageProvider></body></html>
}
