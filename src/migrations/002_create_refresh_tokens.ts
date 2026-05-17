import type { Pool } from 'mysql2/promise'

export async function up(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id    INT UNSIGNED NOT NULL,
      token_hash VARCHAR(64)  NOT NULL UNIQUE,
      expires_at DATETIME     NOT NULL,
      ip_address VARCHAR(45)  NULL,
      user_agent TEXT         NULL,
      created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_id    (user_id),
      INDEX idx_expires_at (expires_at),
      CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
}

export async function down(pool: Pool) {
  await pool.query('DROP TABLE IF EXISTS refresh_tokens')
}
