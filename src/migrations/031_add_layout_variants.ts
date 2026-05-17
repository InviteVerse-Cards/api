import type { Pool } from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2'

const LAYOUT_VARIANTS: Record<string, string> = {
  'cuoi-hong-blossom':    'botanical',
  'cuoi-xanh-sage':       'photo-story',
  'cuoi-vang-gold':       'chinese-red',
  'cuoi-trang-minimal':   'calligraphy',
  'cuoi-tim-lavender':    'hero-scroll',
  'cuoi-do-truyen-thong': 'chinese-red',
  'cuoi-xanh-royal':      'hero-scroll',
  'cuoi-cam-rustic':      'photo-story',
  'cuoi-xam-modern':      'calligraphy',
  'cuoi-hong-cherry':     'botanical',
  'cuoi-xanh-bien':       'hero-scroll',
  'cuoi-nau-earth':       'botanical',
  'cuoi-kem-ivory':       'calligraphy',
  'cuoi-tim-hoang-gia':   'hero-scroll',
  'cuoi-hong-nude':       'botanical',
}

type SectionRow = { section_type: string; config: Record<string, unknown> }
type ConfigRow = { id: number; default_config: unknown } & RowDataPacket

export async function up(pool: Pool) {
  for (const [slug, variant] of Object.entries(LAYOUT_VARIANTS)) {
    const [rows] = await pool.query<ConfigRow[]>(
      'SELECT id, default_config FROM templates WHERE slug = ?',
      [slug]
    )
    const row = rows[0]
    if (!row) {
      console.warn(`[031] Template not found: ${slug}`)
      continue
    }

    const config = typeof row.default_config === 'string'
      ? JSON.parse(row.default_config)
      : row.default_config as { sections: SectionRow[] }

    config.sections = (config.sections as SectionRow[]).map((s) => {
      if (s.section_type === 'hero') {
        return { ...s, config: { ...s.config, layout_variant: variant } }
      }
      return s
    })

    await pool.query(
      'UPDATE templates SET default_config = ?, updated_at = NOW() WHERE id = ?',
      [JSON.stringify(config), row.id]
    )
  }

  console.log(`[031] Added layout_variant to ${Object.keys(LAYOUT_VARIANTS).length} templates`)
}

export async function down(pool: Pool) {
  for (const slug of Object.keys(LAYOUT_VARIANTS)) {
    const [rows] = await pool.query<ConfigRow[]>(
      'SELECT id, default_config FROM templates WHERE slug = ?',
      [slug]
    )
    const row = rows[0]
    if (!row) continue

    const config = typeof row.default_config === 'string'
      ? JSON.parse(row.default_config)
      : row.default_config as { sections: SectionRow[] }

    config.sections = (config.sections as SectionRow[]).map((s) => {
      if (s.section_type === 'hero') {
        const { layout_variant: _lv, ...rest } = s.config
        return { ...s, config: rest }
      }
      return s
    })

    await pool.query(
      'UPDATE templates SET default_config = ?, updated_at = NOW() WHERE id = ?',
      [JSON.stringify(config), row.id]
    )
  }

  console.log('[031] Removed layout_variant from all templates')
}
