import type { Pool } from 'mysql2/promise'

export async function up(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS template_categories (
      id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      slug       VARCHAR(100) NOT NULL UNIQUE,
      name       VARCHAR(150) NOT NULL,
      sort_order INT UNSIGNED NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await pool.query(`
    INSERT IGNORE INTO template_categories (slug, name, sort_order) VALUES
    ('wedding',     'Thiệp cưới',    1),
    ('birthday',    'Thiệp sinh nhật', 2),
    ('baby_shower', 'Thôi nôi',      3),
    ('corporate',   'Doanh nghiệp',  4)
  `)
}

export async function down(pool: Pool) {
  await pool.query('DROP TABLE IF EXISTS template_categories')
}
