"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function signUp(formData: FormData) {
  const supabase = createClient()

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      emailRedirectTo:
        process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    redirect("/error")
  }

  revalidatePath("/", "layout")
  redirect("/auth/verify")
}

export async function signIn(formData: FormData) {
  const supabase = createClient()

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect("/error")
  }

  revalidatePath("/", "layout")
  redirect("/dashboard")
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}
