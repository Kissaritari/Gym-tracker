// @vitest-environment jsdom
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import { expect, it } from "vitest"

it("restores and switches the offline page language without network access", () => {
  document.body.innerHTML = readFileSync("public/offline.html", "utf8").match(/<body>([\s\S]*)<\/body>/)![1]
  localStorage.setItem("form-one-language", "fi")
  runInNewContext(readFileSync("public/offline-language.js", "utf8"), { document, localStorage })
  expect(document.documentElement.lang).toBe("fi")
  expect(document.getElementById("retry")!.textContent).toBe("Yritä uudelleen")
  const select = document.getElementById("language") as HTMLSelectElement
  select.value = "en"
  select.dispatchEvent(new Event("change"))
  expect(document.getElementById("retry")!.textContent).toBe("Try again")
  expect(localStorage.getItem("form-one-language")).toBe("en")
  document.body.innerHTML = ""
  localStorage.clear()
})
