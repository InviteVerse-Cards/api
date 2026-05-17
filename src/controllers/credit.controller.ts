import type { Request, Response, NextFunction } from 'express'
import { PaymentService } from '@/services/payment.service'
import { CreditPackageModel } from '@/models/creditPackage.model'
import { CreditOrderModel } from '@/models/creditOrder.model'
import { success, paginated, createError } from '@/utils/response'
import { parsePagination } from '@/types/api.types'
import { getCreditsStatus } from '@/middleware/checkCredits'

export const CreditController = {
  async getBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user!
      const status = getCreditsStatus(user.credits_balance, user.credits_expires_at)

      let daysRemaining: number | null = null
      if (user.credits_expires_at && status === 'active') {
        const diff = new Date(user.credits_expires_at).getTime() - Date.now()
        daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
      }

      return res.json(success({
        credits_balance: user.credits_balance,
        credits_expires_at: user.credits_expires_at?.toISOString() ?? null,
        credits_status: status,
        days_remaining: daysRemaining,
      }))
    } catch (err) { next(err) }
  },

  async getPackages(_req: Request, res: Response, next: NextFunction) {
    try {
      const packages = await CreditPackageModel.findAll()
      return res.json(success(packages))
    } catch (err) { next(err) }
  },

  async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const packageId = Number(req.body.package_id)
      const { order, qrUrl, qrDataURL } = await PaymentService.createOrder(req.user!.id, packageId)

      return res.status(201).json(success({
        order_id: order.id,
        topup_code: order.topup_code,
        amount: order.amount,
        credits: order.credits,
        qr_expires_at: order.qr_expires_at,
        qr_url: qrUrl,
        qr_data_url: qrDataURL,
        bank_name: process.env.BANK_NAME,
        bank_number: process.env.BANK_NUMBER,
        bank_account_holder: process.env.BANK_ACCOUNT_HOLDER,
      }, 'Tạo đơn hàng thành công'))
    } catch (err) { next(err) }
  },

  async pollOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = Number(req.params.id)
      // Use shorter timeout for HTTP response (client will re-poll if needed)
      const { paid, order } = await PaymentService.checkOrderPaid(orderId, req.user!.id)

      return res.json(success({
        paid,
        status: order.status,
        credits: paid ? order.credits : undefined,
        paid_at: order.paid_at,
      }, paid ? 'Thanh toán thành công' : 'Chưa nhận được thanh toán'))
    } catch (err) { next(err) }
  },

  async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query as { page?: string; limit?: string })
      const { rows, total } = await CreditOrderModel.findAll({
        userId: req.user!.id,
        page,
        limit,
      })
      return res.json(paginated(rows, total, page, limit))
    } catch (err) { next(err) }
  },

  async getOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id)
      const order = await CreditOrderModel.findByIdAndUser(id, req.user!.id)
      if (!order) return next(createError('NOT_FOUND', 'Đơn hàng không tồn tại', 404))
      return res.json(success(order))
    } catch (err) { next(err) }
  },
}
