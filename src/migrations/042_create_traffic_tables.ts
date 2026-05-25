import type { Pool } from 'mysql2/promise'

export async function up(pool: Pool) {
  // 1. Create page_view_logs table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS page_view_logs (
      id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      session_id   VARCHAR(255) NOT NULL,
      user_id      INT UNSIGNED NULL,
      page         VARCHAR(128) NOT NULL,
      referrer     VARCHAR(512) NULL,
      user_agent   VARCHAR(512) NULL,
      ip_address   VARCHAR(45) NULL,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_session (session_id),
      INDEX idx_created (created_at),
      INDEX idx_page (page),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  // 2. Create online_heartbeats table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS online_heartbeats (
      id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      session_id   VARCHAR(255) NOT NULL,
      user_id      INT UNSIGNED NULL,
      page         VARCHAR(128) NULL,
      ip_address   VARCHAR(45) NULL,
      last_seen    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_session (session_id),
      INDEX idx_last_seen (last_seen),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  // 3. Create feature_events table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS feature_events (
      id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      session_id   VARCHAR(255) NOT NULL,
      user_id      INT UNSIGNED NULL,
      event_type   VARCHAR(64) NOT NULL,
      module       VARCHAR(32) NULL,
      meta         JSON NULL,
      ip_address   VARCHAR(45) NULL,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_event (event_type),
      INDEX idx_created (created_at),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  console.log('[042] Created traffic analytics tables: page_view_logs, online_heartbeats, feature_events')
}

export async function down(pool: Pool) {
  await pool.query('DROP TABLE IF EXISTS feature_events')
  await pool.query('DROP TABLE IF EXISTS online_heartbeats')
  await pool.query('DROP TABLE IF EXISTS page_view_logs')
}
