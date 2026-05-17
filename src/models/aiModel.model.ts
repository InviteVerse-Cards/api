import pool from '@/config/database'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'

export interface AiModelRow {
  id: number
  name: string
  provider: 'openai' | 'anthropic' | 'gemini'
  model_id: string
  api_key_encrypted: string
  max_tokens: number
  temperature: number
  is_active: boolean
  is_default: boolean
  priority: number
  total_tokens_used: number
  created_at: Date
  updated_at: Date
}

interface AiModelRowPacket extends AiModelRow, RowDataPacket {}

export const AIModelModel = {
  async getActiveModels(): Promise<AiModelRow[]> {
    const [rows] = await pool.query<AiModelRowPacket[]>(
      `SELECT * FROM ai_models
       WHERE is_active = 1
       ORDER BY is_default DESC, priority ASC`
    )
    return rows
  },

  async findById(id: number): Promise<AiModelRow | null> {
    const [rows] = await pool.query<AiModelRowPacket[]>(
      'SELECT * FROM ai_models WHERE id = ? LIMIT 1',
      [id]
    )
    return rows[0] ?? null
  },

  async findAll(): Promise<AiModelRow[]> {
    const [rows] = await pool.query<AiModelRowPacket[]>(
      'SELECT * FROM ai_models ORDER BY priority ASC'
    )
    return rows
  },

  async create(data: {
    name: string
    provider: 'openai' | 'anthropic' | 'gemini'
    model_id: string
    api_key_encrypted: string
    max_tokens?: number
    temperature?: number
    priority?: number
  }): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO ai_models
         (name, provider, model_id, api_key_encrypted, max_tokens, temperature,
          is_active, is_default, priority, total_tokens_used)
       VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, 0)`,
      [
        data.name,
        data.provider,
        data.model_id,
        data.api_key_encrypted,
        data.max_tokens ?? 4096,
        data.temperature ?? 0.7,
        data.priority ?? 10,
      ]
    )
    return result.insertId
  },

  async update(id: number, data: Partial<Pick<AiModelRow,
    'name' | 'provider' | 'model_id' | 'api_key_encrypted' |
    'max_tokens' | 'temperature' | 'is_active' | 'priority'
  >>): Promise<void> {
    const fields = Object.keys(data) as (keyof typeof data)[]
    if (fields.length === 0) return

    const setClauses = fields.map(f => `\`${f}\` = ?`).join(', ')
    const values: unknown[] = fields.map(f => data[f])
    values.push(id)

    await pool.query<ResultSetHeader>(
      `UPDATE ai_models SET ${setClauses}, updated_at = NOW() WHERE id = ?`,
      values
    )
  },

  async delete(id: number): Promise<void> {
    await pool.query<ResultSetHeader>(
      'UPDATE ai_models SET is_active = 0, updated_at = NOW() WHERE id = ?',
      [id]
    )
  },

  async incrementTokens(id: number, amount: number): Promise<void> {
    await pool.query<ResultSetHeader>(
      'UPDATE ai_models SET total_tokens_used = total_tokens_used + ?, updated_at = NOW() WHERE id = ?',
      [amount, id]
    )
  },

  async setDefault(id: number): Promise<void> {
    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      await conn.query<ResultSetHeader>(
        'UPDATE ai_models SET is_default = 0, updated_at = NOW()'
      )
      await conn.query<ResultSetHeader>(
        'UPDATE ai_models SET is_default = 1, updated_at = NOW() WHERE id = ?',
        [id]
      )
      await conn.commit()
    } catch (err) {
      await conn.rollback()
      throw err
    } finally {
      conn.release()
    }
  },
}
