import type { Request, Response, NextFunction } from 'express'
import { success, paginated, createError } from '@/utils/response'
import { parsePagination } from '@/types/api.types'
import { AdminInvitationService } from '@/services/adminInvitation.service'

export const AdminInvitationController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query as { page?: string; limit?: string })
      const search = req.query.search as string | undefined
      const category = req.query.category as string | undefined
      const status = req.query.status as string | undefined

      const { rows, total } = await AdminInvitationService.findAll({
        search,
        category,
        status,
        page,
        limit
      })

      return res.json(paginated(rows, total, page, limit))
    } catch (err) {
      next(err)
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { uuid } = req.params
      const deleted = await AdminInvitationService.delete(uuid)
      if (!deleted) {
        return next(createError('NOT_FOUND', 'Không tìm thấy thiệp mời hoặc thiệp mời đã bị xoá', 404))
      }
      return res.json(success(null, 'Đã xoá thiệp mời thành công'))
    } catch (err) {
      next(err)
    }
  }
}
