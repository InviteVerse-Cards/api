import pool from '@/config/database'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'
import type { CreditUsageLogRow } from '@/types/subscription.types'

interface LogRowPacket extends CreditUsageLogRow, RowDataPacket {}
interface CountPacket extends RowDataPacket { total: number }

export const CreditUsageLogModel = {
  async create(data: {
    user_id: number
    reading_id?: number | null
    module?: string
    credits_used: number
    balance_after: number
  }): Promise<void> {
    await pool.query<ResultSetHeader>(
      `INSERT INTO credit_usage_logs (user_id, reading_id, module, credits_used, balance_after)
       VALUES (?, ?, ?, ?, ?)`,
      [data.user_id, data.reading_id ?? null, data.module ?? 'ai', data.credits_used, data.balance_after]
    )
  },

  async findByUser(
    userId: number,
    opts: { page: number; limit: number }
  ): Promise<{ rows: CreditUsageLogRow[]; total: number }> {
    const offset = (opts.page - 1) * opts.limit

    const [[countRow]] = await pool.query<CountPacket[]>(
      'SELECT COUNT(*) AS total FROM credit_usage_logs WHERE user_id = ?',
      [userId]
    )
    const [rows] = await pool.query<LogRowPacket[]>(
      'SELECT * FROM credit_usage_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, opts.limit, offset]
    )
    return { rows, total: countRow?.total ?? 0 }
  },
}
