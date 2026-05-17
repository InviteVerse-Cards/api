# [SK-API-07] Invitations, Sections & Public Pages

> Trigger: Viết tính năng CRUD invitation, section management, publish flow, public page.

---

## Invitation CRUD

### Create Invitation

```typescript
// Từ template
async function createFromTemplate(userId: number, body: CreateInvitationDto) {
  // 1. Check free plan limit (max 3 invitations)
  const count = await InvitationRepository.countByUser(userId)
  const user = await UserRepository.findById(userId)
  if (user.plan === 'free' && count >= 3) {
    throw new AppError('PLAN_LIMIT', 'Free plan chỉ tạo được tối đa 3 thiệp. Nâng cấp Pro để tạo thêm.', 403)
  }

  // 2. Lấy default config từ template (nếu có)
  let defaultConfig = { theme: DEFAULT_THEME, sections: DEFAULT_SECTIONS }
  if (body.template_id) {
    const template = await TemplateRepository.findById(body.template_id)
    if (!template) throw new AppError('NOT_FOUND', 'Template không tồn tại', 404)
    if (template.plan_required === 'pro' && user.plan === 'free') {
      throw new AppError('PLAN_REQUIRED', 'Template này yêu cầu gói Pro', 403)
    }
    defaultConfig = template.default_config
  }

  // 3. Generate unique slug
  const slug = await generateUniqueSlug(body.title)

  // 4. Insert invitation + sections trong transaction
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [invResult] = await conn.query<ResultSetHeader>(
      `INSERT INTO invitations (uuid, user_id, template_id, slug, title, category, status, theme_config, watermark)
       VALUES (UUID(), ?, ?, ?, ?, ?, 'draft', ?, ?)`,
      [userId, body.template_id ?? null, slug, body.title, body.category,
       JSON.stringify(body.theme_config ?? defaultConfig.theme),
       user.plan === 'free' ? 1 : 0]
    )
    const invitationId = invResult.insertId

    // Insert default sections
    const sections = body.sections ?? defaultConfig.sections
    if (sections.length > 0) {
      const sectionValues = sections.map((s, i) => [
        invitationId, s.section_type, i, s.is_enabled ? 1 : 0, JSON.stringify(s.config ?? {}),
      ])
      await conn.query(
        `INSERT INTO invitation_sections (invitation_id, section_type, sort_order, is_enabled, config)
         VALUES ?`,
        [sectionValues]
      )
    }

    await conn.commit()

    // Tăng template use_count
    if (body.template_id) {
      pool.query('UPDATE templates SET use_count = use_count + 1 WHERE id = ?', [body.template_id])
    }

    return InvitationRepository.findByIdFull(invitationId)
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}
```

---

## Slug Generation

```typescript
// shared/utils/slugify.ts
import { customAlphabet } from 'nanoid'
const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)

export function slugifyVietnamese(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')    // Bỏ dấu tiếng Việt
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/^-|-$/g, '')
}

export async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugifyVietnamese(title) || 'thiep'
  let slug = `${base}-${nanoid()}`

  // Đảm bảo unique trong DB
  let attempts = 0
  while (attempts < 5) {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM invitations WHERE slug = ?', [slug]
    )
    if (rows.length === 0) return slug
    slug = `${base}-${nanoid()}`
    attempts++
  }
  return `${base}-${Date.now()}`  // Fallback
}
```

---

## Update Sections (partial update)

```typescript
async function updateSections(invitationId: number, sections: SectionUpdate[]) {
  for (const section of sections) {
    if (section.id) {
      // Update existing section
      await pool.query(
        `UPDATE invitation_sections
         SET config = ?, is_enabled = ?, sort_order = ?, updated_at = NOW()
         WHERE id = ? AND invitation_id = ?`,
        [JSON.stringify(section.config), section.is_enabled ? 1 : 0, section.sort_order,
         section.id, invitationId]
      )
    } else {
      // Insert new section
      await pool.query(
        `INSERT INTO invitation_sections (invitation_id, section_type, sort_order, is_enabled, config)
         VALUES (?, ?, ?, ?, ?)`,
        [invitationId, section.section_type, section.sort_order,
         section.is_enabled ? 1 : 0, JSON.stringify(section.config ?? {})]
      )
    }
  }
}
```

---

## Publish Flow

```typescript
async function publishInvitation(invitationId: number, userId: number, opts: PublishOptions) {
  const invitation = await assertOwner(invitationId, userId)

  // Custom slug nếu user muốn
  let slug = invitation.slug
  if (opts.custom_slug) {
    const normalized = slugifyVietnamese(opts.custom_slug)
    const [existing] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM invitations WHERE slug = ? AND id != ?', [normalized, invitationId]
    )
    if ((existing as RowDataPacket[]).length > 0) {
      throw new AppError('SLUG_TAKEN', 'Đường dẫn này đã được sử dụng, vui lòng chọn tên khác', 409)
    }
    slug = normalized
  }

  // Generate QR code
  const publicUrl = `${process.env.FRONTEND_URL}/i/${slug}`
  const qrCodeUrl = await generateQRCode(publicUrl, invitationId)

  // Generate og:image (thumbnail)
  const ogImageUrl = await generateOGImage(invitation)

  // Update invitation
  await pool.query(
    `UPDATE invitations SET
       status = 'published', slug = ?, qr_code_url = ?, og_image_url = ?,
       published_at = NOW(), expires_at = ?, password = ?, updated_at = NOW()
     WHERE id = ?`,
    [slug, qrCodeUrl, ogImageUrl, opts.expires_at ?? null, opts.password ?? null, invitationId]
  )

  return { public_url: publicUrl, qr_code_url: qrCodeUrl, slug }
}
```

---

## QR Code Generation

```typescript
// shared/utils/qrcode.ts
import QRCode from 'qrcode'
import cloudinary from '@/config/cloudinary'

export async function generateQRCode(url: string, invitationId: number): Promise<string> {
  // Generate QR buffer
  const buffer = await QRCode.toBuffer(url, {
    width: 300,
    margin: 2,
    color: { dark: '#1a1a1a', light: '#ffffff' },
  })

  // Upload to Cloudinary
  const result = await new Promise<cloudinary.UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'inviteverse/qr', public_id: `qr_${invitationId}`, overwrite: true },
      (err, res) => err ? reject(err) : resolve(res!)
    )
    stream.end(buffer)
  })

  return result.secure_url
}
```

---

## Public Invitation API (No Auth)

```typescript
// modules/public/public.controller.ts
export const PublicController = {
  getInvitation: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params
      const { password } = req.query

      const invitation = await PublicService.getPublishedInvitation(slug)
      if (!invitation) {
        return next(new AppError('NOT_FOUND', 'Thiệp không tồn tại hoặc chưa được xuất bản', 404))
      }

      // Kiểm tra password nếu có
      if (invitation.password && invitation.password !== password) {
        return res.status(403).json({
          success: false,
          error: { code: 'PASSWORD_REQUIRED', message: 'Thiệp này được bảo vệ bằng mật khẩu' },
        })
      }

      // Tăng view count (không cần await)
      InvitationRepository.incrementViewCount(invitation.id)

      // Không trả user info, chỉ trả invitation data
      const { user_id, password: _pw, ...safeData } = invitation
      return res.json(success({
        ...safeData,
        meta: {
          title: invitation.meta_title || invitation.title,
          description: invitation.meta_description,
          og_image: invitation.og_image_url,
        },
      }))
    } catch (err) {
      next(err)
    }
  },

  submitRSVP: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params
      const { name, phone, email, status, note } = req.body

      const invitation = await InvitationRepository.findBySlug(slug)
      if (!invitation || invitation.status !== 'published') {
        return next(new AppError('NOT_FOUND', 'Thiệp không tồn tại', 404))
      }

      await pool.query(
        `INSERT INTO guests (invitation_id, name, phone, email, rsvp_status, rsvp_note, rsvp_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [invitation.id, name, phone ?? null, email ?? null, status, note ?? null]
      )

      return res.status(201).json(success(null, 'Xác nhận tham dự thành công!'))
    } catch (err) {
      next(err)
    }
  },
}
```

---

## View Count Increment

```typescript
// Tăng view_count KHÔNG blocking (fire and forget)
// Không cần await — không ảnh hưởng response time
pool.query(
  'UPDATE invitations SET view_count = view_count + 1 WHERE id = ?',
  [invitationId]
).catch(err => logger.warn('Failed to increment view count:', err))
```

---

## Section Types Reference

```typescript
type SectionType =
  | 'hero'        // Màn hình chào, ảnh nền, tên đôi uyên ương
  | 'event_info'  // Thông tin lễ cưới (ngày, giờ, địa điểm)
  | 'gallery'     // Bộ ảnh (grid/masonry/slider)
  | 'timeline'    // Hành trình tình yêu
  | 'countdown'   // Đếm ngược đến ngày cưới
  | 'rsvp'        // Xác nhận tham dự
  | 'map'         // Bản đồ địa điểm
  | 'music'       // Nhạc nền autoplay
  | 'wishes'      // Lời chúc từ khách

// Mỗi section có config khác nhau (xem WORKFLOW.md section 6.2 để biết chi tiết)
```
