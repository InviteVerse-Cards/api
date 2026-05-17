export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: { code: string; message: string; details?: unknown }
}

export interface PaginationQuery {
  page?: string
  limit?: string
  search?: string
}

export function parsePagination(query: PaginationQuery): { page: number; limit: number; offset: number } {
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20))
  return { page, limit, offset: (page - 1) * limit }
}
