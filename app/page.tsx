"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { TrainingSession, type TrainingProgram } from "@/components/workout/training-session"
import { Activity, ArrowRight, Bot, Check, ChevronRight, CircleUserRound, Clock3, Dumbbell, LogOut, Plus, Sparkles, Target, TrendingUp, X } from "lucide-react"

type Program = TrainingProgram
type Session = { id: string; workout_plan_id: string; started_at: string; completed_at: string | null; notes: string | null }

const promptTemplate = `Create a progressive workout program for me.\n\nGoal: [strength / muscle / fat loss / general fitness]\nExperience: [beginner / intermediate / advanced]\nDays per week: [number]\nEquipment: [home / full gym / list equipment]\nSession length: [minutes]\nLimitations or preferences: [details]\n\nReturn a 4-week plan with exercise names, sets, reps, rest, warm-ups, and progression notes.`

function Spinner() { return <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-label="Loading" /> }

export default function HomePage() {
  const supabase = useMemo(() => { try { return createClient() } catch { return null } }, [])
  const [user, setUser] = useState<any>(null)
  const [authMode, setAuthMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authLoading, setAuthLoading] = useState(false)
  const [authMessage, setAuthMessage] = useState("")
  const [tab, setTab] = useState<"overview" | "programs" | "sessions" | "ai">("overview")
  const [programs, setPrograms] = useState<Program[]>([])
  const [sessionHistory, setSessionHistory] = useState<Session[]>([])
  const sessions = sessionHistory.filter((session) => session.completed_at).length
  const [initialDay, setInitialDay] = useState<number | undefined>()
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  const [exerciseCatalog, setExerciseCatalog] = useState<Array<{ id: string; name: string }>>([])
  const [chosenExercises, setChosenExercises] = useState<string[]>([])
  const [savingProgram, setSavingProgram] = useState(false)
  const [programError, setProgramError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => listener.subscription.unsubscribe()
  }, [supabase])

  async function loadTrainingData() {
    if (!supabase || !user) return
    setDataLoading(true); setDataError(null)
    try {
      const [plans, history, catalog] = await Promise.all([
        supabase.from("workout_plans").select("id, name, description, difficulty_level, duration_weeks, is_public").or(`is_public.eq.true,created_by.eq.${user.id}`).order("created_at", { ascending: false }),
        supabase.from("workout_sessions").select("id, workout_plan_id, started_at, completed_at, notes").eq("user_id", user.id).order("started_at", { ascending: false }),
        supabase.from("exercises").select("id, name").order("name"),
      ])
      if (plans.error || history.error || catalog.error) throw plans.error || history.error || catalog.error
      setPrograms(plans.data || []); setSessionHistory(history.data || []); setExerciseCatalog(catalog.data || [])
    } catch { setDataError("Could not load your training data. Please retry.") }
    finally { setDataLoading(false) }
  }

  useEffect(() => {
    if (user) void loadTrainingData()
    else { setPrograms([]); setSessionHistory([]); setSelectedProgram(null) }
  }, [user?.id, supabase])

  function startProgram(program: Program, day?: number) { setInitialDay(day); setSelectedProgram(program); setTab("sessions") }
  function finishWorkout() { setSelectedProgram(null); void loadTrainingData() }

  async function submitAuth(event: React.FormEvent) {
    event.preventDefault(); if (!supabase) { setAuthMessage("Supabase is not configured. Add the project URL and public key to start using the app."); return }; setAuthLoading(true); setAuthMessage("")
    const result = authMode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback` } })
    setAuthLoading(false)
    if (result.error) setAuthMessage("We could not complete that request. Check your details and try again.")
    else if (authMode === "signup" && !result.data.session) setAuthMessage("Check your inbox to confirm your account, then sign in.")
  }

  async function addProgram(event: React.FormEvent) {
    event.preventDefault()
    if (!supabase || !user || !newName.trim() || savingProgram) return
    if (!chosenExercises.length) { setProgramError("Select at least one exercise for your program."); return }
    setSavingProgram(true); setProgramError(null)
    try {
      const result = await supabase.from("workout_plans").insert({ name: newName.trim(), description: newDescription || "Your custom training plan.", difficulty_level: "beginner", duration_weeks: 4, created_by: user.id, is_public: false }).select("id, name, description, difficulty_level, duration_weeks, is_public").single()
      if (result.error) throw result.error
      const links = await supabase.from("workout_plan_exercises").insert(chosenExercises.map((id, index) => ({ workout_plan_id: result.data.id, exercise_id: id, day_number: 1, sets: 3, reps: "8-12", rest_seconds: 60, order_in_day: index + 1 })))
      if (links.error) {
        await supabase.from("workout_plans").delete().eq("id", result.data.id).eq("created_by", user.id)
        throw links.error
      }
      setChosenExercises([])
      setPrograms((current) => [result.data, ...current]); setNewName(""); setNewDescription(""); setShowCreate(false); setTab("programs")
    } catch { setProgramError("Could not save this program. Please try again.") }
    finally { setSavingProgram(false) }
  }

  async function signOut() { if (!supabase) return; const result = await supabase.auth.signOut(); if (!result.error) setUser(null) }
  function copyPrompt() { navigator.clipboard.writeText(promptTemplate); setCopied(true); setTimeout(() => setCopied(false), 1800) }

  if (!user) return <main className="min-h-screen bg-background text-foreground"><div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-between px-6 py-8 lg:px-10"><header className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Dumbbell /></div><span className="font-mono text-sm font-bold tracking-[0.22em]">FORM / ONE</span></div><span className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Training intelligence</span></header><div className="grid items-center gap-16 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24"><section><Badge variant="outline" className="mb-6 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em]"><span className="mr-2 size-1.5 rounded-full bg-primary" />Personal training, simplified</Badge><h1 className="max-w-2xl text-5xl font-semibold leading-[0.98] tracking-[-0.06em] sm:text-7xl">Train with a plan. <span className="text-primary">Keep the proof.</span></h1><p className="mt-7 max-w-lg text-lg leading-relaxed text-muted-foreground">One focused space to find a program, build your own, and turn every session into momentum.</p><div className="mt-10 flex flex-wrap gap-3"><Button size="lg" onClick={() => { setAuthMode("signup"); document.getElementById("auth")?.scrollIntoView({ behavior: "smooth" }) }}>Start training <ArrowRight data-icon="inline-end" /></Button><Button size="lg" variant="outline" onClick={() => document.getElementById("auth")?.scrollIntoView({ behavior: "smooth" })}>Sign in</Button></div><div className="mt-14 grid max-w-lg grid-cols-3 gap-5 border-t pt-6"><div><p className="font-mono text-2xl">01</p><p className="mt-1 text-xs text-muted-foreground">Pick a direction</p></div><div><p className="font-mono text-2xl">02</p><p className="mt-1 text-xs text-muted-foreground">Log the work</p></div><div><p className="font-mono text-2xl">03</p><p className="mt-1 text-xs text-muted-foreground">See the trend</p></div></div></section><section id="auth" className="rounded-3xl border bg-card p-7 shadow-2xl shadow-primary/5 sm:p-9"><div className="mb-8"><p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">{authMode === "login" ? "Welcome back" : "Create account"}</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">{authMode === "login" ? "Ready for your next set?" : "Start your training log."}</h2></div><form onSubmit={submitAuth} className="flex flex-col gap-4"><label className="grid gap-2 text-sm font-medium">Email<Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required /></label><label className="grid gap-2 text-sm font-medium">Password<Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" minLength={6} required /></label>{authMessage && <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">{authMessage}</p>}<Button type="submit" size="lg" disabled={authLoading}>{authLoading ? <><Spinner /> Working...</> : authMode === "login" ? "Sign in" : "Create account"}</Button></form><button className="mt-6 w-full text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthMessage("") }}>{authMode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}</button></section></div></div></main>

  return <main className="min-h-screen bg-background text-foreground"><aside className="fixed inset-y-0 hidden w-64 border-r bg-card/60 p-6 lg:flex lg:flex-col"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Dumbbell /></div><span className="font-mono text-sm font-bold tracking-[0.2em]">FORM / ONE</span></div><nav className="mt-14 flex flex-col gap-2">{(["overview", "programs", "sessions", "ai"] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={`flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm capitalize transition-colors ${tab === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{item === "ai" ? "AI builder" : item}<ChevronRight className="size-4" /></button>)}</nav><div className="mt-auto border-t pt-5"><div className="mb-4 flex items-center gap-3"><CircleUserRound className="size-8 text-primary" /><div className="min-w-0"><p className="truncate text-sm font-medium">{user.email}</p><p className="text-xs text-muted-foreground">Athlete account</p></div></div><button onClick={signOut} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><LogOut className="size-4" /> Sign out</button></div></aside><div className="lg:pl-64"><header className="flex items-center justify-between border-b px-6 py-5 lg:px-10"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", timeZone: "Europe/Helsinki" }).format(new Date())}</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Good to see you back.</h1></div><Button variant="outline" size="sm" onClick={signOut}><LogOut data-icon="inline-start" /> Sign out</Button></header><div className="border-b px-6 py-3 lg:hidden"><div className="flex gap-2 overflow-x-auto">{(["overview", "programs", "sessions", "ai"] as const).map((item) => <Button key={item} size="sm" variant={tab === item ? "default" : "ghost"} onClick={() => setTab(item)} className="capitalize">{item === "ai" ? "AI builder" : item}</Button>)}</div></div><section className="mx-auto max-w-7xl px-6 py-8 lg:px-10">{dataLoading && <p role="status" className="mb-4 text-muted-foreground">Loading training data...</p>}{dataError && <div role="alert" className="mb-4 rounded-xl border p-4">{dataError}<Button variant="outline" className="ml-3" onClick={loadTrainingData}>Retry</Button></div>}{tab === "overview" && <><div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Your training system</p><h2 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">Make today count.</h2></div><Button onClick={() => setTab("programs")}><Activity data-icon="inline-start" /> Start a workout</Button></div><div className="grid gap-4 md:grid-cols-3"><Stat label="Sessions logged" value={sessions.toString()} detail="completed workouts" icon={Check} /><Stat label="Active workouts" value={sessionHistory.filter((session) => !session.completed_at).length.toString()} detail="ready to resume" icon={TrendingUp} /><Stat label="Programs" value={programs.length.toString()} detail="available to train" icon={Target} /></div><div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"><div className="rounded-2xl border bg-card p-6"><p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Your training log</p><h3 className="mt-2 text-xl font-semibold">Keep the proof.</h3><p className="mt-6 text-muted-foreground">{sessions ? `${sessions} completed workouts saved to your account.` : "Start your first workout to build your training history."}</p><Button className="mt-6" variant="outline" onClick={() => setTab("sessions")}>View sessions</Button></div><div className="rounded-2xl bg-primary p-6 text-primary-foreground"><Sparkles className="size-6" /><p className="mt-10 font-mono text-xs uppercase tracking-[0.18em] opacity-70">Next best action</p><h3 className="mt-2 text-2xl font-semibold">Choose your next workout.</h3><p className="mt-3 text-sm leading-relaxed opacity-80">Pick a program, choose your day, and record your working sets.</p><Button className="mt-7 bg-primary-foreground text-primary hover:bg-primary-foreground/90" onClick={() => setTab("programs")}>Choose program <ArrowRight data-icon="inline-end" /></Button></div></div></>}{tab === "programs" && <Programs programs={programs} onCreate={() => { setProgramError(null); setShowCreate(true) }} onStart={startProgram} />}{tab === "sessions" && (selectedProgram ? <TrainingSession key={selectedProgram.id} program={selectedProgram} initialDay={initialDay} userId={user.id} onFinish={finishWorkout} onBack={() => { setSelectedProgram(null); setTab("programs"); void loadTrainingData() }} /> : <Sessions sessions={sessionHistory} programs={programs} onStart={startProgram} onChoose={() => setTab("programs")} />)}{tab === "ai" && <AIBuilder copied={copied} onCopy={copyPrompt} />}</section></div>{showCreate && <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-6 backdrop-blur-sm"><div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border bg-card p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">New program</p><h2 className="mt-2 text-2xl font-semibold">Build your own split.</h2></div><button aria-label="Close program form" disabled={savingProgram} onClick={() => setShowCreate(false)}><X className="size-5 text-muted-foreground" /></button></div><form onSubmit={addProgram} className="mt-6 flex flex-col gap-4"><label className="grid gap-2 text-sm font-medium">Program name<Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="My strength block" required /></label><label className="grid gap-2 text-sm font-medium">Description<Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="What are you working toward?" /></label>{programError && <p role="alert">{programError}</p>}<fieldset><legend className="mb-2 text-sm font-medium">Day 1 exercises</legend><p className="mb-3 text-xs text-muted-foreground">Select exercises for your workout. Each starts with 3 sets of 8?12 reps.</p><div className="max-h-48 overflow-y-auto space-y-2">{exerciseCatalog.map((exercise) => <label key={exercise.id} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={savingProgram} checked={chosenExercises.includes(exercise.id)} onChange={(event) => setChosenExercises((current) => event.target.checked ? [...current, exercise.id] : current.filter((id) => id !== exercise.id))} />{exercise.name}</label>)}</div>{!exerciseCatalog.length && <p className="text-sm text-muted-foreground">No exercises are available yet. Load the exercise library before creating a program.</p>}</fieldset><Button type="submit" disabled={savingProgram}>{savingProgram ? "Saving..." : "Save program"} <ArrowRight data-icon="inline-end" /></Button></form></div></div>}</main>
}

function Stat({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: any }) { return <div className="rounded-2xl border bg-card p-5"><div className="flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p><Icon className="size-4 text-primary" /></div><p className="mt-5 text-4xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-sm text-muted-foreground">{detail}</p></div> }
function Programs({ programs, onCreate, onStart }: { programs: Program[]; onCreate: () => void; onStart: (program: Program) => void }) { return <><div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Program library</p><h2 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">Choose your next block.</h2></div><Button onClick={onCreate}><Plus data-icon="inline-start" /> Custom program</Button></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{programs.map((program, index) => <article key={program.id} className="group flex min-h-64 flex-col rounded-2xl border bg-card p-6 transition-colors hover:border-primary/50"><div className="flex items-start justify-between"><span className="font-mono text-3xl text-muted-foreground/40">0{index + 1}</span><Badge variant={program.difficulty_level?.toLowerCase() === "advanced" ? "default" : "secondary"}>{program.difficulty_level}</Badge></div><div className="mt-auto"><h3 className="text-xl font-semibold">{program.name}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{program.description}</p><div className="mt-5 flex items-center justify-between border-t pt-4"><span className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="size-4" /> {program.duration_weeks} weeks</span><Button size="sm" variant="ghost" onClick={() => onStart(program)}>Start <ArrowRight data-icon="inline-end" /></Button></div></div></article>)}</div></> }
function Sessions({ sessions, programs, onStart, onChoose }: { sessions: Session[]; programs: Program[]; onStart: (program: Program, day?: number) => void; onChoose: () => void }) {
  return <><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Session tracker</p><h2 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">Record the work.</h2></div><Button onClick={onChoose}>Choose a workout</Button></div><div className="space-y-4">{sessions.length === 0 && <p className="rounded-2xl border bg-card p-6 text-muted-foreground">No workouts yet. Choose a program to start your first session.</p>}{sessions.map((session) => {
    const program = programs.find((item) => item.id === session.workout_plan_id)
    return <article key={session.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-6"><div><h3 className="font-semibold">{program?.name || "Workout"}</h3><p className="mt-1 text-sm text-muted-foreground">{new Date(session.started_at).toLocaleString()}</p>{session.notes && <p className="mt-2 text-sm">{session.notes}</p>}</div>{session.completed_at ? <Badge>Completed</Badge> : program ? <Button onClick={() => onStart(program, Number(session.notes?.match(/^Day (\d+)/)?.[1]) || undefined)}>Resume workout</Button> : <Badge variant="secondary">In progress</Badge>}</article>
  })}</div></>
}
function AIBuilder({ copied, onCopy }: { copied: boolean; onCopy: () => void }) { return <><div className="mb-8 max-w-2xl"><p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">AI program builder</p><h2 className="mt-2 text-4xl font-semibold tracking-[-0.04em]">Start with a better brief.</h2><p className="mt-3 text-muted-foreground">Use the ready-made prompt below with your preferred AI tool. Add your details, paste, and get a program built around your actual week.</p></div><div className="grid gap-6 lg:grid-cols-[1fr_0.7fr]"><div className="rounded-2xl border bg-card p-6"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Bot /></div><div><h3 className="font-semibold">Program prompt</h3><p className="text-xs text-muted-foreground">Copy-ready template</p></div></div><Button size="sm" onClick={onCopy}>{copied ? <><Check data-icon="inline-start" /> Copied</> : "Copy prompt"}</Button></div><pre className="mt-6 whitespace-pre-wrap rounded-xl bg-muted p-5 font-mono text-sm leading-relaxed text-muted-foreground">{promptTemplate}</pre></div><div className="rounded-2xl bg-primary p-6 text-primary-foreground"><Sparkles className="size-6" /><h3 className="mt-8 text-2xl font-semibold">A smarter starting point.</h3><p className="mt-3 text-sm leading-relaxed opacity-80">The best program is the one you can repeat. Give the model your constraints, not just your goal.</p><div className="mt-8 flex flex-col gap-3 text-sm"><p className="flex items-center gap-2"><Check className="size-4" /> Include your available equipment</p><p className="flex items-center gap-2"><Check className="size-4" /> Mention old injuries or limits</p><p className="flex items-center gap-2"><Check className="size-4" /> Set a realistic weekly target</p></div></div></div></> }
