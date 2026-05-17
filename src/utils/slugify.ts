import pool from '@/config/database'
import type { RowDataPacket } from 'mysql2'

export function slugifyVietnamese(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/^-|-$/g, '')
}

function nanoidSimple(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

export async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugifyVietnamese(title) || 'thiep'
  let slug = `${base}-${nanoidSimple()}`

  for (let attempts = 0; attempts < 5; attempts++) {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM invitations WHERE slug = ?', [slug]
    )
    if (rows.length === 0) return slug
    slug = `${base}-${nanoidSimple()}`
  }
  return `${base}-${Date.now()}`
}
