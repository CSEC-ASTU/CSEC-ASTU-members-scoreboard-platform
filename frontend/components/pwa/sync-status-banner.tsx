"use client"

import { usePwaSync } from "@/components/providers/pwa-sync-provider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CloudOff, Loader2, RefreshCw } from "lucide-react"

export function PwaSyncStatusBanner() {
  const { isPwa, isOnline, status, lastSyncedLabel, syncNow } = usePwaSync()

  if (!isPwa) return null

  const showOffline = !isOnline
  const showFailed = isOnline && status === "failed"
  const showSyncing = isOnline && status === "syncing"

  if (!showOffline && !showFailed && !showSyncing) return null

  let message = ""
  if (showOffline) {
    message = lastSyncedLabel
      ? `You're offline. Showing data from ${lastSyncedLabel}.`
      : "You're offline. Connect to sync the latest data."
  } else if (showFailed) {
    message = lastSyncedLabel
      ? `Sync failed. Showing data from ${lastSyncedLabel}.`
      : "Sync failed. Couldn't reach the server."
  } else {
    message = "Syncing latest data…"
  }

  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-between gap-3 border-b px-4 py-2 text-sm",
        showOffline || showFailed
          ? "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100"
          : "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {showSyncing ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        ) : (
          <CloudOff className="h-4 w-4 shrink-0" />
        )}
        <p className="truncate">{message}</p>
      </div>
      {(showFailed || showOffline) && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 shrink-0 gap-1.5 border-current/20 bg-transparent"
          onClick={() => void syncNow()}
          disabled={!isOnline || status === "syncing"}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </Button>
      )}
    </div>
  )
}
