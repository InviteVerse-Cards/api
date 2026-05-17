import rateLimit from 'express-rate-limit'

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Quá nhiều yêu cầu, vui lòng thử lại sau' } },
  standardHeaders: true,
  legacyHeaders: false,
})

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Quá nhiều yêu cầu' } },
  standardHeaders: true,
  legacyHeaders: false,
})

export const freeReadingRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: { success: false, error: { code: 'FREE_LIMIT', message: 'Bạn đã dùng hết lượt miễn phí hôm nay' } },
})
