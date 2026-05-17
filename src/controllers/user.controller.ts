import type { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { UserModel } from '@/models/user.model'
import { CreditUsageLogModel } from '@/models/creditUsageLog.model'
import { uploadToCloudinary, deleteFromCloudinary } from '@/services/upload.service'
import { success, paginated, createError } from '@/utils/response'
import { parsePagination } from '@/types/api.types'
// RefreshTokenModel & AuthService are imported dynamically in deleteAccount to avoid circular deps

export const UserController = {
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      return res.json(success(UserModel.toPublic(req.user!)))
    } catch (err) { next(err) }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { full_name, phone, birth_date, gender } = req.body as {
        full_name?: string; phone?: string; birth_date?: string; gender?: string
      }
      const updates: Parameters<typeof UserModel.update>[1] = {}
      if (full_name?.trim()) updates.full_name = full_name.trim()
      if (phone !== undefined) updates.phone = phone || null
      if (birth_date !== undefined) updates.birth_date = birth_date ? new Date(birth_date) : null
      if (gender !== undefined) updates.gender = gender || null

      if (Object.keys(updates).length > 0) {
        await UserModel.update(req.user!.id, updates)
      }

      const updated = await UserModel.findById(req.user!.id)
      return res.json(success(UserModel.toPublic(updated!), 'Cập nhật thông tin thành công'))
    } catch (err) { next(err) }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { current_password, new_password } = req.body as {
        current_password: string
        new_password: string
      }

      if (!req.user!.password_hash) {
        return next(createError('NO_PASSWORD', 'Tài khoản không có mật khẩu', 400))
      }

      const valid = await bcrypt.compare(current_password, req.user!.password_hash)
      if (!valid) {
        return next(createError('WRONG_PASSWORD', 'Mật khẩu hiện tại không đúng', 400))
      }

      if (new_password.length < 6) {
        return next(createError('WEAK_PASSWORD', 'Mật khẩu mới tối thiểu 6 ký tự', 422))
      }

      const password_hash = await bcrypt.hash(new_password, 12)
      await UserModel.update(req.user!.id, { password_hash })

      return res.json(success(null, 'Đổi mật khẩu thành công'))
    } catch (err) { next(err) }
  },

  async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return next(createError('NO_FILE', 'Vui lòng chọn file ảnh', 422))
      }

      // Delete old avatar if exists
      if (req.user!.avatar_public_id) {
        await deleteFromCloudinary(req.user!.avatar_public_id).catch(() => {/* ignore */})
      }

      const { url, publicId } = await uploadToCloudinary(
        req.file.buffer,
        'fengshui/avatars',
        `user_${req.user!.id}`
      )

      await UserModel.update(req.user!.id, {
        avatar_url: url,
        avatar_public_id: publicId,
      })

      const updated = await UserModel.findById(req.user!.id)
      return res.json(success(UserModel.toPublic(updated!), 'Cập nhật ảnh đại diện thành công'))
    } catch (err) { next(err) }
  },

  async getCreditHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, offset: _offset } = parsePagination(req.query as { page?: string; limit?: string })
      const { rows, total } = await CreditUsageLogModel.findByUser(req.user!.id, { page, limit })
      return res.json(paginated(rows, total, page, limit))
    } catch (err) { next(err) }
  },

  async deleteAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!
      if (!user.avatar_public_id) {
        return next(createError('NO_AVATAR', 'Tài khoản chưa có ảnh đại diện', 404))
      }

      await deleteFromCloudinary(user.avatar_public_id).catch(() => {/* ignore Cloudinary errors */})
      await UserModel.update(user.id, { avatar_url: null, avatar_public_id: null })

      return res.json(success(null, 'Đã xoá ảnh đại diện'))
    } catch (err) { next(err) }
  },

  async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const { password } = req.body as { password?: string }
      const user = req.user!

      if (user.password_hash) {
        if (!password) {
          return next(createError('PASSWORD_REQUIRED', 'Vui lòng nhập mật khẩu để xác nhận xoá tài khoản', 422))
        }
        const valid = await bcrypt.compare(password, user.password_hash)
        if (!valid) {
          return next(createError('WRONG_PASSWORD', 'Mật khẩu không đúng', 401))
        }
      }

      await UserModel.update(user.id, { is_active: false })

      // Xoá avatar trên Cloudinary nếu có
      if (user.avatar_public_id) {
        await deleteFromCloudinary(user.avatar_public_id).catch(() => {})
      }

      // Thu hồi tất cả session
      const { RefreshTokenModel } = await import('@/models/refreshToken.model')
      await RefreshTokenModel.deleteByUserId(user.id)

      // Xoá cookie
      const { AuthService } = await import('@/services/auth.service')
      AuthService.clearTokenCookies(res)

      return res.json(success(null, 'Tài khoản đã được xoá'))
    } catch (err) { next(err) }
  },
}
