// Centralized HTTP API client with cookie credentials and error normalization

export class ApiError extends Error {
  status: number
  detail: string
  requestId?: string

  constructor(status: number, detail: string, requestId?: string) {
    super(detail)
    this.name = "ApiError"
    this.status = status
    this.detail = detail
    this.requestId = requestId
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1"

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>
}

export async function apiFetch<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...rest } = options

  let url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`

  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val))
      }
    })
    const qs = searchParams.toString()
    if (qs) {
      url += (url.includes("?") ? "&" : "?") + qs
    }
  }

  const defaultHeaders: HeadersInit = {
    "Accept": "application/json",
    ...(rest.body && !(rest.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
  }

  const response = await fetch(url, {
    ...rest,
    credentials: "include", // essential for httpOnly JWT cookie flow
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  })

  const requestId = response.headers.get("X-Request-ID") || undefined

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`
    try {
      const errorData = await response.json()
      if (errorData.detail) {
        detail = typeof errorData.detail === "string" ? errorData.detail : JSON.stringify(errorData.detail)
      }
    } catch {
      // Non-JSON error body
    }
    throw new ApiError(response.status, detail, requestId)
  }

  if (response.status === 204) {
    return null as unknown as T
  }

  return response.json() as Promise<T>
}
