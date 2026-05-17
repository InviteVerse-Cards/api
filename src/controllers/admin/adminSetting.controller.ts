import type { Request, Response, NextFunction } from 'express'
import { SettingModel } from '@/models/setting.model'
import { success, createError } from '@/utils/response'

export const AdminSettingController = {
  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await SettingModel.getAll()
      return res.json(success(settings))
    } catch (err) { next(err) }
  },

  /**
   * PUT /admin/settings/:key   — set a single key
   * Body: { value: string }
   */
  async set(req: Request, res: Response, next: NextFunction) {
    try {
      const key = req.params.key
      if (!key) return next(createError('INVALID_KEY', 'Key không hợp lệ', 422))

      const { value } = req.body as { value: unknown }
      const strValue = String(value ?? '')
      await SettingModel.set(key, strValue)
      return res.json(success({ key, value: strValue }, 'Cập nhật cài đặt thành công'))
    } catch (err) { next(err) }
  },

  /**
   * PUT /admin/settings   — set multiple keys at once
   * Body: { [key: string]: string }
   */
  async setMany(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body as Record<string, unknown>
      if (typeof data !== 'object' || Array.isArray(data)) {
        return next(createError('INVALID_DATA', 'Dữ liệu phải là object key-value', 422))
      }
      const normalized: Record<string, string> = {}
      for (const [k, v] of Object.entries(data)) {
        normalized[k] = String(v)
      }
      await SettingModel.setMany(normalized)
      return res.json(success(normalized, 'Cập nhật cài đặt thành công'))
    } catch (err) { next(err) }
  },
}
