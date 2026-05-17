import type { Pool } from 'mysql2/promise'

// Add background_url to hero section of existing templates + set thumbnail_url
const TEMPLATE_UPDATES = [
  {
    slug: 'cuoi-hong-blossom',
    thumbnail_url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600&h=800&fit=crop&q=80',
    hero_background: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1920&q=80',
  },
  {
    slug: 'cuoi-xanh-sage',
    thumbnail_url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&h=800&fit=crop&q=80',
    hero_background: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1920&q=80',
  },
  {
    slug: 'cuoi-vang-gold',
    thumbnail_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=800&fit=crop&q=80',
    hero_background: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&q=80',
  },
  {
    slug: 'cuoi-trang-minimal',
    thumbnail_url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&h=800&fit=crop&q=80',
    hero_background: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1920&q=80',
  },
  {
    slug: 'cuoi-tim-lavender',
    thumbnail_url: 'https://images.unsplash.com/photo-1464699908537-0954e50791ee?w=600&h=800&fit=crop&q=80',
    hero_background: 'https://images.unsplash.com/photo-1464699908537-0954e50791ee?w=1920&q=80',
  },
]

export async function up(pool: Pool) {
  for (const update of TEMPLATE_UPDATES) {
    const [rows] = await pool.query<any[]>(
      'SELECT id, default_config FROM templates WHERE slug = ?',
      [update.slug]
    )
    if (!rows[0]) continue

    let config: { theme: Record<string, unknown>; sections: Array<Record<string, unknown>> }
    try {
      config = typeof rows[0].default_config === 'string'
        ? JSON.parse(rows[0].default_config)
        : rows[0].default_config
    } catch {
      continue
    }

    // Inject background_url into hero section config
    if (config && Array.isArray(config.sections)) {
      config.sections = config.sections.map((s) => {
      if (s.section_type === 'hero') {
        return {
          ...s,
          config: {
            ...(s.config as Record<string, unknown>),
            background_url: update.hero_background,
            background_overlay: 40,
          },
        }
      }
      return s
      })
    }

    await pool.query(
      `UPDATE templates SET thumbnail_url = ?, default_config = ?, updated_at = NOW() WHERE slug = ?`,
      [update.thumbnail_url, JSON.stringify(config), update.slug]
    )
  }
}

export async function down(_pool: Pool) {
  // No rollback needed — background images can stay
}
