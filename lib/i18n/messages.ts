import { fi } from "./fi"

export type Locale = "en" | "fi"
export const localeTag = (locale: Locale) => locale === "fi" ? "fi-FI" : "en-GB"
export function translate(locale: Locale, message: string, values?: Record<string, string | number>): string {
  const leading = message.match(/^\s*/)?.[0] || ""
  const trailing = message.match(/\s*$/)?.[0] || ""
  const key = message.trim()
  const translated = locale === "fi" ? fi[key] ?? key : key
  return leading + translated.replace(/\{(\w+)\}/g, (token, name: string) => String(values?.[name] ?? token)) + trailing
}
