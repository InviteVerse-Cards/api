import type { Pool } from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2'

interface TemplateRow extends RowDataPacket {
  id: number
  slug: string
  default_config: unknown
}

interface MusicTrackRow extends RowDataPacket {
  id: number
}

export async function up(pool: Pool) {
  const [rows] = await pool.query<TemplateRow[]>(
    'SELECT id, slug, default_config FROM templates'
  )

  let templateCount = 0
  let sectionCount = 0

  for (const row of rows) {
    let config: Record<string, unknown>
    try {
      config = typeof row.default_config === 'string'
        ? JSON.parse(row.default_config as string)
        : (row.default_config as Record<string, unknown>)
    } catch {
      console.warn(`[039] Could not parse default_config for template ${row.slug}`)
      continue
    }

    const theme = (config.theme as Record<string, unknown>) ?? {}
    const sections = (config.sections as Array<Record<string, unknown>>) ?? []
    const layoutType = (config.layout_type as string | undefined) ?? null

    // 1. Write theme_config column
    if (Object.keys(theme).length > 0) {
      await pool.query(
        'UPDATE templates SET theme_config = ? WHERE id = ?',
        [JSON.stringify(theme), row.id]
      )
    }

    // 2. Insert template_sections rows
    for (const [idx, section] of sections.entries()) {
      const sectionType = section.section_type as string
      if (!sectionType) continue

      const isEnabled = section.is_enabled !== false ? 1 : 0
      const sortOrder = typeof section.sort_order === 'number' ? section.sort_order : idx
      let sectionConfig = (section.config as Record<string, unknown>) ?? {}

      // Inject layout_type into hero section config
      if (sectionType === 'hero' && layoutType) {
        sectionConfig = { ...sectionConfig, layout_type: layoutType }
      }

      await pool.query(
        `INSERT INTO template_sections (template_id, section_type, sort_order, is_enabled, config)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           sort_order = VALUES(sort_order),
           is_enabled = VALUES(is_enabled),
           config     = VALUES(config),
           updated_at = NOW()`,
        [row.id, sectionType, sortOrder, isEnabled, JSON.stringify(sectionConfig)]
      )
      sectionCount++
    }

    // 3. Map music section track_url → default_music_track_id
    const musicSection = sections.find(s => s.section_type === 'music')
    if (musicSection) {
      const musicConfig = (musicSection.config as Record<string, unknown>) ?? {}
      const trackUrl = musicConfig.track_url as string | undefined
      if (trackUrl) {
        const [trackRows] = await pool.query<MusicTrackRow[]>(
          'SELECT id FROM music_tracks WHERE url = ? LIMIT 1',
          [trackUrl]
        )
        if (trackRows[0]) {
          await pool.query(
            'UPDATE templates SET default_music_track_id = ? WHERE id = ?',
            [trackRows[0].id, row.id]
          )
        }
      }
    }

    templateCount++
  }

  console.log(`[039] Migrated ${templateCount} templates → ${sectionCount} template_sections rows`)
}

export async function down(pool: Pool) {
  await pool.query('DELETE FROM template_sections')
  await pool.query('UPDATE templates SET theme_config = NULL, default_music_track_id = NULL')
  console.log('[039] Rolled back template_sections data migration')
}
