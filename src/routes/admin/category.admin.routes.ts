import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import pool from '@/config/database'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'
import { success } from '@/utils/response'

const router = Router()

interface CategoryRow extends RowDataPacket {
  id: number
  slug: string
  name: string
  sort_order: number
  is_active: number
}

// GET /admin/categories — list all with template counts
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [rows] = await pool.query<CategoryRow[]>(
      `SELECT tc.id, tc.slug, tc.name, tc.sort_order, tc.is_active,
              COUNT(t.id)                              AS total_templates,
              SUM(CASE WHEN t.is_active = 1 THEN 1 ELSE 0 END) AS active_templates
       FROM template_categories tc
       LEFT JOIN templates t ON t.category_id = tc.id
       GROUP BY tc.id
       ORDER BY tc.sort_order ASC, tc.id ASC`
    )
    return res.json(success(rows.map(r => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      sort_order: r.sort_order,
      is_active: Boolean(r.is_active),
      total_templates: Number((r as unknown as Record<string, unknown>)['total_templates'] ?? 0),
      active_templates: Number((r as unknown as Record<string, unknown>)['active_templates'] ?? 0),
    }))))
  } catch (err) { next(err) }
})

// PUT /admin/categories/:slug/toggle — toggle is_active
router.put('/:slug/toggle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params
    const [rows] = await pool.query<CategoryRow[]>(
      'SELECT id, is_active FROM template_categories WHERE slug = ?', [slug]
    )
    if (!rows[0]) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Danh mục không tồn tại' } })
    const newActive = rows[0].is_active ? 0 : 1
    await pool.query<ResultSetHeader>(
      'UPDATE template_categories SET is_active = ? WHERE slug = ?', [newActive, slug]
    )
    return res.json(success({ is_active: Boolean(newActive) }, newActive ? 'Đã hiển thị danh mục' : 'Đã ẩn danh mục'))
  } catch (err) { next(err) }
})

// PUT /admin/categories/reorder — batch update sort_order
router.put('/reorder', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = req.body as { slug: string; sort_order: number }[]
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'items is required' } })
    }
    for (const item of items) {
      await pool.query('UPDATE template_categories SET sort_order = ? WHERE slug = ?', [item.sort_order, item.slug])
    }
    return res.json(success(null, 'Đã cập nhật thứ tự danh mục'))
  } catch (err) { next(err) }
})

export default router
