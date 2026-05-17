import type { Pool } from 'mysql2/promise'

export async function up(pool: Pool) {
  await pool.query(`
    ALTER TABLE free_usage_logs
      ADD INDEX idx_session_date (session_id, created_at)
  `)
}

export async function down(pool: Pool) {
  await pool.query(`
    ALTER TABLE free_usage_logs
      DROP INDEX idx_session_date
  `)
}
