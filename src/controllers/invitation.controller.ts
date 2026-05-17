import type { Request, Response, NextFunction } from 'express'
import { success } from '@/utils/response'
import { InvitationService } from '@/services/invitation.service'
import { PublicService } from '@/services/public.service'

export const InvitationController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, Number(req.query.page) || 1)
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10))
      const { status } = req.query
      const data = await InvitationService.list(req.user!.id, { page, limit, status: status as string | undefined })
      return res.json(success(data))
    } catch (err) { next(err) }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const invitation = await InvitationService.create(req.user!.id, req.body)
      return res.status(201).json(success(invitation, 'Tạo thiệp thành công'))
    } catch (err) { next(err) }
  },

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const invitation = await InvitationService.getOne(req.user!.id, req.params.uuid)
      return res.json(success(invitation))
    } catch (err) { next(err) }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const invitation = await InvitationService.update(req.user!.id, req.params.uuid, req.body)
      return res.json(success(invitation, 'Cập nhật thành công'))
    } catch (err) { next(err) }
  },

  async publish(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await InvitationService.publish(req.user!.id, req.params.uuid, req.body)
      return res.json(success(result, 'Thiệp đã được xuất bản!'))
    } catch (err) { next(err) }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await InvitationService.remove(req.user!.id, req.params.uuid)
      return res.json(success(null, 'Đã xóa thiệp'))
    } catch (err) { next(err) }
  },

  async getGuests(req: Request, res: Response, next: NextFunction) {
    try {
      const guests = await PublicService.getGuestList(req.user!.id, req.params.uuid)
      return res.json(success(guests))
    } catch (err) { next(err) }
  },
}
