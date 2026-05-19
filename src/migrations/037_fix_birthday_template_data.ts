import type { Pool } from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2'

interface TemplateRow extends RowDataPacket {
  id: number
  slug: string
  default_config: unknown
}

// Birthday-appropriate Unsplash gallery images
const BIRTHDAY_GALLERY_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=80', caption: 'Khoảnh khắc đáng nhớ' },
  { url: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=600&q=80', caption: 'Ngày vui đặc biệt' },
  { url: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&q=80', caption: 'Cùng nhau chúc mừng' },
]

// Birthday-appropriate timeline milestones
const BIRTHDAY_TIMELINE_EVENTS = [
  { date: '', title: 'Ngày đầu tiên chào đời', description: 'Một sinh linh bé nhỏ cất tiếng khóc chào đời, mang theo bao niềm vui và hạnh phúc.' },
  { date: '', title: 'Những bước đi đầu tiên', description: 'Từng bước chân nhỏ bé bước vào thế giới rộng lớn đầy màu sắc.' },
  { date: '', title: 'Trưởng thành theo năm tháng', description: 'Mỗi năm qua là một trang ký ức đẹp đẽ, một hành trình đáng tự hào.' },
]

// Baby shower timeline milestones
const BABY_TIMELINE_EVENTS = [
  { date: '', title: 'Tin vui đón chào', description: 'Niềm hạnh phúc lớn lao khi hay tin bé cưng sắp chào đời.' },
  { date: '', title: 'Chào đón bé yêu', description: 'Khoảnh khắc thiêng liêng khi thiên thần nhỏ cất tiếng khóc đầu tiên.' },
  { date: '', title: 'Tròn 1 tuổi', description: 'Một năm bé lớn lên từng ngày, mang lại bao nụ cười và yêu thương.' },
]

// House warming timeline events
const HOUSE_WARMING_TIMELINE_EVENTS = [
  { date: '', title: 'Tìm kiếm tổ ấm', description: 'Hành trình tìm kiếm ngôi nhà mơ ước của gia đình.' },
  { date: '', title: 'Ngày chính thức về nhà', description: 'Bước qua ngưỡng cửa mới, bắt đầu chương mới trong cuộc sống.' },
  { date: '', title: 'Tân gia hỷ', description: 'Chia sẻ niềm vui với người thân, bạn bè trong ngôi nhà mới.' },
]

export async function up(pool: Pool) {
  const [rows] = await pool.query<TemplateRow[]>(`
    SELECT t.id, t.slug, t.default_config, tc.slug as category_slug
    FROM templates t
    JOIN template_categories tc ON t.category_id = tc.id
    WHERE tc.slug IN ('birthday', 'baby_shower', 'house_warming')
  `)

  let updated = 0

  for (const t of rows as Array<TemplateRow & { category_slug: string }>) {
    let config: Record<string, unknown>
    try {
      config = typeof t.default_config === 'string'
        ? JSON.parse(t.default_config as string)
        : (t.default_config as Record<string, unknown>)
    } catch {
      console.warn(`[037] Could not parse config for template ${t.slug}`)
      continue
    }

    const sections = (config.sections as Array<Record<string, unknown>>) || []
    const cat = t.category_slug

    for (const section of sections) {
      const stype = section.section_type as string
      const cfg = (section.config as Record<string, unknown>) || {}

      switch (stype) {
        case 'family_info':
          // Replace wedding bride/groom family with category-appropriate parent info
          if (cat === 'birthday') {
            section.config = {
              parent_title: 'Cha mẹ tổ chức tiệc',
              father: { title: 'Ông', name: 'Nguyễn Văn Hải' },
              mother: { title: 'Bà', name: 'Phạm Thị Cúc' },
            }
          } else if (cat === 'baby_shower') {
            section.config = {
              parent_title: 'Ba mẹ của bé',
              father: { title: 'Ông', name: 'Trần Văn Hùng' },
              mother: { title: 'Bà', name: 'Lê Thị Mai' },
            }
          } else if (cat === 'house_warming') {
            section.config = {
              parent_title: 'Gia đình tổ chức',
              father: { title: 'Ông', name: 'Trần Văn Hùng' },
              mother: { title: 'Bà', name: 'Lê Thị Mai' },
            }
          }
          break

        case 'couple_images':
          // Remove wedding-specific field names for non-wedding categories
          section.config = {
            celebrant_photo_url: cfg.bride_photo_url || cfg.groom_photo_url || '',
            secondary_photo_url: '',
          }
          section.is_enabled = false
          break

        case 'gallery':
          // Replace wedding photos with category-appropriate images
          if (cat === 'birthday' || cat === 'baby_shower' || cat === 'house_warming') {
            section.config = {
              images: BIRTHDAY_GALLERY_IMAGES,
              layout: 'grid',
            }
          }
          break

        case 'timeline':
          // Replace romance milestones with category-appropriate events
          if (cat === 'birthday') {
            section.config = {
              ...cfg,
              title: 'Hành trình trưởng thành',
              events: BIRTHDAY_TIMELINE_EVENTS,
            }
          } else if (cat === 'baby_shower') {
            section.config = {
              ...cfg,
              title: 'Hành trình của bé',
              events: BABY_TIMELINE_EVENTS,
            }
          } else if (cat === 'house_warming') {
            section.config = {
              ...cfg,
              title: 'Hành trình về nhà',
              events: HOUSE_WARMING_TIMELINE_EVENTS,
            }
          }
          break

        case 'bank_transfer':
          // Fix account_name to match category (remove wedding person's name)
          if (cat === 'birthday') {
            section.config = {
              ...cfg,
              title: 'Gửi quà sinh nhật',
              account_name: 'NGUYỄN BẢO NGỌC',
              note: 'Sự hiện diện của bạn là món quà ý nghĩa nhất',
            }
          } else if (cat === 'baby_shower') {
            section.config = {
              ...cfg,
              title: 'Gửi quà mừng bé',
              account_name: 'TRẦN MINH KHANG',
              note: 'Mọi yêu thương gửi đến bé yêu',
            }
          } else if (cat === 'house_warming') {
            section.config = {
              ...cfg,
              title: 'Gửi quà tân gia',
              account_name: 'TRẦN ANH TÚ',
              note: 'Chúc mừng ngôi nhà mới của gia đình',
            }
          }
          break
      }
    }

    config.sections = sections

    await pool.query(
      'UPDATE templates SET default_config = ? WHERE id = ?',
      [JSON.stringify(config), t.id]
    )

    console.log(`[037] Fixed ${cat} template: ${t.slug}`)
    updated++
  }

  console.log(`[037] Updated ${updated} non-wedding templates`)
}

export async function down(pool: Pool) {
  // Revert couple_images field names only (other changes are non-destructive)
  const [rows] = await pool.query<TemplateRow[]>(`
    SELECT t.id, t.slug, t.default_config
    FROM templates t
    JOIN template_categories tc ON t.category_id = tc.id
    WHERE tc.slug IN ('birthday', 'baby_shower', 'house_warming')
  `)

  for (const t of rows) {
    let config: Record<string, unknown>
    try {
      config = typeof t.default_config === 'string'
        ? JSON.parse(t.default_config as string)
        : (t.default_config as Record<string, unknown>)
    } catch { continue }

    const sections = (config.sections as Array<Record<string, unknown>>) || []
    for (const section of sections) {
      if (section.section_type === 'couple_images') {
        const cfg = section.config as Record<string, unknown>
        section.config = {
          bride_photo_url: cfg.celebrant_photo_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=600&fit=crop&q=80',
          groom_photo_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&h=600&fit=crop&q=80',
        }
      }
    }

    await pool.query(
      'UPDATE templates SET default_config = ? WHERE id = ?',
      [JSON.stringify(config), t.id]
    )
  }
}
