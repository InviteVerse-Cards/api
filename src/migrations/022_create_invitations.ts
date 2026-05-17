import type { Pool } from 'mysql2/promise'

export async function up(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invitations (
      id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      uuid            VARCHAR(36)  NOT NULL UNIQUE DEFAULT (UUID()),
      user_id         INT UNSIGNED NOT NULL,
      template_id     INT UNSIGNED,
      slug            VARCHAR(200) NOT NULL UNIQUE,
      title           VARCHAR(300) NOT NULL,
      category        VARCHAR(100) NOT NULL DEFAULT 'wedding',
      status          ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
      theme_config    JSON NOT NULL,
      watermark       TINYINT(1) NOT NULL DEFAULT 1,
      view_count      INT UNSIGNED NOT NULL DEFAULT 0,
      qr_code_url     TEXT,
      og_image_url    TEXT,
      meta_title      VARCHAR(300),
      meta_description TEXT,
      password        VARCHAR(100),
      published_at    DATETIME,
      expires_at      DATETIME,
      deleted_at      DATETIME,
      created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (template_id) REFERENCES templates(id),
      INDEX idx_user_status (user_id, status, deleted_at),
      INDEX idx_slug (slug),
      INDEX idx_published (status, published_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
}

export async function down(pool: Pool) {
  await pool.query('DROP TABLE IF EXISTS invitations')
}
