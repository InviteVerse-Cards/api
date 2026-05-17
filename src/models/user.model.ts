import pool from '@/config/database'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'
import type { UserRow, UserPublic } from '@/types/user.types'
import { getCreditsStatus } from '@/middleware/checkCredits'

interface UserRowPacket extends UserRow, RowDataPacket {}
interface _TokenRow extends RowDataPacket { id: number; email: string | null }
interface CountPacket extends RowDataPacket { total: number }

export const UserModel = {
  async findById(id: number): Promise<UserRow | null> {
    const [rows] = await pool.query<UserRowPacket[]>(
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [id]
    )
    return rows[0] ?? null
  },

  async findByEmail(email: string): Promise<UserRow | null> {
    const [rows] = await pool.query<UserRowPacket[]>(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email]
    )
    return rows[0] ?? null
  },

  async create(data: {
    full_name: string
    email: string
    password_hash: string
    phone?: string | null
    role?: 'user' | 'admin'
  }): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (full_name, email, password_hash, phone, role, credits_balance, is_verified, is_active)
       VALUES (?, ?, ?, ?, ?, 0, 0, 1)`,
      [
        data.full_name,
        data.email,
        data.password_hash,
        data.phone ?? null,
        data.role ?? 'user',
      ]
    )
    return result.insertId
  },

  async update(id: number, data: Partial<Pick<UserRow,
    'full_name' | 'email' | 'phone' | 'birth_date' | 'gender' |
    'password_hash' | 'avatar_url' | 'avatar_public_id' | 'is_verified' | 'is_active' | 'role'
  >>): Promise<void> {
    const fields = Object.keys(data) as (keyof typeof data)[]
    if (fields.length === 0) return

    const setClauses = fields.map(f => `\`${f}\` = ?`).join(', ')
    const values = fields.map(f => data[f])
    values.push(id as unknown as typeof values[number])

    await pool.query<ResultSetHeader>(
      `UPDATE users SET ${setClauses}, updated_at = NOW() WHERE id = ?`,
      values
    )
  },

  async updateLastLogin(id: number): Promise<void> {
    await pool.query<ResultSetHeader>(
      'UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = ?',
      [id]
    )
  },

  async deductCredit(id: number): Promise<void> {
    await pool.query<ResultSetHeader>(
      'UPDATE users SET credits_balance = credits_balance - 1, updated_at = NOW() WHERE id = ? AND credits_balance > 0',
      [id]
    )
  },

  async addCredits(id: number, amount: number, expiresAt: Date): Promise<void> {
    await pool.query<ResultSetHeader>(
      `UPDATE users
       SET credits_balance = credits_balance + ?,
           credits_expires_at = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [amount, expiresAt, id]
    )
  },

  toPublic(user: UserRow): UserPublic {
    return {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      birth_date: user.birth_date ? user.birth_date.toISOString().split('T')[0] : null,
      gender: user.gender,
      avatar_url: user.avatar_url,
      role: user.role,
      credits_balance: user.credits_balance,
      credits_expires_at: user.credits_expires_at
        ? user.credits_expires_at.toISOString()
        : null,
      credits_status: getCreditsStatus(user.credits_balance, user.credits_expires_at),
      is_verified: user.is_verified,
      created_at: user.created_at.toISOString(),
    }
  },

  // Fills NULL birth_date / gender — requires migration 014
  async saveBirthProfile(id: number, data: { birth_date?: string | null; gender?: string | null }): Promise<void> {
    const { birth_date, gender } = data
    if (!birth_date && !gender) return
    await pool.query<ResultSetHeader>(
      `UPDATE users
       SET birth_date = COALESCE(birth_date, ?),
           gender     = COALESCE(gender, ?),
           updated_at = NOW()
       WHERE id = ?`,
      [birth_date ?? null, gender ?? null, id]
    )
  },

  async setEmailVerifyToken(id: number, token: string, expiresAt: Date): Promise<void> {
    await pool.query<ResultSetHeader>(
      `UPDATE users
       SET email_verify_token = ?, email_verify_token_expires = ?, updated_at = NOW()
       WHERE id = ?`,
      [token, expiresAt, id]
    )
  },

  async findByEmailVerifyToken(token: string): Promise<UserRow | null> {
    const [rows] = await pool.query<UserRowPacket[]>(
      'SELECT * FROM users WHERE email_verify_token = ? LIMIT 1',
      [token]
    )
    return rows[0] ?? null
  },

  async markEmailVerified(id: number): Promise<void> {
    await pool.query<ResultSetHeader>(
      `UPDATE users
       SET is_verified = 1, email_verify_token = NULL, email_verify_token_expires = NULL, updated_at = NOW()
       WHERE id = ?`,
      [id]
    )
  },

  async setResetPasswordToken(id: number, token: string, expiresAt: Date): Promise<void> {
    await pool.query<ResultSetHeader>(
      `UPDATE users
       SET reset_password_token = ?, reset_password_token_expires = ?, updated_at = NOW()
       WHERE id = ?`,
      [token, expiresAt, id]
    )
  },

  async findByResetPasswordToken(token: string): Promise<UserRow | null> {
    const [rows] = await pool.query<UserRowPacket[]>(
      'SELECT * FROM users WHERE reset_password_token = ? LIMIT 1',
      [token]
    )
    return rows[0] ?? null
  },

  async clearResetPasswordToken(id: number): Promise<void> {
    await pool.query<ResultSetHeader>(
      `UPDATE users
       SET reset_password_token = NULL, reset_password_token_expires = NULL, updated_at = NOW()
       WHERE id = ?`,
      [id]
    )
  },

  async findAll(opts: {
    search?: string
    role?: 'user' | 'admin'
    isActive?: boolean
    page: number
    limit: number
  }): Promise<{ rows: UserRow[]; total: number }> {
    const conditions: string[] = []
    const params: unknown[] = []

    if (opts.search) {
      conditions.push('(full_name LIKE ? OR email LIKE ? OR phone LIKE ?)')
      const like = `%${opts.search}%`
      params.push(like, like, like)
    }
    if (opts.role !== undefined) {
      conditions.push('role = ?')
      params.push(opts.role)
    }
    if (opts.isActive !== undefined) {
      conditions.push('is_active = ?')
      params.push(opts.isActive ? 1 : 0)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const offset = (opts.page - 1) * opts.limit

    const [[countRow]] = await pool.query<CountPacket[]>(
      `SELECT COUNT(*) AS total FROM users ${where}`,
      params
    )

    const [rows] = await pool.query<UserRowPacket[]>(
      `SELECT * FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, opts.limit, offset]
    )

    return { rows, total: countRow?.total ?? 0 }
  },
}
