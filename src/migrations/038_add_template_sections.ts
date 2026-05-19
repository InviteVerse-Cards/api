import type { Pool } from 'mysql2/promise'

export async function up(pool: Pool) {
  // Add new columns to templates table
  await pool.query(`
    ALTER TABLE templates
      ADD COLUMN theme_config JSON AFTER default_config,
      ADD COLUMN default_music_track_id INT UNSIGNED NULL AFTER theme_config
  `)

  try {
    await pool.query(`
      ALTER TABLE templates
        ADD CONSTRAINT fk_template_music
        FOREIGN KEY (default_music_track_id) REFERENCES music_tracks(id) ON DELETE SET NULL
    `)
  } catch {
    // Ignore if constraint already exists
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS template_sections (
      id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      template_id  INT UNSIGNED NOT NULL,
      section_type VARCHAR(50)  NOT NULL,
      sort_order   INT NOT NULL DEFAULT 0,
      is_enabled   TINYINT(1) NOT NULL DEFAULT 1,
      config       JSON NOT NULL,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
      INDEX idx_template (template_id, sort_order),
      UNIQUE KEY uniq_section (template_id, section_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  console.log('[038] Added template_sections table + theme_config/default_music_track_id columns to templates')
}

export async function down(pool: Pool) {
  await pool.query('DROP TABLE IF EXISTS template_sections')
  try {
    await pool.query('ALTER TABLE templates DROP FOREIGN KEY fk_template_music')
  } catch {}
  await pool.query(`
    ALTER TABLE templates
      DROP COLUMN IF EXISTS theme_config,
      DROP COLUMN IF EXISTS default_music_track_id
  `)
}
