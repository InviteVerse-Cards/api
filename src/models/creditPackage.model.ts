import pool from '@/config/database'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'
import type { CreditPackageRow } from '@/types/subscription.types'

interface PackageRowPacket extends CreditPackageRow, RowDataPacket {}

export const CreditPackageModel = {
  async findAll(): Promise<CreditPackageRow[]> {
    const [rows] = await pool.query<PackageRowPacket[]>(
      'SELECT * FROM credit_packages WHERE is_active = 1 ORDER BY sort_order ASC'
    )
    return rows
  },

  async findById(id: number): Promise<CreditPackageRow | null> {
    const [rows] = await pool.query<PackageRowPacket[]>(
      'SELECT * FROM credit_packages WHERE id = ? LIMIT 1',
      [id]
    )
    return rows[0] ?? null
  },

  async create(data: {
    name: string
    credits: number
    price: number
    validity_days?: number
    description?: string | null
    sort_order?: number
  }): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO credit_packages (name, credits, price, validity_days, description, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [data.name, data.credits, data.price, data.validity_days ?? 50, data.description ?? null, data.sort_order ?? 0]
    )
    return result.insertId
  },

  async update(id: number, data: Partial<Pick<CreditPackageRow, 'name' | 'credits' | 'price' | 'validity_days' | 'description' | 'is_active' | 'sort_order'>>): Promise<void> {
    const fields = Object.keys(data) as (keyof typeof data)[]
    if (fields.length === 0) return
    const setClauses = fields.map(f => `\`${f}\` = ?`).join(', ')
    const values = [...fields.map(f => data[f]), id]
    await pool.query<ResultSetHeader>(
      `UPDATE credit_packages SET ${setClauses}, updated_at = NOW() WHERE id = ?`,
      values
    )
  },

  async delete(id: number): Promise<void> {
    await pool.query<ResultSetHeader>(
      'UPDATE credit_packages SET is_active = 0, updated_at = NOW() WHERE id = ?',
      [id]
    )
  },
}
