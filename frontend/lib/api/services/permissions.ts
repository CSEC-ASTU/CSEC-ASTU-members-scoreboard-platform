import { apiFetch } from "../client"
import type {
  PermissionCatalogOut,
  MemberPermissionOut,
  MemberPermissionCreateIn,
  PermissionGrantHistoryOut,
  Paginated,
} from "../types"

export const permissionsService = {
  getCatalog: async (): Promise<PermissionCatalogOut[]> => {
    return apiFetch<PermissionCatalogOut[]>("/permissions")
  },

  getPermission: async (key: string): Promise<PermissionCatalogOut> => {
    return apiFetch<PermissionCatalogOut>(`/permissions/${key}`)
  },

  getMemberPermissions: async (params?: {
    page?: number
    page_size?: number
    member_id?: string
    permission_key?: string
    is_enabled?: boolean
  }): Promise<Paginated<MemberPermissionOut>> => {
    return apiFetch<Paginated<MemberPermissionOut>>("/member-permissions", { params })
  },

  grantPermission: async (data: MemberPermissionCreateIn): Promise<MemberPermissionOut> => {
    return apiFetch<MemberPermissionOut>("/member-permissions", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  togglePermission: async (id: string, is_enabled: boolean): Promise<MemberPermissionOut> => {
    return apiFetch<MemberPermissionOut>(`/member-permissions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_enabled }),
    })
  },

  deletePermission: async (id: string): Promise<void> => {
    return apiFetch<void>(`/member-permissions/${id}`, {
      method: "DELETE",
    })
  },
}
