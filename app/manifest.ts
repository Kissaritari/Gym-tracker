import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "FORM / ONE — Training intelligence",
    short_name: "FORM / ONE",
    description: "Find a program, build your own, and keep the proof of every session.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#1d211b",
    theme_color: "#1d211b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
