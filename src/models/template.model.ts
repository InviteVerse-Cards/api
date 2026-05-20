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
  sort_order: number
  is_active: number
  default_config: string
  theme_config: string | null
  default_music_track_id: number | null
  layout_type?: string | null
  created_at?: string
}

export interface TemplateSectionRow {
  id: number
  template_id: number
  section_type: string
  sort_order: number
  is_enabled: boolean
  config: Record<string, unknown>
}

export interface FullTemplateData extends TemplateRow {
  theme_config_parsed: Record<string, unknown>
  sections: TemplateSectionRow[]
  default_music_track: { id: number; name: string; url: string } | null
}

interface TemplateSectionRowPacket extends RowDataPacket {
  id: number
  template_id: number
  section_type: string
  sort_order: number
  is_enabled: number
  config: string | Record<string, unknown>
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
       ORDER BY t.sort_order ASC, t.plan_required ASC, t.use_count DESC`,
      params
    )
    return rows
  },

  async findAllAdmin(): Promise<TemplateRow[]> {
    const [rows] = await pool.query<TemplateRowPacket[]>(
      `SELECT t.*, tc.slug as category_slug
       FROM templates t
       JOIN template_categories tc ON t.category_id = tc.id
       ORDER BY tc.sort_order ASC, t.sort_order ASC, t.is_active DESC`
    )
    return rows
  },

  async reorderCategory(items: { uuid: string; sort_order: number }[]): Promise<void> {
    for (const item of items) {
      await pool.query(
        'UPDATE templates SET sort_order = ?, updated_at = NOW() WHERE uuid = ?',
        [item.sort_order, item.uuid]
      )
    }
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

  async findByUuidFull(uuid: string): Promise<FullTemplateData | null> {
    const [rows] = await pool.query<Array<TemplateRow & RowDataPacket>>(
      `SELECT t.*, tc.slug as category_slug
       FROM templates t
       JOIN template_categories tc ON t.category_id = tc.id
       WHERE t.uuid = ?`,
      [uuid]
    )
    if (!rows[0]) return null
    return TemplateModel._buildFullData(rows[0])
  },

  async findBySlugFull(slug: string): Promise<FullTemplateData | null> {
    const [rows] = await pool.query<Array<TemplateRow & RowDataPacket>>(
      `SELECT t.*, tc.slug as category_slug
       FROM templates t
       JOIN template_categories tc ON t.category_id = tc.id
       WHERE t.slug = ? AND t.is_active = 1`,
      [slug]
    )
    if (!rows[0]) return null
    return TemplateModel._buildFullData(rows[0])
  },

  async _buildFullData(template: TemplateRow): Promise<FullTemplateData> {
    // Fetch template_sections
    const [sectionRows] = await pool.query<TemplateSectionRowPacket[]>(
      `SELECT id, template_id, section_type, sort_order, is_enabled, config
       FROM template_sections
       WHERE template_id = ?
       ORDER BY sort_order ASC`,
      [template.id]
    )

    // Fetch default music track
    let defaultMusicTrack: { id: number; name: string; url: string } | null = null
    if (template.default_music_track_id) {
      const [trackRows] = await pool.query<Array<{ id: number; name: string; url: string } & RowDataPacket>>(
        'SELECT id, name, url FROM music_tracks WHERE id = ?',
        [template.default_music_track_id]
      )
      defaultMusicTrack = trackRows[0] ?? null
    }

    const sections: TemplateSectionRow[] = sectionRows.map(s => ({
      id: s.id,
      template_id: s.template_id,
      section_type: s.section_type,
      sort_order: s.sort_order,
      is_enabled: Boolean(s.is_enabled),
      config: typeof s.config === 'string' ? JSON.parse(s.config) : (s.config as Record<string, unknown>),
    }))

    // Parse theme_config — prefer new column, fallback to default_config.theme
    let themeConfigParsed: Record<string, unknown> = {}
    if (template.theme_config) {
      try {
        themeConfigParsed = typeof template.theme_config === 'string'
          ? JSON.parse(template.theme_config)
          : (template.theme_config as Record<string, unknown>)
      } catch {}
    }
    if (Object.keys(themeConfigParsed).length === 0) {
      const parsed = TemplateModel.parseDefaultConfig(template)
      themeConfigParsed = (parsed.theme as Record<string, unknown>) ?? {}
    }

    // If no template_sections yet, fall back to default_config sections
    if (sections.length === 0) {
      const parsed = TemplateModel.parseDefaultConfig(template)
      const fallback = (parsed.sections as Array<Record<string, unknown>>) ?? []
      return {
        ...template,
        theme_config_parsed: themeConfigParsed,
        sections: fallback.map((s, idx) => ({
          id: 0,
          template_id: template.id,
          section_type: s.section_type as string,
          sort_order: typeof s.sort_order === 'number' ? s.sort_order : idx,
          is_enabled: s.is_enabled !== false,
          config: (s.config as Record<string, unknown>) ?? {},
        })),
        default_music_track: defaultMusicTrack,
      }
    }

    return { ...template, theme_config_parsed: themeConfigParsed, sections, default_music_track: defaultMusicTrack }
  },

  async updateThemeConfig(uuid: string, theme: Record<string, unknown>): Promise<void> {
    await pool.query(
      'UPDATE templates SET theme_config = ?, updated_at = NOW() WHERE uuid = ?',
      [JSON.stringify(theme), uuid]
    )
  },

  async upsertSections(templateId: number, sections: Array<{
    section_type: string
    sort_order: number
    is_enabled: boolean
    config: Record<string, unknown>
  }>): Promise<void> {
    if (sections.length === 0) return
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      await conn.query('DELETE FROM template_sections WHERE template_id = ?', [templateId])
      const values = sections.map(s => [
        templateId, s.section_type, s.sort_order, s.is_enabled ? 1 : 0, JSON.stringify(s.config),
      ])
      await conn.query(
        `INSERT INTO template_sections (template_id, section_type, sort_order, is_enabled, config)
         VALUES ?`,
        [values]
      )
      await conn.commit()
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  },

  async setDefaultMusic(uuid: string, trackId: number | null): Promise<void> {
    await pool.query(
      'UPDATE templates SET default_music_track_id = ?, updated_at = NOW() WHERE uuid = ?',
      [trackId, uuid]
    )
  },
}
