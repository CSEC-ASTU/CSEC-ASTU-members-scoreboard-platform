/** Runtime helpers for Progressive Web App (installed / standalone) mode. */

export const PWA_LAST_SYNC_KEY = "csec_pwa_last_sync"
export const PWA_CACHE_USER_KEY = "csec_pwa_cache_user"

export function isPwaStandalone(): boolean {
  if (typeof window === "undefined") return false

  const displayStandalone = window.matchMedia("(display-mode: standalone)").matches
  const displayMinimal = window.matchMedia("(display-mode: minimal-ui)").matches
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)

  return displayStandalone || displayMinimal || iosStandalone
}

export function formatLastSynced(timestamp: number | null): string | null {
  if (!timestamp) return null
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp))
  } catch {
    return new Date(timestamp).toLocaleString()
  }
}

export function readLastSyncedAt(): number | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(PWA_LAST_SYNC_KEY)
    if (!raw) return null
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

export function writeLastSyncedAt(timestamp = Date.now()): void {
  try {
    localStorage.setItem(PWA_LAST_SYNC_KEY, String(timestamp))
  } catch {
    // ignore quota / private mode
  }
}

export function clearPwaSyncMeta(): void {
  try {
    localStorage.removeItem(PWA_LAST_SYNC_KEY)
    localStorage.removeItem(PWA_CACHE_USER_KEY)
  } catch {
    // ignore
  }
}
