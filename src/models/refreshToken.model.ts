import pool from '@/config/database'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'

interface RefreshTokenRow extends RowDataPacket {
  id: number
  user_id: number
  token_hash: string
  expires_at: Date
  ip_address: string | null
  user_agent: string | null
  created_at: Date
}

export const RefreshTokenModel = {
  async create(data: {
    userId: number
    tokenHash: string
    expiresAt: Date
    ipAddress?: string | null
    userAgent?: string | null
  }): Promise<void> {
    await pool.query<ResultSetHeader>(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?)`,
      [
        data.userId,
        data.tokenHash,
        data.expiresAt,
        data.ipAddress ?? null,
        data.userAgent ?? null,
      ]
    )
  },

  async findByHash(hash: string): Promise<{ id: number; user_id: number; expires_at: Date } | null> {
    const [rows] = await pool.query<RefreshTokenRow[]>(
      'SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = ? LIMIT 1',
      [hash]
    )
    return rows[0] ?? null
  },

  async deleteByHash(hash: string): Promise<void> {
    await pool.query<ResultSetHeader>(
      'DELETE FROM refresh_tokens WHERE token_hash = ?',
      [hash]
    )
  },

  async deleteByUserId(userId: number): Promise<void> {
    await pool.query<ResultSetHeader>(
      'DELETE FROM refresh_tokens WHERE user_id = ?',
      [userId]
    )
  },

  async deleteExpired(): Promise<void> {
    await pool.query<ResultSetHeader>(
      'DELETE FROM refresh_tokens WHERE expires_at < NOW()'
    )
  },
}
