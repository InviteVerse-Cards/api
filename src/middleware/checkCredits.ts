import type { Request, Response, NextFunction } from 'express'
import { createError } from '@/utils/response'
import type { CreditsStatus } from '@/types/user.types'

export function getCreditsStatus(balance: number, expiresAt: Date | null): CreditsStatus {
  if (balance <= 0) return 'empty'
  if (!expiresAt) return 'active'
  if (new Date(expiresAt) < new Date()) return 'frozen'
  return 'active'
}

export function requireCredits(minAmount = 1) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user!
    const status = getCreditsStatus(user.credits_balance, user.credits_expires_at)
    if (status !== 'active' || user.credits_balance < minAmount) {
      return next(createError(
        'INSUFFICIENT_CREDITS',
        `Bạn cần ít nhất ${minAmount} lượt để thực hiện thao tác này`,
        402
      ))
    }
    next()
  }
}
