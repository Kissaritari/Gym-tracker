"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

type Log = {
  id: string
  reps_completed: number[] | null
  weight_used: number[] | null
  exercise: { name: string } | null
}

export function SessionDetails({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState<Log[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  async function load() {
    setLoading(true); setError(false)
    try {
      const result = await createClient().from("exercise_logs")
        .select("id, reps_completed, weight_used, exercise:exercises(name)")
        .eq("session_id", sessionId).order("created_at")
      if (result.error) throw result.error
      setLogs(result.data as unknown as Log[])
    } catch { setError(true) }
    finally { setLoading(false) }
  }
  return <div className="w-full">
    <Button variant="outline" size="sm" aria-expanded={open} aria-controls={`session-${sessionId}`} onClick={() => {
      setOpen(!open)
      if (!open && logs === null && !loading) void load()
    }}>{open ? "Hide details" : "View details"}</Button>
    {open && <div id={`session-${sessionId}`} className="mt-4 space-y-4">
      {loading && <p role="status">Loading saved sets...</p>}
      {error && <div role="alert">Could not load saved sets. <Button variant="outline" size="sm" onClick={load}>Retry</Button></div>}
      {!loading && !error && logs?.length === 0 && <p>No exercises were logged for this workout.</p>}
      {!error && logs?.map((log) => <div key={log.id} className="rounded-lg border p-4">
        <h4 className="font-medium">{log.exercise?.name || "Exercise"}</h4>
        <table className="mt-2 w-full text-left text-sm"><caption className="sr-only">Saved sets for {log.exercise?.name || "exercise"}</caption>
          <thead><tr><th scope="col">Set</th><th scope="col">Reps</th><th scope="col">Weight</th></tr></thead>
          <tbody>{(log.reps_completed || []).map((reps, index) => <tr key={index}><td>{index + 1}</td><td>{reps}</td><td>{log.weight_used?.[index] ?? "—"}</td></tr>)}</tbody>
        </table>
      </div>)}
    </div>}
  </div>
}
