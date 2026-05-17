import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { JWT_CONFIG } from '@/config/jwt'
import { UserModel } from '@/models/user.model'
import { createError } from '@/utils/response'

interface JwtPayload { userId: number; role: string }

export async function verifyToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token: string | undefined = req.cookies?.access_token
    if (!token) return next(createError('NO_TOKEN', 'Bạn cần đăng nhập', 401))

    const payload = jwt.verify(token, JWT_CONFIG.accessSecret) as JwtPayload
    const user = await UserModel.findById(payload.userId)
    if (!user || !user.is_active) return next(createError('USER_INACTIVE', 'Tài khoản không hợp lệ', 401))

    req.user = user
    next()
  } catch {
    next(createError('TOKEN_EXPIRED', 'Phiên đăng nhập hết hạn', 401))
  }
}

export async function optionalToken(req: Request, _res: Response, next: NextFunction) {
  const token: string | undefined = req.cookies?.access_token
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_CONFIG.accessSecret) as JwtPayload
      const user = await UserModel.findById(payload.userId)
      if (user?.is_active) req.user = user
    } catch { /* ignore */ }
  }
  next()
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') return next(createError('FORBIDDEN', 'Không có quyền truy cập', 403))
  next()
}
