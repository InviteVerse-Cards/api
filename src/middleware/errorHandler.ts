import type { ErrorRequestHandler } from 'express'
import { AppError } from '@/utils/response'
import { logger } from '@/utils/logger'

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    })
  }

  logger.error('Unhandled error:', err)
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Đã có lỗi xảy ra, vui lòng thử lại' },
  })
}
