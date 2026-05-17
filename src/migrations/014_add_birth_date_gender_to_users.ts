import type { Pool } from 'mysql2/promise'

export async function up(pool: Pool) {
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN birth_date DATE         NULL AFTER phone,
      ADD COLUMN gender     VARCHAR(20)  NULL AFTER birth_date
  `)
}

export async function down(pool: Pool) {
  await pool.query(`
    ALTER TABLE users
      DROP COLUMN gender,
      DROP COLUMN birth_date
  `)
}
