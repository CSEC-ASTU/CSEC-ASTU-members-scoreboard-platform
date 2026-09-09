import { apiFetch } from "../client"
import type { LeaderboardOut } from "../types"

export const leaderboardService = {
  getLeaderboard: async (division_id?: string): Promise<LeaderboardOut> => {
    return apiFetch<LeaderboardOut>("/leaderboard", {
      params: { division_id: division_id || undefined },
    })
  },

  getLeaderboardHistory: async (academic_year: number, division_id?: string): Promise<LeaderboardOut> => {
    return apiFetch<LeaderboardOut>("/leaderboard/history", {
      params: {
        academic_year,
        division_id: division_id || undefined,
      },
    })
  },
}
