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
      const full = await TemplateModel.findBySlugFull(slug)
      if (!full) {
        return next(new AppError('NOT_FOUND', 'Mẫu thiệp không tồn tại', 404))
      }
      return res.json(success({
        id: full.id,
        uuid: full.uuid,
        slug: full.slug,
        name: full.name,
        description: full.description,
        thumbnail_url: full.thumbnail_url,
        plan_required: full.plan_required,
        category: full.category_slug,
        theme_config: full.theme_config_parsed,
        sections: full.sections,
        default_music_track: full.default_music_track,
      }))
    } catch (err) { next(err) }
  },

  async getMusicTracks(req: Request, res: Response, next: NextFunction) {
    try {
      const tracks = await PublicService.getMusicTracks()
      return res.json(success(tracks))
    } catch (err) { next(err) }
  },

  async getWishes(req: Request, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params
      const wishes = await PublicService.getWishes(slug)
      return res.json(success(wishes))
    } catch (err) { next(err) }
  },

  async getDefaultMusicTrack(_req: Request, res: Response, next: NextFunction) {
    try {
      const track = await MusicModel.findDefault()
      return res.json(success(track))
    } catch (err) { next(err) }
  },
}
