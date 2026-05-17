import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { JWT_CONFIG } from '@/config/jwt'
import { UserModel } from '@/models/user.model'
import { RefreshTokenModel } from '@/models/refreshToken.model'
import { EmailService } from '@/services/email.service'
import { createError } from '@/utils/response'
import { hashToken, randomToken } from '@/utils/crypto'
import { logger } from '@/utils/logger'
import type { UserRow } from '@/types/user.types'

interface TokenPair {
  accessToken: string
  refreshToken: string
}

export const AuthService = {
  async register(data: {
    full_name: string
    email: string
    password: string
    phone?: string
  }): Promise<UserRow> {
    const existing = await UserModel.findByEmail(data.email)
    if (existing) throw createError('EMAIL_TAKEN', 'Email đã được sử dụng', 409)

    const password_hash = await bcrypt.hash(data.password, 12)
    const id = await UserModel.create({
      full_name: data.full_name,
      email: data.email,
      password_hash,
      phone: data.phone ?? null,
    })

    const user = await UserModel.findById(id)
    if (!user) throw createError('CREATE_FAILED', 'Tạo tài khoản thất bại', 500)
    return user
  },

  async login(
    email: string,
    password: string,
    meta?: { ip?: string; userAgent?: string }
  ): Promise<{ user: UserRow; tokens: TokenPair }> {
    const user = await UserModel.findByEmail(email)
    if (!user) throw createError('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng', 401)
    if (!user.is_active) throw createError('ACCOUNT_DISABLED', 'Tài khoản đã bị vô hiệu hóa', 403)
    if (!user.password_hash) throw createError('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng', 401)

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) throw createError('INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng', 401)

    if (!user.is_verified) throw createError('EMAIL_NOT_VERIFIED', 'Vui lòng xác thực email trước khi đăng nhập', 403)

    await UserModel.updateLastLogin(user.id)

    const tokens = await AuthService.issueTokens(user, meta)
    return { user, tokens }
  },

  async issueTokens(
    user: UserRow,
    meta?: { ip?: string; userAgent?: string }
  ): Promise<TokenPair> {
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_CONFIG.accessSecret,
      { expiresIn: JWT_CONFIG.accessExpiry }
    )

    const rawRefresh = randomToken(64)
    const tokenHash = hashToken(rawRefresh)
    const expiresAt = new Date(Date.now() + JWT_CONFIG.refreshMaxAge)

    await RefreshTokenModel.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      ipAddress: meta?.ip ?? null,
      userAgent: meta?.userAgent ?? null,
    })

    return { accessToken, refreshToken: rawRefresh }
  },

  async refresh(rawToken: string): Promise<{ user: UserRow; tokens: TokenPair }> {
    const hash = hashToken(rawToken)
    const stored = await RefreshTokenModel.findByHash(hash)

    if (!stored) throw createError('INVALID_REFRESH', 'Refresh token không hợp lệ', 401)
    if (new Date(stored.expires_at) < new Date()) {
      await RefreshTokenModel.deleteByHash(hash)
      throw createError('REFRESH_EXPIRED', 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại', 401)
    }

    const user = await UserModel.findById(stored.user_id)
    if (!user || !user.is_active) {
      await RefreshTokenModel.deleteByHash(hash)
      throw createError('USER_INACTIVE', 'Tài khoản không hợp lệ', 401)
    }

    // Rotate: delete old, issue new
    await RefreshTokenModel.deleteByHash(hash)
    const tokens = await AuthService.issueTokens(user)
    return { user, tokens }
  },

  async logout(rawToken: string): Promise<void> {
    const hash = hashToken(rawToken)
    await RefreshTokenModel.deleteByHash(hash)
  },

  async logoutAll(userId: number): Promise<void> {
    await RefreshTokenModel.deleteByUserId(userId)
  },

  async sendVerificationEmail(user: UserRow): Promise<void> {
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
    await UserModel.setEmailVerifyToken(user.id, token, expiresAt)
    try {
      await EmailService.sendVerificationEmail(user.email!, token)
      logger.info('[AUTH] sendVerificationEmail sent to user %d', user.id)
    } catch (err) {
      // Token đã lưu DB — user có thể dùng nút "Gửi lại" trên trang login
      logger.warn('[AUTH] sendVerificationEmail delivery failed for user %d — token stored, user can resend', user.id, { error: (err as Error).message })
    }
  },

  async verifyEmail(token: string): Promise<void> {
    const user = await UserModel.findByEmailVerifyToken(token)
    if (!user) throw createError('INVALID_TOKEN', 'Link xác thực không hợp lệ hoặc đã hết hạn', 400)
    if (user.is_verified) throw createError('ALREADY_VERIFIED', 'Email đã được xác thực', 400)
    if (!user.email_verify_token_expires || new Date(user.email_verify_token_expires) < new Date()) {
      throw createError('TOKEN_EXPIRED', 'Link xác thực đã hết hạn, vui lòng yêu cầu gửi lại', 400)
    }
    await UserModel.markEmailVerified(user.id)
  },

  async resendVerification(email: string): Promise<void> {
    const user = await UserModel.findByEmail(email)
    if (!user) return // không tiết lộ email tồn tại hay không
    if (user.is_verified) throw createError('ALREADY_VERIFIED', 'Email đã được xác thực', 400)

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
    await UserModel.setEmailVerifyToken(user.id, token, expiresAt)
    try {
      await EmailService.sendVerificationEmail(email, token)
    } catch (err) {
      logger.warn('[AUTH] resendVerification delivery failed for %s — token stored', email, { error: (err as Error).message })
    }
  },

  async forgotPassword(email: string): Promise<void> {
    const user = await UserModel.findByEmail(email)
    if (!user || !user.is_active) return // không tiết lộ email tồn tại hay không

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1h
    await UserModel.setResetPasswordToken(user.id, token, expiresAt)
    try {
      await EmailService.sendPasswordResetEmail(email, token)
    } catch (err) {
      logger.warn('[AUTH] forgotPassword delivery failed for user %d — token stored, user can retry', user.id, { error: (err as Error).message })
    }
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await UserModel.findByResetPasswordToken(token)
    if (!user) throw createError('INVALID_TOKEN', 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn', 400)
    if (!user.reset_password_token_expires || new Date(user.reset_password_token_expires) < new Date()) {
      throw createError('TOKEN_EXPIRED', 'Link đặt lại mật khẩu đã hết hạn, vui lòng yêu cầu lại', 400)
    }
    const password_hash = await bcrypt.hash(newPassword, 12)
    await UserModel.update(user.id, { password_hash })
    await UserModel.clearResetPasswordToken(user.id)
    await RefreshTokenModel.deleteByUserId(user.id) // thu hồi tất cả session
  },

  setTokenCookies(
    res: import('express').Response,
    tokens: TokenPair
  ): void {
    const isProd = process.env.NODE_ENV === 'production'
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'strict',
      maxAge: JWT_CONFIG.accessMaxAge,
      path: '/',
    })
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'strict',
      maxAge: JWT_CONFIG.refreshMaxAge,
      path: '/api/v1/auth',
    })
  },

  clearTokenCookies(res: import('express').Response): void {
    const isProd = process.env.NODE_ENV === 'production'
    res.clearCookie('access_token', { path: '/', sameSite: isProd ? 'none' : 'strict', secure: isProd })
    res.clearCookie('refresh_token', { path: '/api/v1/auth', sameSite: isProd ? 'none' : 'strict', secure: isProd })
  },
}
