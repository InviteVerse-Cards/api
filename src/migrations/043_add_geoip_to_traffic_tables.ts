import type { Pool } from 'mysql2/promise'

export async function up(pool: Pool) {
  // 1. Add country and city columns to page_view_logs
  await pool.query(`
    ALTER TABLE page_view_logs
      ADD COLUMN country VARCHAR(10) NULL AFTER ip_address,
      ADD COLUMN city VARCHAR(100) NULL AFTER country,
      ADD INDEX idx_city (city),
      ADD INDEX idx_country (country)
  `)

  // 2. Add country and city columns to online_heartbeats
  await pool.query(`
    ALTER TABLE online_heartbeats
      ADD COLUMN country VARCHAR(10) NULL AFTER ip_address,
      ADD COLUMN city VARCHAR(100) NULL AFTER country
  `)

  console.log('[043] Added country and city columns to page_view_logs and online_heartbeats')
}

export async function down(pool: Pool) {
  await pool.query(`
    ALTER TABLE online_heartbeats
      DROP COLUMN city,
      DROP COLUMN country
  `)

  await pool.query(`
    ALTER TABLE page_view_logs
      DROP INDEX idx_country,
      DROP INDEX idx_city,
      DROP COLUMN city,
      DROP COLUMN country
  `)
}
