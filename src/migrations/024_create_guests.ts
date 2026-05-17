import type { Pool } from 'mysql2/promise'

export async function up(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS guests (
      id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      invitation_id BIGINT UNSIGNED NOT NULL,
      name          VARCHAR(200) NOT NULL,
      phone         VARCHAR(20),
      email         VARCHAR(255),
      rsvp_status   ENUM('attending','not_attending','maybe') NOT NULL DEFAULT 'maybe',
      rsvp_note     TEXT,
      rsvp_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE,
      INDEX idx_invitation (invitation_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
}

export async function down(pool: Pool) {
  await pool.query('DROP TABLE IF EXISTS guests')
}
