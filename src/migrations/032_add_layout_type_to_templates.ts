import type { Pool } from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2'

const LAYOUT_TYPES: Record<string, string> = {
  'cuoi-hong-blossom':      'botanical',
  'cuoi-xanh-sage':         'botanical',
  'cuoi-vang-gold':         'luxury-dark',
  'cuoi-trang-minimal':     'minimalist',
  'cuoi-tim-lavender':      'romantic-photo',
  'cuoi-do-truyen-thong':   'traditional-viet',
  'cuoi-xanh-royal':        'luxury-dark',
  'cuoi-cam-rustic':        'rustic',
  'cuoi-xam-modern':        'minimalist',
  'cuoi-hong-cherry':       'botanical',
  'cuoi-xanh-bien':         'romantic-photo',
  'cuoi-nau-earth':         'rustic',
  'cuoi-kem-ivory':         'minimalist',
  'cuoi-tim-hoang-gia':     'luxury-dark',
  'cuoi-hong-nude':         'botanical',
}

type ConfigRow = { id: number; default_config: unknown } & RowDataPacket

export async function up(pool: Pool) {
  for (const [slug, layoutType] of Object.entries(LAYOUT_TYPES)) {
    const [rows] = await pool.query<ConfigRow[]>(
      'SELECT id, default_config FROM templates WHERE slug = ?',
      [slug]
    )
    const row = rows[0]
    if (!row) {
      console.warn(`[032] Template not found: ${slug}`)
      continue
    }

    const config = typeof row.default_config === 'string'
      ? JSON.parse(row.default_config)
      : row.default_config as Record<string, unknown>

    config.layout_type = layoutType

    await pool.query(
      'UPDATE templates SET default_config = ?, updated_at = NOW() WHERE id = ?',
      [JSON.stringify(config), row.id]
    )
  }

  console.log(`[032] Added layout_type to ${Object.keys(LAYOUT_TYPES).length} templates`)
}

export async function down(pool: Pool) {
  for (const slug of Object.keys(LAYOUT_TYPES)) {
    const [rows] = await pool.query<ConfigRow[]>(
      'SELECT id, default_config FROM templates WHERE slug = ?',
      [slug]
    )
    const row = rows[0]
    if (!row) continue

    const config = typeof row.default_config === 'string'
      ? JSON.parse(row.default_config)
      : row.default_config as Record<string, unknown>

    delete config.layout_type

    await pool.query(
      'UPDATE templates SET default_config = ?, updated_at = NOW() WHERE id = ?',
      [JSON.stringify(config), row.id]
    )
  }

  console.log('[032] Removed layout_type from all templates')
}
