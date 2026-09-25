import { spawnSync } from "node:child_process"
import withSerwistInit from "@serwist/next"

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  crypto.randomUUID()

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: false,
  register: true,
  additionalPrecacheEntries: [
    { url: "/~offline", revision },
    { url: "/", revision },
    { url: "/login", revision },
    { url: "/events/explore", revision },
    { url: "/dashboard", revision },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const backendUrl =
      process.env.BACKEND_URL ||
      "https://csec-astu-members-scoreboard-platform.onrender.com"
    return [
      {
        // All /api/proxy/** calls are forwarded to the Render backend's /api/v1/**
        // The browser only ever talks to YOUR Vercel domain, so cookies stay same-site.
        source: "/api/proxy/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ]
  },
}

export default withSerwist(nextConfig)
