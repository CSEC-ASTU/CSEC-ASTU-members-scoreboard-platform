import { apiFetch } from "../client"
import type {
  ClubEventCreateIn,
  ClubEventOut,
  LumaIngestExecuteIn,
  LumaIngestExecuteOut,
  LumaPreviewOut,
  Paginated,
} from "../types"

export const eventsService = {
  listEvents: async (params?: {
    filter?: "upcoming" | "past" | "all"
    division_id?: string
    search?: string
    event_type?: "internal" | "external"
    page?: number
    page_size?: number
  }): Promise<Paginated<ClubEventOut>> => {
    return apiFetch<Paginated<ClubEventOut>>("/events", { params })
  },

  getEvent: async (idOrSlug: string): Promise<ClubEventOut> => {
    return apiFetch<ClubEventOut>(`/events/${idOrSlug}`)
  },

  createEvent: async (data: ClubEventCreateIn): Promise<ClubEventOut> => {
    return apiFetch<ClubEventOut>("/events", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  previewLumaCsv: async (csvText: string, divisionId?: string | null): Promise<LumaPreviewOut> => {
    return apiFetch<LumaPreviewOut>("/events/preview-luma-csv", {
      method: "POST",
      body: JSON.stringify({
        csv_text: csvText,
        division_id: divisionId ?? null,
      }),
    })
  },

  ingestLuma: async (eventId: string, data: LumaIngestExecuteIn): Promise<LumaIngestExecuteOut> => {
    return apiFetch<LumaIngestExecuteOut>(`/events/${eventId}/ingest-luma`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },
}
