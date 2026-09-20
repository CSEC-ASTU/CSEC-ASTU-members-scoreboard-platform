export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#09090B] px-6 text-center text-zinc-100">
      <img src="/icons/icon-192.png" alt="CSEC ASTU" className="h-16 w-16 rounded-2xl" />
      <h1 className="text-xl font-semibold tracking-tight">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-zinc-400">
        Reconnect to load the CSEC ASTU member platform. If you already used the installed app,
        open it again after you&apos;re online to sync.
      </p>
    </main>
  )
}
