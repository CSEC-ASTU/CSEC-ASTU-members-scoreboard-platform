import { get, set, del } from "idb-keyval"
import type {
  PersistedClient,
  Persister,
} from "@tanstack/react-query-persist-client"

const IDB_KEY = "csec-pwa-react-query"

/** No-op persister used for the regular web app (non-PWA). */
export function createNoopPersister(): Persister {
  return {
    persistClient: async () => {},
    restoreClient: async () => undefined,
    removeClient: async () => {},
  }
}

export function createIDBPersister(idbKey = IDB_KEY): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(idbKey, client)
    },
    restoreClient: async () => {
      return await get<PersistedClient>(idbKey)
    },
    removeClient: async () => {
      await del(idbKey)
    },
  }
}

let sharedPersister: Persister | null = null

/** Singleton so logout / sync can clear the same store QueryProvider uses. */
export function getPwaPersister(enabled: boolean): Persister {
  if (!enabled) return createNoopPersister()
  if (!sharedPersister) {
    sharedPersister = createIDBPersister()
  }
  return sharedPersister
}

export async function clearPwaPersistedQueries(): Promise<void> {
  if (sharedPersister) {
    await sharedPersister.removeClient()
  } else {
    await del(IDB_KEY)
  }
}
