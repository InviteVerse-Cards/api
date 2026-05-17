import type { Request, Response, NextFunction } from 'express'
import { success } from '@/utils/response'
import { AppError } from '@/utils/response'
import { PublicService } from '@/services/public.service'
import { TemplateModel } from '@/models/template.model'
import { MusicModel } from '@/models/music.model'

export const PublicController = {
  async getInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params
      const { password } = req.query
      const invitation = await PublicService.getPublishedInvitation(slug, password as string | undefined)
      return res.json(success(invitation))
    } catch (err) { next(err) }
  },

  async submitRSVP(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params
      await PublicService.submitRSVP(slug, req.body)
      return res.status(201).json(success(null, 'Xác nhận tham dự thành công!'))
    } catch (err) { next(err) }
  },

  async getTemplateDemo(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params
      const template = await TemplateModel.findBySlug(slug)
      if (!template) {
        return next(new AppError('NOT_FOUND', 'Mẫu thiệp không tồn tại', 404))
      }
      const defaultConfig = TemplateModel.parseDefaultConfig(template)
      return res.json(success({
        id: template.id,
        slug: template.slug,
        name: template.name,
        description: template.description,
        thumbnail_url: template.thumbnail_url,
        plan_required: template.plan_required,
        default_config: defaultConfig,
      }))
    } catch (err) { next(err) }
  },

  async getMusicTracks(req: Request, res: Response, next: NextFunction) {
    try {
      const tracks = await PublicService.getMusicTracks()
      return res.json(success(tracks))
    } catch (err) { next(err) }
  },

  async getDefaultMusicTrack(_req: Request, res: Response, next: NextFunction) {
    try {
      const track = await MusicModel.findDefault()
      return res.json(success(track))
    } catch (err) { next(err) }
  },
}
