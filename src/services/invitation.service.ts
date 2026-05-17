import pool from '@/config/database'
import type { RowDataPacket } from 'mysql2'
import { InvitationModel } from '@/models/invitation.model'
import { TemplateModel } from '@/models/template.model'
import { generateUniqueSlug, slugifyVietnamese } from '@/utils/slugify'
import { generateQRCode } from '@/utils/qrcode'
import { AppError } from '@/utils/response'

const FREE_PLAN_LIMIT = 3

const DEFAULT_THEME = {
  primary_color: '#6366F1', secondary_color: '#A5B4FC',
  background_color: '#FFFFFF', text_color: '#1F2937',
  accent_color: '#F59E0B', font_heading: 'Playfair Display',
  font_body: 'Inter', border_radius: 'md', animation: 'fade',
}

export const InvitationService = {
  async create(userId: number, body: {
    template_id?: number
    title: string
    category?: string
  }) {
    const [userRows] = await pool.query<RowDataPacket[]>(
      'SELECT id, credits_balance FROM users WHERE id = ?', [userId]
    )
    const user = userRows[0]
    if (!user) throw new AppError('NOT_FOUND', 'Người dùng không tồn tại', 404)

    const count = await InvitationModel.countByUser(userId)
    if (count >= FREE_PLAN_LIMIT) {
      throw new AppError('PLAN_LIMIT', `Bạn đã đạt giới hạn ${FREE_PLAN_LIMIT} thiệp. Mua thêm credits để tạo thêm.`, 403)
    }

    let themeConfig: Record<string, unknown> = { ...DEFAULT_THEME }
    let defaultSections: Array<{ section_type: string; sort_order: number; is_enabled: boolean; config: Record<string, unknown> }> = []
    let templateId: number | null = null

    if (body.template_id) {
      const template = await TemplateModel.findById(body.template_id)
      if (!template) throw new AppError('NOT_FOUND', 'Template không tồn tại', 404)
      templateId = template.id
      const config = TemplateModel.parseDefaultConfig(template)
      themeConfig = config.theme as Record<string, unknown>
      defaultSections = (config.sections as typeof defaultSections) ?? []

      // Inject layout_type into hero section so InvitationRenderer can derive it
      if (config.layout_type) {
        const heroIdx = defaultSections.findIndex(s => s.section_type === 'hero')
        if (heroIdx !== -1) {
          defaultSections[heroIdx] = {
            ...defaultSections[heroIdx],
            config: { ...defaultSections[heroIdx].config, layout_type: config.layout_type },
          }
        }
      }
    }

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()

      const slug = await generateUniqueSlug(body.title)
      const [invResult] = await conn.query<import('mysql2').ResultSetHeader>(
        `INSERT INTO invitations (uuid, user_id, template_id, slug, title, category, status, theme_config, watermark)
         VALUES (UUID(), ?, ?, ?, ?, ?, 'draft', ?, 1)`,
        [userId, templateId, slug, body.title, body.category ?? 'wedding', JSON.stringify(themeConfig)]
      )
      const invId = invResult.insertId

      if (defaultSections.length > 0) {
        const values = defaultSections.map(s => [
          invId, s.section_type, s.sort_order, s.is_enabled ? 1 : 0, JSON.stringify(s.config ?? {}),
        ])
        await conn.query(
          `INSERT IGNORE INTO invitation_sections (invitation_id, section_type, sort_order, is_enabled, config) VALUES ?`,
          [values]
        )
      }

      await conn.commit()

      if (templateId) {
        TemplateModel.incrementUseCount(templateId).catch(() => {})
      }

      const uuid = await getUuidById(invId)
      return InvitationService.getOne(userId, uuid)
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  },

  async list(userId: number, opts: { page: number; limit: number; status?: string }) {
    const offset = (opts.page - 1) * opts.limit
    const { rows, total } = await InvitationModel.findByUser(userId, {
      limit: opts.limit, offset, status: opts.status,
    })

    return {
      items: rows,
      pagination: {
        total, page: opts.page, limit: opts.limit,
        total_pages: Math.ceil(total / opts.limit),
      },
    }
  },

  async getOne(userId: number, uuid: string) {
    const invitation = await InvitationModel.findByUuid(uuid)
    if (!invitation) throw new AppError('NOT_FOUND', 'Không tìm thấy thiệp', 404)
    if (invitation.user_id !== userId) throw new AppError('FORBIDDEN', 'Không có quyền truy cập', 403)

    const sections = await InvitationModel.getSections(invitation.id)
    return { ...invitation, sections }
  },

  async update(userId: number, uuid: string, body: {
    title?: string
    theme_config?: Record<string, unknown>
    sections?: Array<{ section_type: string; sort_order: number; is_enabled: boolean; config: Record<string, unknown> }>
  }) {
    const invitation = await InvitationModel.findByUuid(uuid)
    if (!invitation) throw new AppError('NOT_FOUND', 'Không tìm thấy thiệp', 404)
    if (invitation.user_id !== userId) throw new AppError('FORBIDDEN', 'Không có quyền', 403)

    if (body.title) await InvitationModel.updateTitle(invitation.id, body.title)
    if (body.theme_config) await InvitationModel.updateThemeConfig(invitation.id, body.theme_config)
    if (body.sections) {
      for (const section of body.sections) {
        await InvitationModel.upsertSection(invitation.id, section)
      }
    }

    return InvitationService.getOne(userId, uuid)
  },

  async publish(userId: number, uuid: string, opts: {
    custom_slug?: string
    password?: string
    expires_at?: string
  }) {
    const invitation = await InvitationModel.findByUuid(uuid)
    if (!invitation) throw new AppError('NOT_FOUND', 'Không tìm thấy thiệp', 404)
    if (invitation.user_id !== userId) throw new AppError('FORBIDDEN', 'Không có quyền', 403)

    let slug = invitation.slug
    if (opts.custom_slug) {
      const normalized = slugifyVietnamese(opts.custom_slug)
      if (normalized) {
        const [existing] = await pool.query<RowDataPacket[]>(
          'SELECT id FROM invitations WHERE slug = ? AND id != ?', [normalized, invitation.id]
        )
        if (existing.length > 0) {
          throw new AppError('SLUG_TAKEN', 'Đường dẫn này đã được sử dụng, hãy chọn tên khác', 409)
        }
        slug = normalized
      }
    }

    const publicUrl = `${process.env.FRONTEND_URL}/i/${slug}`
    const qrCodeUrl = await generateQRCode(publicUrl, invitation.id)

    // Extract og_image from hero section background
    const sections = await InvitationModel.getSections(invitation.id)
    const heroSection = sections.find(s => s.section_type === 'hero')
    const ogImageUrl = (heroSection?.config as Record<string, unknown>)?.background_url as string | null ?? null

    await InvitationModel.publish(invitation.id, {
      slug, qrCodeUrl, ogImageUrl,
      password: opts.password,
      expiresAt: opts.expires_at,
    })

    return { public_url: publicUrl, qr_code_url: qrCodeUrl, slug }
  },

  async remove(userId: number, uuid: string) {
    const invitation = await InvitationModel.findByUuid(uuid)
    if (!invitation) throw new AppError('NOT_FOUND', 'Không tìm thấy thiệp', 404)
    if (invitation.user_id !== userId) throw new AppError('FORBIDDEN', 'Không có quyền', 403)

    await InvitationModel.softDelete(uuid, userId)
  },
}

async function getUuidById(id: number): Promise<string> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT uuid FROM invitations WHERE id = ?', [id]
  )
  return rows[0]?.uuid ?? ''
}
