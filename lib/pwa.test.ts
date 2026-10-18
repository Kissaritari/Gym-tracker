import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import { describe, expect, it, vi } from "vitest"
import manifest from "../app/manifest"

function worker(fetch = vi.fn()) {
  const handlers: Record<string, (event: any) => void> = {}
  const fallback = new Response("offline")
  const cache = { addAll: vi.fn(), match: vi.fn().mockResolvedValue(fallback) }
  const caches = { open: vi.fn().mockResolvedValue(cache), keys: vi.fn().mockResolvedValue([]), delete: vi.fn() }
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: { addEventListener: (name: string, handler: (event: any) => void) => { handlers[name] = handler }, location: { origin: "https://gym.example" }, clients: { claim: vi.fn() } },
    caches, fetch, URL, Response,
  })
  return { handlers, caches, cache, fallback }
}

describe("PWA", () => {
  it("precaches the offline page and its language script together", async () => {
    const { handlers, cache } = worker()
    const waitUntil = vi.fn()
    handlers.install({ waitUntil })
    await waitUntil.mock.calls[0][0]
    expect(cache.addAll).toHaveBeenCalledWith(["/offline.html", "/offline-language.js"])
  })

  it("serves the language script from cache without a connection", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("offline"))
    const { handlers, fallback } = worker(fetch)
    const respondWith = vi.fn()
    handlers.fetch({ request: { method: "GET", mode: "no-cors", url: "https://gym.example/offline-language.js" }, respondWith })
    expect(await respondWith.mock.calls[0][0]).toBe(fallback)
    expect(fetch).not.toHaveBeenCalled()
  })
  it("ships correctly sized PNG install icons", () => {
    for (const icon of manifest().icons!) {
      const data = readFileSync(`public${icon.src}`)
      expect(`${data.readUInt32BE(16)}x${data.readUInt32BE(20)}`).toBe(icon.sizes)
    }
  })

  it("returns the offline screen when a navigation fails", async () => {
    const { handlers, fallback } = worker(vi.fn().mockRejectedValue(new Error("offline")))
    const respondWith = vi.fn()
    handlers.fetch({ request: { method: "GET", mode: "navigate", url: "https://gym.example/" }, respondWith })
    expect(await respondWith.mock.calls[0][0]).toBe(fallback)
  })

  it("leaves mutations, data requests and other origins untouched", () => {
    const { handlers, caches } = worker()
    for (const request of [
      { method: "POST", mode: "navigate", url: "https://gym.example/" },
      { method: "GET", mode: "cors", url: "https://gym.example/?_rsc=123" },
      { method: "GET", mode: "navigate", url: "https://other.example/" },
    ]) {
      const respondWith = vi.fn()
      handlers.fetch({ request, respondWith })
      expect(respondWith).not.toHaveBeenCalled()
    }
    expect(caches.open).not.toHaveBeenCalled()
  })

  it("does not cache authenticated navigation responses", async () => {
    const response = new Response("private workout")
    const { handlers, caches } = worker(vi.fn().mockResolvedValue(response))
    const respondWith = vi.fn()
    handlers.fetch({ request: { method: "GET", mode: "navigate", url: "https://gym.example/sessions" }, respondWith })
    expect(await respondWith.mock.calls[0][0]).toBe(response)
    expect(caches.open).not.toHaveBeenCalled()
  })
})
