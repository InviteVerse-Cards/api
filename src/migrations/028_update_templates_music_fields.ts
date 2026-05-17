import type { Pool } from 'mysql2/promise'

export async function up(pool: Pool) {
  // Lấy tất cả template hiện tại
  const [rows] = await pool.query<Array<{ id: number; default_config: string } & import('mysql2').RowDataPacket>>(
    'SELECT id, default_config FROM templates'
  )

  const DEFAULT_MUSIC_URL = 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=beautiful-in-white-109015.mp3'

  for (const row of rows) {
    let configObj: any
    try {
      configObj = JSON.parse(row.default_config)
    } catch (e) {
      continue
    }

    if (Array.isArray(configObj.sections)) {
      configObj.sections = configObj.sections.map((sec: any) => {
        // Cập nhật Hero Form (Thêm các field mới của Chungdoi.com)
        if (sec.section_type === 'hero') {
          sec.config = {
            ...sec.config,
            bride_short_name: 'Nữ',
            groom_short_name: 'Nam',
            bride_title: 'Út Nữ',
            groom_title: 'Trưởng Nam',
            display_order: 'groom_first'
          }
        }
        
        // Cập nhật Music Section (Bật nhạc mặc định)
        if (sec.section_type === 'music') {
          sec.is_enabled = true
          sec.config = {
            ...sec.config,
            enabled: true,
            autoplay: true,
            track_name: 'Beautiful In White - Westlife',
            track_url: DEFAULT_MUSIC_URL
          }
        }
        
        return sec
      })
    }

    const updatedConfig = JSON.stringify(configObj)

    await pool.query(
      `UPDATE templates SET default_config = ? WHERE id = ?`,
      [updatedConfig, row.id]
    )
  }

  console.log(`[028] Updated music and hero config fields for ${rows.length} templates.`)
}

export async function down(pool: Pool) {
  // Rollback in this case is ignored (no easy way to revert exact JSON state without keeping backups)
  console.log('[028] Down migration ignored for JSON update.')
}
