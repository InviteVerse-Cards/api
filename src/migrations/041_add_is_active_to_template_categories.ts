import type { Pool } from 'mysql2/promise'

export async function up(pool: Pool) {
  await pool.query(`
    ALTER TABLE template_categories
      ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER sort_order
  `)
  console.log('[041] Added is_active column to template_categories')
}

export async function down(pool: Pool) {
  await pool.query('ALTER TABLE template_categories DROP COLUMN is_active')
}
