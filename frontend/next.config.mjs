import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"
import withSerwistInit from "@serwist/next"
import { getBackendOrigin } from "./lib/backend-url.mjs"

const require = createRequire(import.meta.url)
const { randomUUID } = require("node:crypto")

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const revision =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  randomUUID()

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
  // Keep tracing rooted at the frontend app even if a parent lockfile exists.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    unoptimized: true,
  },
  // Large first compiles of app/layout were timing out the browser chunk loader.
  webpack: (config, { dev }) => {
    if (dev) {
      config.output = {
        ...config.output,
        chunkLoadTimeout: 300000,
      }
    }
    return config
  },
  async rewrites() {
    const backendUrl = getBackendOrigin()
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
