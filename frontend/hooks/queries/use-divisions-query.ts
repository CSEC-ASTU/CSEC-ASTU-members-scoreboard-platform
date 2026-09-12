"use client"

import { useQuery } from "@tanstack/react-query"
import { divisionsService } from "@/lib/api"

export function useDivisions() {
  return useQuery({
    queryKey: ["divisions"],
    queryFn: () => divisionsService.listDivisions(),
    staleTime: 60 * 60 * 1000, // 1 hour
  })
}
