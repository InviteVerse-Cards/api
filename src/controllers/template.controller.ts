import type { Request, Response, NextFunction } from 'express'
import pool from '@/config/database'
import type { RowDataPacket } from 'mysql2'
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

  async listCategories(_req: Request, res: Response, next: NextFunction) {
    try {
      const [rows] = await pool.query<Array<{ slug: string; name: string; sort_order: number } & RowDataPacket>>(
        `SELECT slug, name, sort_order
         FROM template_categories
         WHERE is_active = 1
         ORDER BY sort_order ASC, id ASC`
      )
      return res.json(success(rows.map(r => ({ slug: r.slug, name: r.name }))))
    } catch (err) { next(err) }
  },
}
