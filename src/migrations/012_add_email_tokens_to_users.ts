import type { Pool } from 'mysql2/promise'

export async function up(pool: Pool) {
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN email_verify_token          VARCHAR(255) NULL AFTER is_verified,
      ADD COLUMN email_verify_token_expires  DATETIME     NULL AFTER email_verify_token,
      ADD COLUMN reset_password_token        VARCHAR(255) NULL AFTER email_verify_token_expires,
      ADD COLUMN reset_password_token_expires DATETIME    NULL AFTER reset_password_token,
      ADD INDEX idx_email_verify_token (email_verify_token),
      ADD INDEX idx_reset_password_token (reset_password_token)
  `)
}

export async function down(pool: Pool) {
  await pool.query(`
    ALTER TABLE users
      DROP INDEX idx_reset_password_token,
      DROP INDEX idx_email_verify_token,
      DROP COLUMN reset_password_token_expires,
      DROP COLUMN reset_password_token,
      DROP COLUMN email_verify_token_expires,
      DROP COLUMN email_verify_token
  `)
}
