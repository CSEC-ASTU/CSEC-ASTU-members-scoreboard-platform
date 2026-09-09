import { apiFetch } from "../client"
import type {
  PointEventOut,
  ClaimCreateIn,
  OfficerAdjustmentIn,
  Paginated,
  ClaimStatus,
  EventType,
  BulkResult,
} from "../types"

export const pointEventsService = {
  getPointEvents: async (params?: {
    page?: number
    page_size?: number
    member_id?: string
    status?: ClaimStatus
    event_type?: EventType
    division_id?: string
    academic_year?: number
  }): Promise<Paginated<PointEventOut>> => {
    return apiFetch<Paginated<PointEventOut>>("/point-events", { params })
  },

  /** Alias for getPointEvents — used by UI components */
  listEvents: async (params?: {
    page?: number
    page_size?: number
    member_id?: string
    status?: ClaimStatus
    event_type?: EventType
    division_id?: string
    academic_year?: number
  }): Promise<Paginated<PointEventOut>> => {
    return apiFetch<Paginated<PointEventOut>>("/point-events", { params })
  },

  /** Returns all pending claims for the officer's approval scope */
  listApprovals: async (): Promise<Paginated<PointEventOut>> => {
    return apiFetch<Paginated<PointEventOut>>("/point-events", {
      params: { status: "pending" },
    })
  },

  getPointEvent: async (id: string): Promise<PointEventOut> => {
    return apiFetch<PointEventOut>(`/point-events/${id}`)
  },

  submitClaim: async (data: ClaimCreateIn): Promise<PointEventOut> => {
    return apiFetch<PointEventOut>("/point-events", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  /** Alias for submitClaim — used by tasks page */
  createClaim: async (data: ClaimCreateIn): Promise<PointEventOut> => {
    return apiFetch<PointEventOut>("/point-events", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  submitOfficerAdjustment: async (data: OfficerAdjustmentIn): Promise<PointEventOut> => {
    return apiFetch<PointEventOut>("/point-events", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  approveEvent: async (id: string): Promise<PointEventOut> => {
    return apiFetch<PointEventOut>(`/point-events/${id}/approve`, {
      method: "PATCH",
    })
  },

  rejectEvent: async (id: string, reason: string): Promise<PointEventOut> => {
    return apiFetch<PointEventOut>(`/point-events/${id}/reject`, {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    })
  },

  bulkApprove: async (event_ids: string[]): Promise<BulkResult> => {
    return apiFetch<BulkResult>("/point-events/bulk-approve", {
      method: "POST",
      body: JSON.stringify({ event_ids }),
    })
  },

  bulkReject: async (event_ids: string[], reason: string): Promise<BulkResult> => {
    return apiFetch<BulkResult>("/point-events/bulk-reject", {
      method: "POST",
      body: JSON.stringify({ event_ids, reason }),
    })
  },
}
