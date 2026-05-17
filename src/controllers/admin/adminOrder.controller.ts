import type { Request, Response, NextFunction } from 'express'
import { CreditOrderModel } from '@/models/creditOrder.model'
import { PaymentService } from '@/services/payment.service'
import { success, paginated, createError } from '@/utils/response'
import { parsePagination } from '@/types/api.types'

export const AdminOrderController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query as { page?: string; limit?: string })
      const status = req.query.status as string | undefined
      const { rows, total } = await CreditOrderModel.findAll({
        status: status as 'pending' | 'paid' | 'failed' | 'expired' | undefined,
        page,
        limit,
      })
      return res.json(paginated(rows, total, page, limit))
    } catch (err) { next(err) }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const order = await CreditOrderModel.findById(id)
      if (!order) return next(createError('NOT_FOUND', 'Không tìm thấy đơn hàng', 404))
      return res.json(success(order))
    } catch (err) { next(err) }
  },

  async manualFulfill(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const order = await CreditOrderModel.findById(id)
      if (!order) return next(createError('NOT_FOUND', 'Không tìm thấy đơn hàng', 404))
      if (order.status === 'paid') return next(createError('ALREADY_PAID', 'Đơn hàng đã được xử lý', 400))

      await PaymentService.fulfillOrder(order, `manual_${req.user!.id}_${Date.now()}`)
      const updated = await CreditOrderModel.findById(id)
      return res.json(success(updated, 'Xác nhận thanh toán thành công'))
    } catch (err) { next(err) }
  },

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const order = await CreditOrderModel.findById(id)
      if (!order) return next(createError('NOT_FOUND', 'Không tìm thấy đơn hàng', 404))
      if (order.status !== 'pending') return next(createError('INVALID_STATUS', 'Chỉ có thể hủy đơn hàng đang chờ xử lý', 400))

      await CreditOrderModel.update(id, { status: 'failed' })
      return res.json(success(null, 'Đã hủy đơn hàng'))
    } catch (err) { next(err) }
  },
}
