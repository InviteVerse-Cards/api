import type { Pool } from 'mysql2/promise'

export async function up(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS credit_orders (
      id                   INT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
      user_id              INT UNSIGNED  NOT NULL,
      package_id           INT UNSIGNED  NULL,
      credits              INT UNSIGNED  NOT NULL,
      amount               DECIMAL(12,0) NOT NULL,
      topup_code           VARCHAR(50)   NOT NULL UNIQUE,
      web2m_transaction_id VARCHAR(100)  NULL,
      status               ENUM('pending','paid','failed','expired') NOT NULL DEFAULT 'pending',
      retry_count          INT UNSIGNED  NOT NULL DEFAULT 0,
      qr_expires_at        DATETIME      NULL,
      paid_at              DATETIME      NULL,
      created_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_id    (user_id),
      INDEX idx_status     (status),
      INDEX idx_topup_code (topup_code),
      INDEX idx_created_at (created_at),
      CONSTRAINT fk_order_user    FOREIGN KEY (user_id)    REFERENCES users(id)           ON DELETE CASCADE,
      CONSTRAINT fk_order_package FOREIGN KEY (package_id) REFERENCES credit_packages(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
}

export async function down(pool: Pool) {
  await pool.query('DROP TABLE IF EXISTS credit_orders')
}
