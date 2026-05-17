import type { Pool } from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2'

interface TemplateRow extends RowDataPacket {
  id: number
  slug: string
  default_config: unknown
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

    const layoutType = config.layout_type as string | undefined
    const sections = config.sections as Array<Record<string, unknown>> | undefined
    if (!layoutType || !sections) continue

    const heroIdx = sections.findIndex(s => s.section_type === 'hero')
    if (heroIdx === -1) continue

    const hero = sections[heroIdx]
    const heroConfig = (hero.config as Record<string, unknown>) ?? {}
    if (heroConfig.layout_type === layoutType) continue  // already set

    const newSections = [...sections]
    newSections[heroIdx] = { ...hero, config: { ...heroConfig, layout_type: layoutType } }

    await pool.query(
      'UPDATE templates SET default_config = ? WHERE id = ?',
      [JSON.stringify({ ...config, sections: newSections }), t.id]
    )
    updated++
  }

  console.log(`[035] Added layout_type to hero section config in ${updated} templates`)
}

export async function down(pool: Pool) {
  const [rows] = await pool.query<TemplateRow[]>(
    'SELECT id, default_config FROM templates'
  )

  for (const t of rows) {
    let config: Record<string, unknown>
    try {
      config = typeof t.default_config === 'string'
        ? JSON.parse(t.default_config as string)
        : (t.default_config as Record<string, unknown>)
    } catch {
      continue
    }

    const sections = config.sections as Array<Record<string, unknown>> | undefined
    if (!sections) continue

    const newSections = sections.map(s => {
      if (s.section_type !== 'hero') return s
      const { layout_type: _lt, ...rest } = (s.config as Record<string, unknown>) ?? {}
      return { ...s, config: rest }
    })

    await pool.query(
      'UPDATE templates SET default_config = ? WHERE id = ?',
      [JSON.stringify({ ...config, sections: newSections }), t.id]
    )
  }

  console.log('[035] Removed layout_type from hero section configs')
}
