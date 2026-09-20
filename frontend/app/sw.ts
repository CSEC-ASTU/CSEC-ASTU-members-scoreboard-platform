import type { PrecacheEntry, SerwistGlobalConfig, RuntimeCaching } from "serwist"
import { defaultCache } from "@serwist/next/worker"
import { NetworkOnly, Serwist } from "serwist"

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

/** Never cache API / auth traffic — data sync is handled in the PWA client layer. */
const apiNetworkOnly: RuntimeCaching = {
  matcher: ({ url: { pathname }, sameOrigin }) =>
    sameOrigin && (pathname.startsWith("/api/") || pathname.startsWith("/auth")),
  handler: new NetworkOnly(),
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [apiNetworkOnly, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document"
        },
      },
    ],
  },
})

serwist.addEventListeners()
