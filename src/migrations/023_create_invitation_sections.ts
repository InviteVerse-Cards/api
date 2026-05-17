import type { Pool } from 'mysql2/promise'

export async function up(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invitation_sections (
      id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      invitation_id BIGINT UNSIGNED NOT NULL,
      section_type  VARCHAR(50) NOT NULL,
      sort_order    INT UNSIGNED NOT NULL DEFAULT 0,
      is_enabled    TINYINT(1) NOT NULL DEFAULT 1,
      config        JSON NOT NULL DEFAULT (JSON_OBJECT()),
      created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE,
      INDEX idx_invitation (invitation_id, sort_order),
      UNIQUE KEY uniq_inv_section (invitation_id, section_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
}

export async function down(pool: Pool) {
  await pool.query('DROP TABLE IF EXISTS invitation_sections')
}
