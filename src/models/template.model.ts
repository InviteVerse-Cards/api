import pool from '@/config/database'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'

export interface TemplateRow {
  id: number
  uuid: string
  category_id: number
  category_slug: string
  slug: string
  name: string
  description: string | null
  preview_url: string | null
  thumbnail_url: string | null
  plan_required: 'free' | 'pro'
  use_count: number
  is_active: number
  default_config: string
  created_at?: string
}

export interface CreateTemplateDto {
  category_id: number
  slug: string
  name: string
  description?: string
  thumbnail_url?: string
  preview_url?: string
  plan_required: 'free' | 'pro'
  default_config: string
}

export interface UpdateTemplateDto {
  name?: string
  description?: string
  thumbnail_url?: string
  preview_url?: string
  plan_required?: 'free' | 'pro'
  is_active?: boolean
  default_config?: string
}

interface TemplateRowPacket extends TemplateRow, RowDataPacket {}

export const TemplateModel = {
  async findAll(opts: { categorySlug?: string; planRequired?: 'free' | 'pro' }): Promise<TemplateRow[]> {
    const conditions: string[] = ['t.is_active = 1']
    const params: unknown[] = []

    if (opts.categorySlug) {
      conditions.push('tc.slug = ?')
      params.push(opts.categorySlug)
    }
    if (opts.planRequired) {
      conditions.push('t.plan_required = ?')
      params.push(opts.planRequired)
    }

    const where = `WHERE ${conditions.join(' AND ')}`
    const [rows] = await pool.query<TemplateRowPacket[]>(
      `SELECT t.*, tc.slug as category_slug
       FROM templates t
       JOIN template_categories tc ON t.category_id = tc.id
       ${where}
       ORDER BY t.plan_required ASC, t.use_count DESC`,
      params
    )
    return rows
  },

  async findAllAdmin(): Promise<TemplateRow[]> {
    const [rows] = await pool.query<TemplateRowPacket[]>(
      `SELECT t.*, tc.slug as category_slug
       FROM templates t
       JOIN template_categories tc ON t.category_id = tc.id
       ORDER BY t.is_active DESC, t.plan_required ASC, t.use_count DESC`
    )
    return rows
  },

  async findById(id: number): Promise<TemplateRow | null> {
    const [rows] = await pool.query<TemplateRowPacket[]>(
      `SELECT t.*, tc.slug as category_slug
       FROM templates t
       JOIN template_categories tc ON t.category_id = tc.id
       WHERE t.id = ? AND t.is_active = 1`,
      [id]
    )
    return rows[0] ?? null
  },

  async findByUuid(uuid: string): Promise<TemplateRow | null> {
    const [rows] = await pool.query<TemplateRowPacket[]>(
      `SELECT t.*, tc.slug as category_slug
       FROM templates t
       JOIN template_categories tc ON t.category_id = tc.id
       WHERE t.uuid = ?`,
      [uuid]
    )
    return rows[0] ?? null
  },

  async create(dto: CreateTemplateDto): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO templates (uuid, category_id, slug, name, description, thumbnail_url, preview_url, plan_required, default_config)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dto.category_id,
        dto.slug,
        dto.name,
        dto.description ?? null,
        dto.thumbnail_url ?? null,
        dto.preview_url ?? null,
        dto.plan_required,
        dto.default_config,
      ]
    )
    return result.insertId
  },

  async update(uuid: string, dto: UpdateTemplateDto): Promise<void> {
    const fields: string[] = []
    const params: unknown[] = []

    if (dto.name !== undefined) { fields.push('name = ?'); params.push(dto.name) }
    if (dto.description !== undefined) { fields.push('description = ?'); params.push(dto.description) }
    if (dto.thumbnail_url !== undefined) { fields.push('thumbnail_url = ?'); params.push(dto.thumbnail_url) }
    if (dto.preview_url !== undefined) { fields.push('preview_url = ?'); params.push(dto.preview_url) }
    if (dto.plan_required !== undefined) { fields.push('plan_required = ?'); params.push(dto.plan_required) }
    if (dto.is_active !== undefined) { fields.push('is_active = ?'); params.push(dto.is_active ? 1 : 0) }
    if (dto.default_config !== undefined) { fields.push('default_config = ?'); params.push(dto.default_config) }

    if (fields.length === 0) return

    fields.push('updated_at = NOW()')
    params.push(uuid)

    await pool.query(
      `UPDATE templates SET ${fields.join(', ')} WHERE uuid = ?`,
      params
    )
  },

  async softDelete(uuid: string): Promise<void> {
    await pool.query(
      `UPDATE templates SET is_active = 0, updated_at = NOW() WHERE uuid = ?`,
      [uuid]
    )
  },

  async findBySlug(slug: string): Promise<TemplateRow | null> {
    const [rows] = await pool.query<TemplateRowPacket[]>(
      `SELECT t.*, tc.slug as category_slug
       FROM templates t
       JOIN template_categories tc ON t.category_id = tc.id
       WHERE t.slug = ? AND t.is_active = 1`,
      [slug]
    )
    return rows[0] ?? null
  },

  async incrementUseCount(id: number): Promise<void> {
    await pool.query('UPDATE templates SET use_count = use_count + 1 WHERE id = ?', [id])
  },

  parseDefaultConfig(row: TemplateRow): { theme: Record<string, unknown>; sections: unknown[]; layout_type?: string } {
    try {
      return typeof row.default_config === 'string'
        ? JSON.parse(row.default_config)
        : row.default_config as { theme: Record<string, unknown>; sections: unknown[]; layout_type?: string }
    } catch {
      return { theme: {}, sections: [] }
    }
  },
}
