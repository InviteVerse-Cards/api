export function success<T>(data: T, message?: string) {
  return { success: true, data, ...(message ? { message } : {}) }
}

export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
) {
  return {
    success: true,
    data: { items, total, page, limit, totalPages: Math.ceil(total / limit) },
  }
}

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function createError(code: string, message: string, statusCode = 400): AppError {
  return new AppError(code, message, statusCode)
}
