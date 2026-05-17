import type { Pool } from 'mysql2/promise'

export async function up(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      \`key\`     VARCHAR(100) NOT NULL PRIMARY KEY,
      \`value\`   TEXT         NOT NULL,
      updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)

  await pool.query(`
    INSERT IGNORE INTO settings (\`key\`, \`value\`) VALUES
      ('credit_validity_days',   '50'),
      ('free_readings_per_day',  '3'),
      ('maintenance_mode',       '0')
  `)
}

export async function down(pool: Pool) {
  await pool.query('DROP TABLE IF EXISTS settings')
}
