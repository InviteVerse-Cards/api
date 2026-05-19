import type { Pool } from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2'

interface TemplateRow extends RowDataPacket {
  id: number
  slug: string
  default_config: unknown
}

// Cinzel Decorative has no Vietnamese glyph support — causes broken diacritic rendering.
// Replace with visually similar fonts that fully support Vietnamese:
//   - luxury-dark: Playfair Display (elegant, bold, full Vietnamese)
//   - traditional-viet: Cormorant Garamond (formal, serif, full Vietnamese)
//   - fallback: Playfair Display

const LAYOUT_FONT_REPLACEMENT: Record<string, string> = {
  'traditional-viet': 'Cormorant Garamond',
  'luxury-dark': 'Playfair Display',
}

export async function up(pool: Pool) {
  const [rows] = await pool.query<TemplateRow[]>(
    'SELECT id, slug, default_config FROM templates'
  )

  let updated = 0
  for (const t of rows) {
    let config: Record<string, unknown>
    try {
      config = typeof t.default_config === 'string'
        ? JSON.parse(t.default_config as string)
        : (t.default_config as Record<string, unknown>)
    } catch {
      continue
    }

    const theme = config.theme as Record<string, unknown> | undefined
    if (!theme || theme.font_heading !== 'Cinzel Decorative') continue

    const layoutType = (config.layout_type as string) || 'botanical'
    const replacement = LAYOUT_FONT_REPLACEMENT[layoutType] || 'Playfair Display'

    theme.font_heading = replacement
    config.theme = theme

    await pool.query(
      'UPDATE templates SET default_config = ? WHERE id = ?',
      [JSON.stringify(config), t.id]
    )
    updated++
    console.log(`[036] Fixed ${t.slug}: Cinzel Decorative → ${replacement}`)
  }

  console.log(`[036] Fixed font on ${updated} templates`)
}

export async function down(pool: Pool) {
  const slugsToRestore = [
    'cuoi-vang-gold',
    'cuoi-do-truyen-thong',
    'cuoi-tim-hoang-gia',
    'cuoi-rong-phung',
  ]

  for (const slug of slugsToRestore) {
    const [rows] = await pool.query<TemplateRow[]>(
      'SELECT id, default_config FROM templates WHERE slug = ?',
      [slug]
    )
    if (!rows[0]) continue

    let config: Record<string, unknown>
    try {
      config = typeof rows[0].default_config === 'string'
        ? JSON.parse(rows[0].default_config as string)
        : (rows[0].default_config as Record<string, unknown>)
    } catch {
      continue
    }

    const theme = config.theme as Record<string, unknown>
    if (theme) theme.font_heading = 'Cinzel Decorative'

    await pool.query(
      'UPDATE templates SET default_config = ? WHERE id = ?',
      [JSON.stringify(config), rows[0].id]
    )
  }

  console.log('[036] Reverted font fixes')
}
