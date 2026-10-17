"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

type InstallEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PwaProvider() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null)
  const [ios, setIos] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone
    setIos(!standalone && /iPad|iPhone|iPod/.test(navigator.userAgent))
    const connectivity = () => setOffline(!navigator.onLine)
    connectivity()
    const beforeInstall = (event: Event) => {
      event.preventDefault()
      if (!standalone) setInstallEvent(event as InstallEvent)
    }
    const installed = () => { setInstallEvent(null); setIos(false) }
    window.addEventListener("beforeinstallprompt", beforeInstall)
    window.addEventListener("appinstalled", installed)
    window.addEventListener("online", connectivity)
    window.addEventListener("offline", connectivity)
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch((error) => console.error("PWA registration failed", error))
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall)
      window.removeEventListener("appinstalled", installed)
      window.removeEventListener("online", connectivity)
      window.removeEventListener("offline", connectivity)
    }
  }, [])

  async function install() {
    if (!installEvent) return
    try {
      await installEvent.prompt()
      await installEvent.userChoice
    } finally {
      setInstallEvent(null)
    }
  }

  return <>
    {offline && <div role="status" className="border-b border-border bg-muted px-4 py-2 text-center text-sm">You’re offline. Reconnect to load programs and save workouts.</div>}
    {!dismissed && (installEvent || ios) && <aside aria-label="Install FORM / ONE" className="border-b border-border bg-card px-4 py-3 flex flex-wrap items-center justify-center gap-3 text-sm">
      <span>{ios ? "Install FORM / ONE: in Safari, tap Share, then Add to Home Screen." : "Keep FORM / ONE on your home screen."}</span>
      {installEvent && <Button size="sm" onClick={() => { void install().catch(console.error) }}>Install app</Button>}
      <Button size="sm" variant="ghost" onClick={() => setDismissed(true)} aria-label="Dismiss installation message">Not now</Button>
    </aside>}
  </>
}
