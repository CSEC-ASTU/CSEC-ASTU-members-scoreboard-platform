import type { ClubEventOut, Paginated } from "@/lib/api/types"

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") ||
  "http://localhost:8000"

export async function fetchPublicEvents(options?: {
  filter?: "upcoming" | "past" | "all"
  page?: number
  page_size?: number
  search?: string
}): Promise<Paginated<ClubEventOut>> {
  const params = new URLSearchParams()
  params.set("filter", options?.filter ?? "upcoming")
  params.set("page", String(options?.page ?? 1))
  params.set("page_size", String(options?.page_size ?? 20))
  // Guests and public surfaces only list open-to-everyone events
  params.set("event_type", "external")
  if (options?.search?.trim()) {
    params.set("search", options.search.trim())
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/events?${params.toString()}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) {
      return { items: [], total: 0, page: 1, page_size: options?.page_size ?? 20 }
    }
    return (await res.json()) as Paginated<ClubEventOut>
  } catch {
    return { items: [], total: 0, page: 1, page_size: options?.page_size ?? 20 }
  }
}
