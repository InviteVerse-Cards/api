import type { Pool } from 'mysql2/promise'

export async function up(pool: Pool) {
  await pool.query(`
    ALTER TABLE music_tracks
    ADD COLUMN is_default TINYINT(1) NOT NULL DEFAULT 0
  `)
  console.log('[030] Added is_default column to music_tracks')
}

export async function down(pool: Pool) {
  await pool.query('ALTER TABLE music_tracks DROP COLUMN is_default')
}
