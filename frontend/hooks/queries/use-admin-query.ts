"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { settingsService, adminService } from "@/lib/api"
import { PLATFORM_SETTINGS, type PlatformSettings } from "@/lib/csec-data"

export function usePlatformSettings() {
  return useQuery({
    queryKey: ["platform-settings"],
    queryFn: () => settingsService.getSettings(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  })
}

/**
 * Live platform settings from the backend, falling back to the built-in
 * defaults while loading or if the request fails.
 */
export function useEffectiveSettings(): PlatformSettings {
  const { data } = usePlatformSettings()
  return useMemo(
    () => ({
      scoreCap: data?.score_cap ?? PLATFORM_SETTINGS.scoreCap,
      initialBuffer: data?.initial_buffer ?? PLATFORM_SETTINGS.initialBuffer,
      currentAcademicYear: data?.current_academic_year ?? PLATFORM_SETTINGS.currentAcademicYear,
      autoApproveClaimMaxPoints:
        data?.auto_approve_claim_max_points ?? PLATFORM_SETTINGS.autoApproveClaimMaxPoints,
      badgeTierMultipliers: {
        ...PLATFORM_SETTINGS.badgeTierMultipliers,
        ...data?.badge_tier_multipliers,
      },
    }),
    [data],
  )
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
