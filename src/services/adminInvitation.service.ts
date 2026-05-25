import pool from '@/config/database'
import type { RowDataPacket, ResultSetHeader } from 'mysql2'

export const AdminInvitationService = {
  async findAll(opts: {
    search?: string
    category?: string
    status?: string
    page: number
    limit: number
  }) {
    const conditions = ['i.deleted_at IS NULL']
    const params: any[] = []

    if (opts.search) {
      conditions.push('(i.title LIKE ? OR i.slug LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)')
      const like = `%${opts.search}%`
      params.push(like, like, like, like)
    }

    if (opts.category) {
      conditions.push('i.category = ?')
      params.push(opts.category)
    }

    if (opts.status) {
      conditions.push('i.status = ?')
      params.push(opts.status)
    }

    const where = `WHERE ${conditions.join(' AND ')}`

    const [[countRow]] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total
       FROM invitations i
       JOIN users u ON i.user_id = u.id
       ${where}`,
      params
    )
    const total = countRow?.total ?? 0

    const offset = (opts.page - 1) * opts.limit
    const query = `
      SELECT
        i.id,
        i.uuid,
        i.slug,
        i.title,
        i.category,
        i.status,
        i.view_count,
        i.created_at,
        u.full_name as user_name,
        u.email as user_email,
        t.name as template_name,
        (SELECT COUNT(*) FROM guests g WHERE g.invitation_id = i.id) as guest_count
      FROM invitations i
      JOIN users u ON i.user_id = u.id
      LEFT JOIN templates t ON i.template_id = t.id
      ${where}
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `
    const [rows] = await pool.query<RowDataPacket[]>(
      query,
      [...params, opts.limit, offset]
    )

    return { rows, total }
  },

  async delete(uuid: string) {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE invitations SET deleted_at = NOW() WHERE uuid = ?',
      [uuid]
    )
    return result.affectedRows > 0
  }
}
