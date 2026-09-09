import { apiFetch } from "../client"
import type { TaskOut, TaskCreateIn, TaskUpdateIn, Paginated } from "../types"

export const tasksService = {
  getTasks: async (params?: {
    page?: number
    page_size?: number
    division_id?: string
    category?: string
    active?: boolean
    is_penalty?: boolean
  }): Promise<Paginated<TaskOut>> => {
    return apiFetch<Paginated<TaskOut>>("/tasks", { params })
  },

  /** Alias for getTasks */
  listTasks: async (params?: {
    page?: number
    page_size?: number
    division_id?: string
    category?: string
    active?: boolean
    is_penalty?: boolean
  }): Promise<Paginated<TaskOut>> => {
    return apiFetch<Paginated<TaskOut>>("/tasks", { params })
  },

  getTask: async (id: string): Promise<TaskOut> => {
    return apiFetch<TaskOut>(`/tasks/${id}`)
  },

  createTask: async (data: TaskCreateIn): Promise<TaskOut> => {
    return apiFetch<TaskOut>("/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  updateTask: async (id: string, data: TaskUpdateIn): Promise<TaskOut> => {
    return apiFetch<TaskOut>(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  },
}
