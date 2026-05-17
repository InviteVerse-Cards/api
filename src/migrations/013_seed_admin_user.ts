import type { Pool } from 'mysql2/promise'
import bcrypt from 'bcryptjs'

const ADMIN_EMAIL = 'tuandtdeveloper@gmail.com'

export async function up(pool: Pool) {
  const password_hash = await bcrypt.hash('Adminphongthuy@1234', 12)

  await pool.query(
    `INSERT IGNORE INTO users
       (full_name, email, password_hash, role, is_verified, is_active)
     VALUES (?, ?, ?, 'admin', 1, 1)`,
    ['Quản Trị Viên', ADMIN_EMAIL, password_hash]
  )
}

export async function down(pool: Pool) {
  await pool.query('DELETE FROM users WHERE email = ? AND role = ?', [ADMIN_EMAIL, 'admin'])
}
