import pool from '@/config/database'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'

export interface MusicTrack extends RowDataPacket {
  id: number
  name: string
  url: string
  is_active: boolean
  is_default: boolean
  created_at: Date
  updated_at: Date
}

export const MusicModel = {
  async listAll() {
    const [rows] = await pool.query<MusicTrack[]>(
      'SELECT * FROM music_tracks ORDER BY id DESC'
    )
    return rows
  },

  async listActive() {
    const [rows] = await pool.query<MusicTrack[]>(
      'SELECT id, name, url FROM music_tracks WHERE is_active = 1 ORDER BY id ASC'
    )
    return rows
  },

  async findById(id: number) {
    const [rows] = await pool.query<MusicTrack[]>(
      'SELECT * FROM music_tracks WHERE id = ?',
      [id]
    )
    return rows[0] || null
  },

  async create(data: { name: string; url: string; is_active?: boolean }) {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO music_tracks (name, url, is_active) VALUES (?, ?, ?)',
      [data.name, data.url, data.is_active ?? true]
    )
    return { id: result.insertId, ...data }
  },

  async update(id: number, data: Partial<{ name: string; url: string; is_active: boolean }>) {
    const fields = []
    const values = []
    
    if (data.name !== undefined) {
      fields.push('name = ?')
      values.push(data.name)
    }
    if (data.url !== undefined) {
      fields.push('url = ?')
      values.push(data.url)
    }
    if (data.is_active !== undefined) {
      fields.push('is_active = ?')
      values.push(data.is_active)
    }

    if (fields.length === 0) return this.findById(id)

    values.push(id)
    await pool.query(
      `UPDATE music_tracks SET ${fields.join(', ')} WHERE id = ?`,
      values
    )
    return this.findById(id)
  },

  async remove(id: number) {
    await pool.query('DELETE FROM music_tracks WHERE id = ?', [id])
  },

  async setDefault(id: number) {
    await pool.query('UPDATE music_tracks SET is_default = 0')
    await pool.query('UPDATE music_tracks SET is_default = 1 WHERE id = ?', [id])
    return this.findById(id)
  },

  async findDefault() {
    const [rows] = await pool.query<MusicTrack[]>(
      'SELECT id, name, url FROM music_tracks WHERE is_default = 1 AND is_active = 1 LIMIT 1'
    )
    if (rows[0]) return rows[0]
    // Fallback: first active track if none is marked default
    const [fallback] = await pool.query<MusicTrack[]>(
      'SELECT id, name, url FROM music_tracks WHERE is_active = 1 ORDER BY id ASC LIMIT 1'
    )
    return fallback[0] || null
  },
}
