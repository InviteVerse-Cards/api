import type { Pool } from 'mysql2/promise'

export async function up(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS templates (
      id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      uuid           VARCHAR(36)  NOT NULL UNIQUE DEFAULT (UUID()),
      category_id    INT UNSIGNED NOT NULL,
      slug           VARCHAR(200) NOT NULL UNIQUE,
      name           VARCHAR(300) NOT NULL,
      description    TEXT,
      preview_url    TEXT,
      thumbnail_url  TEXT,
      plan_required  ENUM('free','pro') NOT NULL DEFAULT 'free',
      is_active      TINYINT(1) NOT NULL DEFAULT 1,
      use_count      INT UNSIGNED NOT NULL DEFAULT 0,
      default_config JSON NOT NULL,
      created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES template_categories(id),
      INDEX idx_category (category_id, is_active),
      INDEX idx_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
}

export async function down(pool: Pool) {
  await pool.query('DROP TABLE IF EXISTS templates')
}
