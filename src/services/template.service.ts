import pool from '@/config/database'
import type { RowDataPacket } from 'mysql2'
import { TemplateModel, type CreateTemplateDto, type UpdateTemplateDto } from '@/models/template.model'
import { AppError } from '@/utils/response'

function formatRow(r: Awaited<ReturnType<typeof TemplateModel.findAll>>[number]) {
  const config = TemplateModel.parseDefaultConfig(r)
  // mysql2 may return JSON columns as objects — normalize to string for frontend
  const defaultConfigStr = typeof r.default_config === 'string'
    ? r.default_config
    : JSON.stringify(r.default_config)

  // Extract hero section config so the frontend can render an accurate thumbnail
  const sections = config.sections as Array<{ section_type: string; config: Record<string, unknown> }> | undefined
  const heroConfig = sections?.find(s => s.section_type === 'hero')?.config ?? null

  // Extract root-level layout_type (set by migration 032)
  const layoutType = (config.layout_type as string | undefined) ?? 'botanical'

  return {
    id: r.id,
    uuid: r.uuid,
    slug: r.slug,
    name: r.name,
    description: r.description,
    thumbnail_url: r.thumbnail_url,
    preview_url: r.preview_url,
    plan_required: r.plan_required,
    category: r.category_slug,
    use_count: r.use_count,
    is_active: Boolean(r.is_active),
    default_config: defaultConfigStr,
    theme_preview: config.theme ?? {},
    hero_config: heroConfig,
    layout_type: layoutType,
    created_at: r.created_at,
  }
}

export const TemplateService = {
  async list(opts: { category?: string }) {
    const rows = await TemplateModel.findAll({ categorySlug: opts.category })
    return rows.map(formatRow)
  },

  async listForAdmin() {
    const rows = await TemplateModel.findAllAdmin()
    return rows.map(formatRow)
  },

  async getOneForAdmin(uuid: string) {
    const row = await TemplateModel.findByUuid(uuid)
    if (!row) throw new AppError('NOT_FOUND', 'Template không tồn tại', 404)
    return formatRow(row)
  },

  async create(dto: {
    category: string
    slug: string
    name: string
    description?: string
    thumbnail_url?: string
    preview_url?: string
    plan_required: 'free' | 'pro'
    default_config: string
  }) {
    // Validate JSON
    try {
      JSON.parse(dto.default_config)
    } catch {
      throw new AppError('VALIDATION_ERROR', 'default_config phải là JSON hợp lệ', 400)
    }

    // Tìm category_id
    const [cats] = await pool.query<Array<{ id: number } & RowDataPacket>>(
      'SELECT id FROM template_categories WHERE slug = ?',
      [dto.category]
    )
    if (!cats[0]) throw new AppError('NOT_FOUND', `Category "${dto.category}" không tồn tại`, 400)

    // Check slug unique
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM templates WHERE slug = ?',
      [dto.slug]
    )
    if (existing.length > 0) throw new AppError('CONFLICT', 'Slug đã tồn tại, vui lòng chọn slug khác', 409)

    const createDto: CreateTemplateDto = {
      category_id: cats[0].id,
      slug: dto.slug,
      name: dto.name,
      description: dto.description,
      thumbnail_url: dto.thumbnail_url,
      preview_url: dto.preview_url,
      plan_required: dto.plan_required,
      default_config: dto.default_config,
    }

    const insertId = await TemplateModel.create(createDto)
    const [rows] = await pool.query<Array<{ uuid: string } & RowDataPacket>>(
      'SELECT uuid FROM templates WHERE id = ?',
      [insertId]
    )
    return this.getOneForAdmin(rows[0].uuid)
  },

  async update(uuid: string, dto: {
    name?: string
    description?: string
    thumbnail_url?: string
    preview_url?: string
    plan_required?: 'free' | 'pro'
    is_active?: boolean
    default_config?: string
  }) {
    const existing = await TemplateModel.findByUuid(uuid)
    if (!existing) throw new AppError('NOT_FOUND', 'Template không tồn tại', 404)

    if (dto.default_config !== undefined) {
      try {
        JSON.parse(dto.default_config)
      } catch {
        throw new AppError('VALIDATION_ERROR', 'default_config phải là JSON hợp lệ', 400)
      }
    }

    const updateDto: UpdateTemplateDto = {
      name: dto.name,
      description: dto.description,
      thumbnail_url: dto.thumbnail_url,
      preview_url: dto.preview_url,
      plan_required: dto.plan_required,
      is_active: dto.is_active,
      default_config: dto.default_config,
    }

    await TemplateModel.update(uuid, updateDto)
    return this.getOneForAdmin(uuid)
  },

  async remove(uuid: string) {
    const existing = await TemplateModel.findByUuid(uuid)
    if (!existing) throw new AppError('NOT_FOUND', 'Template không tồn tại', 404)
    await TemplateModel.softDelete(uuid)
  },
}
