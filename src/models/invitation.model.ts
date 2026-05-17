import pool from '@/config/database'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'

export interface InvitationRow {
  id: number
  uuid: string
  user_id: number
  template_id: number | null
  slug: string
  title: string
  category: string
  status: 'draft' | 'published' | 'archived'
  theme_config: string | Record<string, unknown>
  watermark: number
  view_count: number
  qr_code_url: string | null
  og_image_url: string | null
  meta_title: string | null
  meta_description: string | null
  password: string | null
  published_at: Date | null
  expires_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface SectionRow {
  id: number
  invitation_id: number
  section_type: string
  sort_order: number
  is_enabled: number
  config: string | Record<string, unknown>
}

interface InvRow extends InvitationRow, RowDataPacket {}
interface SecRow extends SectionRow, RowDataPacket {}
interface CountRow extends RowDataPacket { total: number }

function parseJSON<T>(val: T | string): T {
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return {} as T }
  }
  return val
}

export const InvitationModel = {
  async findByUuid(uuid: string): Promise<InvitationRow | null> {
    const [rows] = await pool.query<InvRow[]>(
      `SELECT id, uuid, user_id, template_id, slug, title, category, status,
              theme_config, watermark, view_count, qr_code_url, og_image_url,
              meta_title, meta_description, password, published_at, expires_at, created_at, updated_at
       FROM invitations WHERE uuid = ? AND deleted_at IS NULL`,
      [uuid]
    )
    if (!rows[0]) return null
    return { ...rows[0], theme_config: parseJSON(rows[0].theme_config) }
  },

  async findBySlug(slug: string): Promise<InvitationRow | null> {
    const [rows] = await pool.query<InvRow[]>(
      `SELECT id, uuid, user_id, slug, title, category, status, theme_config,
              watermark, view_count, qr_code_url, og_image_url, meta_title, meta_description,
              password, published_at, expires_at, created_at, updated_at
       FROM invitations WHERE slug = ? AND deleted_at IS NULL`,
      [slug]
    )
    if (!rows[0]) return null
    return { ...rows[0], theme_config: parseJSON(rows[0].theme_config) }
  },

  async findByUser(userId: number, opts: { limit: number; offset: number; status?: string }): Promise<{ rows: InvitationRow[]; total: number }> {
    const conditions = ['user_id = ?', 'deleted_at IS NULL']
    const params: unknown[] = [userId]

    if (opts.status) {
      conditions.push('status = ?')
      params.push(opts.status)
    }

    const where = `WHERE ${conditions.join(' AND ')}`

    const [[countRow]] = await pool.query<CountRow[]>(
      `SELECT COUNT(*) as total FROM invitations ${where}`, params
    )

    const [rows] = await pool.query<InvRow[]>(
      `SELECT id, uuid, slug, title, category, status, theme_config, watermark,
              view_count, qr_code_url, published_at, created_at, updated_at
       FROM invitations ${where}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, opts.limit, opts.offset]
    )

    return {
      rows: rows.map(r => ({ ...r, theme_config: parseJSON(r.theme_config) })),
      total: countRow?.total ?? 0,
    }
  },

  async countByUser(userId: number): Promise<number> {
    const [[row]] = await pool.query<CountRow[]>(
      'SELECT COUNT(*) as total FROM invitations WHERE user_id = ? AND deleted_at IS NULL',
      [userId]
    )
    return row?.total ?? 0
  },

  async create(data: {
    userId: number; templateId: number | null; slug: string; title: string
    category: string; themeConfig: Record<string, unknown>; watermark: boolean
  }): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO invitations (uuid, user_id, template_id, slug, title, category, status, theme_config, watermark)
       VALUES (UUID(), ?, ?, ?, ?, ?, 'draft', ?, ?)`,
      [data.userId, data.templateId, data.slug, data.title, data.category,
       JSON.stringify(data.themeConfig), data.watermark ? 1 : 0]
    )
    return result.insertId
  },

  async updateThemeConfig(id: number, themeConfig: Record<string, unknown>): Promise<void> {
    await pool.query(
      'UPDATE invitations SET theme_config = ?, updated_at = NOW() WHERE id = ?',
      [JSON.stringify(themeConfig), id]
    )
  },

  async updateTitle(id: number, title: string): Promise<void> {
    await pool.query(
      'UPDATE invitations SET title = ?, updated_at = NOW() WHERE id = ?',
      [title, id]
    )
  },

  async publish(id: number, data: { slug: string; qrCodeUrl: string; ogImageUrl?: string | null; password?: string | null; expiresAt?: string | null }): Promise<void> {
    await pool.query(
      `UPDATE invitations SET status = 'published', slug = ?, qr_code_url = ?, og_image_url = ?,
              password = ?, expires_at = ?, published_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [data.slug, data.qrCodeUrl, data.ogImageUrl ?? null, data.password ?? null, data.expiresAt ?? null, id]
    )
  },

  async softDelete(uuid: string, userId: number): Promise<boolean> {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE invitations SET deleted_at = NOW() WHERE uuid = ? AND user_id = ?',
      [uuid, userId]
    )
    return result.affectedRows > 0
  },

  async incrementViewCount(id: number): Promise<void> {
    pool.query('UPDATE invitations SET view_count = view_count + 1 WHERE id = ?', [id])
      .catch(() => {})
  },

  async getSections(invitationId: number): Promise<SectionRow[]> {
    const [rows] = await pool.query<SecRow[]>(
      `SELECT id, invitation_id, section_type, sort_order, is_enabled, config
       FROM invitation_sections WHERE invitation_id = ? ORDER BY sort_order ASC`,
      [invitationId]
    )
    return rows.map(r => ({ ...r, config: parseJSON(r.config) }))
  },

  async upsertSection(invitationId: number, section: {
    section_type: string; sort_order: number; is_enabled: boolean; config: Record<string, unknown>
  }): Promise<void> {
    await pool.query(
      `INSERT INTO invitation_sections (invitation_id, section_type, sort_order, is_enabled, config)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order), is_enabled = VALUES(is_enabled),
         config = VALUES(config), updated_at = NOW()`,
      [invitationId, section.section_type, section.sort_order,
       section.is_enabled ? 1 : 0, JSON.stringify(section.config)]
    )
  },

  async bulkInsertSections(invitationId: number, sections: Array<{
    section_type: string; sort_order: number; is_enabled: boolean; config: Record<string, unknown>
  }>): Promise<void> {
    if (sections.length === 0) return
    const values = sections.map(s => [
      invitationId, s.section_type, s.sort_order, s.is_enabled ? 1 : 0, JSON.stringify(s.config),
    ])
    await pool.query(
      `INSERT IGNORE INTO invitation_sections (invitation_id, section_type, sort_order, is_enabled, config) VALUES ?`,
      [values]
    )
  },
}
