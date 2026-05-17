import type { Request, Response, NextFunction } from 'express'
import { UserModel } from '@/models/user.model'
import { success, paginated, createError } from '@/utils/response'
import { parsePagination } from '@/types/api.types'
import bcrypt from 'bcryptjs'

export const AdminUserController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query as { page?: string; limit?: string })
      const search = req.query.search as string | undefined
      const role = req.query.role as 'user' | 'admin' | undefined
      const isActive = req.query.is_active !== undefined
        ? req.query.is_active === '1' || req.query.is_active === 'true'
        : undefined

      const { rows, total } = await UserModel.findAll({ search, role, isActive, page, limit })
      return res.json(paginated(rows.map(UserModel.toPublic), total, page, limit))
    } catch (err) { next(err) }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const user = await UserModel.findById(id)
      if (!user) return next(createError('NOT_FOUND', 'Không tìm thấy người dùng', 404))
      return res.json(success(UserModel.toPublic(user)))
    } catch (err) { next(err) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const user = await UserModel.findById(id)
      if (!user) return next(createError('NOT_FOUND', 'Không tìm thấy người dùng', 404))

      const { full_name, phone, role, is_active, is_verified } = req.body as {
        full_name?: string
        phone?: string
        role?: 'user' | 'admin'
        is_active?: boolean
        is_verified?: boolean
      }

      const updates: Parameters<typeof UserModel.update>[1] = {}
      if (full_name !== undefined) updates.full_name = full_name
      if (phone !== undefined) updates.phone = phone || null
      if (role !== undefined) updates.role = role
      if (is_active !== undefined) updates.is_active = is_active
      if (is_verified !== undefined) updates.is_verified = is_verified

      await UserModel.update(id, updates)
      const updated = await UserModel.findById(id)
      return res.json(success(UserModel.toPublic(updated!), 'Cập nhật thành công'))
    } catch (err) { next(err) }
  },

  async adjustCredits(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const user = await UserModel.findById(id)
      if (!user) return next(createError('NOT_FOUND', 'Không tìm thấy người dùng', 404))

      const { amount, days } = req.body as { amount: number; days?: number }
      if (!Number.isInteger(amount) || amount === 0) {
        return next(createError('INVALID_AMOUNT', 'Số lượng credits không hợp lệ', 422))
      }

      const validityDays = days ?? (Number(process.env.CREDIT_VALIDITY_DAYS) || 50)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + validityDays)

      if (amount > 0) {
        await UserModel.addCredits(id, amount, expiresAt)
      } else {
        // For deduction: direct SQL to allow negative delta safely clamped to 0
        const pool = (await import('@/config/database')).default
        await pool.query(
          `UPDATE users
           SET credits_balance = GREATEST(0, credits_balance + ?), updated_at = NOW()
           WHERE id = ?`,
          [amount, id]
        )
      }

      const updated = await UserModel.findById(id)
      return res.json(success(UserModel.toPublic(updated!), `Điều chỉnh ${amount} credits thành công`))
    } catch (err) { next(err) }
  },

  async grantCredits(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const user = await UserModel.findById(id)
      if (!user) return next(createError('NOT_FOUND', 'Không tìm thấy người dùng', 404))

      const { credits, days } = req.body as { credits?: number; days?: number; reason?: string }
      if (!credits || !Number.isInteger(credits) || credits <= 0) {
        return next(createError('INVALID_AMOUNT', 'credits phải là số nguyên dương', 422))
      }

      const validityDays = days ?? (Number(process.env.CREDIT_VALIDITY_DAYS) || 50)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + validityDays)

      await UserModel.addCredits(id, credits, expiresAt)

      const updated = await UserModel.findById(id)
      return res.json(success(UserModel.toPublic(updated!), `Đã cấp ${credits} lượt cho user #${id}`))
    } catch (err) { next(err) }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      if (id === req.user!.id) {
        return next(createError('CANNOT_DELETE_SELF', 'Không thể xoá tài khoản của chính mình', 400))
      }

      const user = await UserModel.findById(id)
      if (!user) return next(createError('NOT_FOUND', 'Không tìm thấy người dùng', 404))

      await UserModel.update(id, { is_active: false })
      return res.json(success(null, 'Đã vô hiệu hoá tài khoản'))
    } catch (err) { next(err) }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const user = await UserModel.findById(id)
      if (!user) return next(createError('NOT_FOUND', 'Không tìm thấy người dùng', 404))

      const { new_password } = req.body as { new_password: string }
      if (!new_password || new_password.length < 6) {
        return next(createError('WEAK_PASSWORD', 'Mật khẩu tối thiểu 6 ký tự', 422))
      }

      const password_hash = await bcrypt.hash(new_password, 12)
      await UserModel.update(id, { password_hash })
      return res.json(success(null, 'Đặt lại mật khẩu thành công'))
    } catch (err) { next(err) }
  },
}
