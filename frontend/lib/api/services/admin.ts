import { apiFetch } from "../client"
import type {
  ImportResult,
  AnnualResetPreview,
  AnnualResetResult,
  PointEventOut,
  LoginFailureOut,
  Paginated,
  EventType,
} from "../types"

export const adminService = {
  importMembersCsv: async (file: File, dryRun: boolean = false): Promise<ImportResult> => {
    const formData = new FormData()
    formData.append("file", file)
    return apiFetch<ImportResult>("/admin/members/import", {
      method: "POST",
      body: formData,
      params: { dry_run: dryRun },
    })
  },

  getAnnualResetPreview: async (): Promise<AnnualResetPreview> => {
    return apiFetch<AnnualResetPreview>("/admin/annual-reset/preview")
  },

  executeAnnualReset: async (): Promise<AnnualResetResult> => {
    return apiFetch<AnnualResetResult>("/admin/annual-reset", {
      method: "POST",
    })
  },

  getAuditLog: async (params?: {
    page?: number
    page_size?: number
    member_id?: string
    event_type?: EventType
    date_from?: string
    date_to?: string
  }): Promise<Paginated<PointEventOut>> => {
    return apiFetch<Paginated<PointEventOut>>("/admin/audit-log", { params })
  },

  getLoginFailures: async (params?: {
    page?: number
    page_size?: number
  }): Promise<Paginated<LoginFailureOut>> => {
    return apiFetch<Paginated<LoginFailureOut>>("/admin/login-failures", { params })
  },
}
