import type { Request, Response, NextFunction } from 'express'
import { AuthService } from '@/services/auth.service'
import { UserModel } from '@/models/user.model'
import { success } from '@/utils/response'

export const AuthController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await AuthService.register(req.body)
      await AuthService.sendVerificationEmail(user)
      return res.status(201).json(success(null, 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.'))
    } catch (err) { next(err) }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, tokens } = await AuthService.login(req.body.email, req.body.password, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })
      AuthService.setTokenCookies(res, tokens)
      return res.json(success(UserModel.toPublic(user), 'Đăng nhập thành công'))
    } catch (err) { next(err) }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const rawToken: string | undefined = req.cookies?.refresh_token
      if (!rawToken) {
        return res.status(401).json({
          success: false,
          error: { code: 'NO_REFRESH_TOKEN', message: 'Không có refresh token' },
        })
      }
      const { user, tokens } = await AuthService.refresh(rawToken)
      AuthService.setTokenCookies(res, tokens)
      return res.json(success(UserModel.toPublic(user), 'Làm mới token thành công'))
    } catch (err) { next(err) }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const rawToken: string | undefined = req.cookies?.refresh_token
      if (rawToken) await AuthService.logout(rawToken)
      AuthService.clearTokenCookies(res)
      return res.json(success(null, 'Đăng xuất thành công'))
    } catch (err) { next(err) }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(success(UserModel.toPublic(req.user!)))
    } catch (err) { next(err) }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body as { token: string }
      await AuthService.verifyEmail(token)
      return res.json(success(null, 'Xác thực email thành công'))
    } catch (err) { next(err) }
  },

  async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body as { email: string }
      await AuthService.resendVerification(email)
      return res.json(success(null, 'Email xác thực đã được gửi lại nếu tài khoản tồn tại'))
    } catch (err) { next(err) }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body as { email: string }
      await AuthService.forgotPassword(email)
      return res.json(success(null, 'Email đặt lại mật khẩu đã được gửi nếu tài khoản tồn tại'))
    } catch (err) { next(err) }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, new_password } = req.body as { token: string; new_password: string }
      await AuthService.resetPassword(token, new_password)
      return res.json(success(null, 'Đặt lại mật khẩu thành công'))
    } catch (err) { next(err) }
  },
}
