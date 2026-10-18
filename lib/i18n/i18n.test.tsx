// @vitest-environment jsdom
import { act, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LanguageProvider, LanguageSelector, LocalNumber, SessionNote, T, useI18n } from "./context"
import { translate } from "./messages"
import { fi } from "./fi"

let container: HTMLDivElement
let root: Root
function WorkoutDraft() {
  const [reps, setReps] = useState("8")
  const { t } = useI18n()
  return <><label><T text="Reps" /><input aria-label={t("Set {set} reps", { set: 1 })} value={reps} onChange={(event) => setReps(event.target.value)} /></label><input type="email" required aria-label={t("Email")} /><p><T text="Could not save this exercise. Your entered sets are still here; please retry." /></p><span data-testid="weight"><LocalNumber value={42.5} /></span><SessionNote value="Day 2: Completed 3/4 exercises" /></>
}
async function render() {
  await act(async () => root.render(<LanguageProvider><LanguageSelector /><WorkoutDraft /></LanguageProvider>))
}
async function language(value: string) {
  await act(async () => {
    const select = container.querySelector("select")!
    select.value = value
    select.dispatchEvent(new Event("change", { bubbles: true }))
  })
}
beforeEach(() => {
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  vi.restoreAllMocks()
})

describe("English and Finnish UI", () => {
  it("switches labels, errors, numbers and generated notes without losing entered sets", async () => {
    await render()
    const input = container.querySelector("input")!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "12")
      input.dispatchEvent(new Event("input", { bubbles: true }))
    })
    await language("fi")
    expect(input.value).toBe("12")
    expect(input.getAttribute("aria-label")).toBe("Sarjan 1 toistot")
    expect(container.textContent).toContain("Syöttämäsi sarjat ovat tallessa")
    expect(container.textContent).toContain("Päivä 2: 3/4 liikettä valmiina")
    expect(container.querySelector('[data-testid="weight"]')!.textContent).toBe("42,5")
    expect(document.documentElement.lang).toBe("fi")
    expect(localStorage.getItem("form-one-language")).toBe("fi")
    await language("en")
    expect(input.value).toBe("12")
    expect(input.getAttribute("aria-label")).toBe("Set 1 reps")
    expect(document.documentElement.lang).toBe("en")
  })

  it("restores Finnish after remounting", async () => {
    localStorage.setItem("form-one-language", "fi")
    await render()
    expect(container.querySelector("select")!.value).toBe("fi")
    expect(container.textContent).toContain("Toistot")
  })

  it("supports switching when storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked") })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked") })
    await render()
    await language("fi")
    expect(container.textContent).toContain("Toistot")
  })

  it("localizes native validation and clears it after editing", async () => {
    await render()
    await language("fi")
    const input = container.querySelector<HTMLInputElement>('input[type="email"]')!
    input.checkValidity()
    expect(input.validationMessage).toBe("Täytä tämä kenttä.")
    input.value = "test@example.com"
    input.dispatchEvent(new Event("input", { bubbles: true }))
    expect(input.checkValidity()).toBe(true)
  })

  it("preserves whitespace, substitutes values, and safely falls back for unknown messages", () => {
    expect(translate("fi", " Day ")).toBe(" Päivä ")
    expect(translate("fi", "Day {day} workout", { day: 3 })).toBe("Päivän 3 harjoitus")
    expect(translate("fi", "My personal program")).toBe("My personal program")
  })

  it("keeps placeholders intact in every Finnish translation", () => {
    for (const [english, finnish] of Object.entries(fi)) {
      expect(finnish.match(/\{\w+\}/g)?.sort() ?? [], english).toEqual(english.match(/\{\w+\}/g)?.sort() ?? [])
      expect(finnish, english).not.toContain("\uFFFD")
    }
  })
})
