import type { Pool } from 'mysql2/promise'

export async function up(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      full_name          VARCHAR(150)         NOT NULL,
      email              VARCHAR(255)         NULL UNIQUE,
      phone              VARCHAR(20)          NULL,
      password_hash      VARCHAR(255)         NULL,
      avatar_url         TEXT                 NULL,
      avatar_public_id   VARCHAR(255)         NULL,
      role               ENUM('user','admin') NOT NULL DEFAULT 'user',
      credits_balance    INT UNSIGNED         NOT NULL DEFAULT 0,
      credits_expires_at DATETIME             NULL,
      is_verified        TINYINT(1)           NOT NULL DEFAULT 0,
      is_active          TINYINT(1)           NOT NULL DEFAULT 1,
      last_login_at      DATETIME             NULL,
      created_at         DATETIME             NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at         DATETIME             NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email    (email),
      INDEX idx_role     (role),
      INDEX idx_is_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
}

export async function down(pool: Pool) {
  await pool.query('DROP TABLE IF EXISTS users')
}
