import type { Request, Response, NextFunction } from 'express'
import { CreditPackageModel } from '@/models/creditPackage.model'
import { success, createError } from '@/utils/response'

export const AdminPackageController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const packages = await CreditPackageModel.findAll()
      return res.json(success(packages))
    } catch (err) { next(err) }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, credits, price, validity_days, description, sort_order } = req.body as {
        name: string; credits: number; price: number
        validity_days?: number; description?: string; sort_order?: number
      }
      if (!name || !credits || !price) {
        return next(createError('VALIDATION_ERROR', 'Thiếu thông tin bắt buộc: name, credits, price', 422))
      }
      const id = await CreditPackageModel.create({ name, credits, price, validity_days, description, sort_order })
      const pkg = await CreditPackageModel.findById(id)
      return res.status(201).json(success(pkg, 'Tạo gói thành công'))
    } catch (err) { next(err) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const pkg = await CreditPackageModel.findById(id)
      if (!pkg) return next(createError('NOT_FOUND', 'Không tìm thấy gói', 404))

      await CreditPackageModel.update(id, req.body)
      const updated = await CreditPackageModel.findById(id)
      return res.json(success(updated, 'Cập nhật thành công'))
    } catch (err) { next(err) }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const pkg = await CreditPackageModel.findById(id)
      if (!pkg) return next(createError('NOT_FOUND', 'Không tìm thấy gói', 404))

      await CreditPackageModel.delete(id)
      return res.json(success(null, 'Đã vô hiệu hóa gói'))
    } catch (err) { next(err) }
  },
}
