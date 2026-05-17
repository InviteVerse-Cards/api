import type { Pool } from 'mysql2/promise'

export async function up(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS credit_usage_logs (
      id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id       INT UNSIGNED    NOT NULL,
      reading_id    INT UNSIGNED    NULL,
      module        VARCHAR(100)    NOT NULL DEFAULT 'ai',
      credits_used  INT UNSIGNED    NOT NULL DEFAULT 1,
      balance_after INT UNSIGNED    NOT NULL DEFAULT 0,
      created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id   (user_id),
      INDEX idx_created_at (created_at),
      CONSTRAINT fk_cul_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
}

export async function down(pool: Pool) {
  await pool.query('DROP TABLE IF EXISTS credit_usage_logs')
}
