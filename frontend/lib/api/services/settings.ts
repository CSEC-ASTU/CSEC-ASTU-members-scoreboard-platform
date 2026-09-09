import { apiFetch } from "../client"
import type { PlatformSettingsOut } from "../types"

export const settingsService = {
  getSettings: async (): Promise<PlatformSettingsOut> => {
    return apiFetch<PlatformSettingsOut>("/settings")
  },

  updateSettings: async (data: Partial<PlatformSettingsOut>): Promise<PlatformSettingsOut> => {
    return apiFetch<PlatformSettingsOut>("/settings", {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  },
}
