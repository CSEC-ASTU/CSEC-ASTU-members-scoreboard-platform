"use client"

import { useQuery } from "@tanstack/react-query"
import { settingsService, adminService } from "@/lib/api"

export function usePlatformSettings() {
  return useQuery({
    queryKey: ["platform-settings"],
    queryFn: () => settingsService.getSettings(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}

export function useAuditLog(params?: { page?: number; page_size?: number }) {
  return useQuery({
    queryKey: ["audit-log", params],
    queryFn: () => adminService.getAuditLog(params),
    staleTime: 30 * 1000,
  })
}

export function useLoginFailures(params?: { page?: number; page_size?: number }) {
  return useQuery({
    queryKey: ["login-failures", params],
    queryFn: () => adminService.getLoginFailures(params),
    staleTime: 30 * 1000,
  })
}
