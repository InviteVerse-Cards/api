import type { Request, Response, NextFunction } from 'express'
import { success } from '@/utils/response'
import { TemplateService } from '@/services/template.service'

export const TemplateController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { category } = req.query
      const templates = await TemplateService.list({ category: category as string | undefined })
      return res.json(success(templates))
    } catch (err) { next(err) }
  },
}
