import type { Pool } from 'mysql2/promise'

export async function up(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS credit_packages (
      id           INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
      name         VARCHAR(100)  NOT NULL,
      credits      INT UNSIGNED  NOT NULL,
      price        DECIMAL(12,0) NOT NULL,
      validity_days INT UNSIGNED NOT NULL DEFAULT 50,
      description  TEXT          NULL,
      is_active    TINYINT(1)    NOT NULL DEFAULT 1,
      sort_order   INT           NOT NULL DEFAULT 0,
      created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_is_active (is_active),
      INDEX idx_sort_order (sort_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await pool.query(`
    INSERT IGNORE INTO credit_packages (name, credits, price, validity_days, description, is_active, sort_order) VALUES
      ('Gói Cơ Bản',    10,  29000,  50, '10 lượt tạo nội dung AI',  1, 1),
      ('Gói Tiêu Chuẩn', 30,  79000,  50, '30 lượt tạo nội dung AI',  1, 2),
      ('Gói Cao Cấp',   100, 199000,  50, '100 lượt tạo nội dung AI', 1, 3)
  `)
}

export async function down(pool: Pool) {
  await pool.query('DROP TABLE IF EXISTS credit_packages')
}
