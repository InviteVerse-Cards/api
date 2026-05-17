import pool from '@/config/database'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'

interface SettingRow extends RowDataPacket {
  key: string
  value: string
}

export const SettingModel = {
  async get(key: string): Promise<string | null> {
    const [rows] = await pool.query<SettingRow[]>(
      'SELECT `value` FROM settings WHERE `key` = ? LIMIT 1',
      [key]
    )
    return rows[0]?.value ?? null
  },

  async getNumber(key: string, defaultVal: number): Promise<number> {
    const val = await this.get(key)
    if (val === null) return defaultVal
    const num = Number(val)
    return isNaN(num) ? defaultVal : num
  },

  async getAll(): Promise<Record<string, string>> {
    const [rows] = await pool.query<SettingRow[]>(
      'SELECT `key`, `value` FROM settings'
    )
    const result: Record<string, string> = {}
    for (const row of rows) {
      result[row.key] = row.value
    }
    return result
  },

  async set(key: string, value: string): Promise<void> {
    await pool.query<ResultSetHeader>(
      `INSERT INTO settings (\`key\`, \`value\`) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), updated_at = NOW()`,
      [key, value]
    )
  },

  async setMany(data: Record<string, string>): Promise<void> {
    const entries = Object.entries(data)
    if (entries.length === 0) return

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      for (const [key, value] of entries) {
        await conn.query<ResultSetHeader>(
          `INSERT INTO settings (\`key\`, \`value\`) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), updated_at = NOW()`,
          [key, value]
        )
      }
      await conn.commit()
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  },
}
