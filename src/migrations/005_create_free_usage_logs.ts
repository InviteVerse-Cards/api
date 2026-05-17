import type { Pool } from 'mysql2/promise'

export async function up(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS free_usage_logs (
      id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      session_id VARCHAR(128)    NOT NULL,
      user_id    INT UNSIGNED    NULL,
      module     VARCHAR(100)    NOT NULL DEFAULT 'ai',
      ip_address VARCHAR(45)     NULL,
      created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_session (session_id),
      INDEX idx_user_id (user_id),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
}

export async function down(pool: Pool) {
  await pool.query('DROP TABLE IF EXISTS free_usage_logs')
}
