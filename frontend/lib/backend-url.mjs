// Single source of truth for where the FastAPI backend lives.
// Plain .mjs so both next.config.mjs and app code can import it.

const PRODUCTION_BACKEND_URL = "https://csec-astu-members-scoreboard-platform.onrender.com"

/**
 * Server-side backend origin (no /api/v1 suffix).
 * Set BACKEND_URL in each environment; NEXT_PUBLIC_API_URL is accepted for
 * backwards compatibility with older deployments.
 * @returns {string}
 */
export function getBackendOrigin() {
  const configured =
    process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "")
  if (configured) return configured.replace(/\/+$/, "")
  return process.env.NODE_ENV === "production" ? PRODUCTION_BACKEND_URL : "http://localhost:8000"
}

/**
 * Browser-side API base (includes /api/v1 or the /api/proxy rewrite prefix).
 * On deployed hosts the browser goes through the same-origin /api/proxy rewrite
 * so auth cookies stay first-party.
 * @returns {string}
 */
export function getClientApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL
  if (configured) return configured.replace(/\/+$/, "")
  if (typeof window !== "undefined" && !window.location.hostname.includes("localhost")) {
    return "/api/proxy"
  }
  return "http://localhost:8000/api/v1"
}
