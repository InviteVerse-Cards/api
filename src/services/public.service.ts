import pool from '@/config/database'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { InvitationModel } from '@/models/invitation.model'
import { AppError } from '@/utils/response'

export const PublicService = {
  async getPublishedInvitation(slug: string, password?: string) {
    const invitation = await InvitationModel.findBySlug(slug)
    if (!invitation || invitation.status !== 'published') {
      throw new AppError('NOT_FOUND', 'Thiệp không tồn tại hoặc chưa được xuất bản', 404)
    }

    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      throw new AppError('EXPIRED', 'Thiệp này đã hết hạn', 410)
    }

    if (invitation.password) {
      if (!password || invitation.password !== password) {
        throw new AppError('PASSWORD_REQUIRED', 'Thiệp này được bảo vệ bằng mật khẩu', 403)
      }
    }

    InvitationModel.incrementViewCount(invitation.id)

    const sections = await InvitationModel.getSections(invitation.id)

    const { password: _pw, user_id: _uid, ...safe } = invitation as any
    return {
      ...safe,
      sections,
      meta: {
        title: invitation.meta_title || invitation.title,
        description: invitation.meta_description,
        og_image: invitation.og_image_url,
      },
    }
  },

  async submitRSVP(slug: string, body: {
    name: string; phone?: string; email?: string
    status: 'attending' | 'not_attending' | 'maybe'; note?: string
  }) {
    const invitation = await InvitationModel.findBySlug(slug)
    if (!invitation || invitation.status !== 'published') {
      throw new AppError('NOT_FOUND', 'Thiệp không tồn tại', 404)
    }

    await pool.query<ResultSetHeader>(
      `INSERT INTO guests (invitation_id, name, phone, email, rsvp_status, rsvp_note, rsvp_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [invitation.id, body.name, body.phone ?? null, body.email ?? null, body.status, body.note ?? null]
    )
  },

  async getGuestList(userId: number, uuid: string) {
    const invitation = await InvitationModel.findByUuid(uuid)
    if (!invitation) throw new AppError('NOT_FOUND', 'Không tìm thấy thiệp', 404)
    if (invitation.user_id !== userId) throw new AppError('FORBIDDEN', 'Không có quyền', 403)

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, phone, email, rsvp_status, rsvp_note, rsvp_at
       FROM guests WHERE invitation_id = ? ORDER BY rsvp_at DESC`,
      [invitation.id]
    )
    return rows
  },

  async getWishes(slug: string) {
    const invitation = await InvitationModel.findBySlug(slug)
    if (!invitation || invitation.status !== 'published') {
      throw new AppError('NOT_FOUND', 'Thiệp không tồn tại', 404)
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT name, rsvp_note, rsvp_at
       FROM guests
       WHERE invitation_id = ? AND rsvp_note IS NOT NULL AND rsvp_note != ''
       ORDER BY rsvp_at DESC
       LIMIT 50`,
      [invitation.id]
    )
    return rows
  },

  async getMusicTracks() {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, name, url FROM music_tracks WHERE is_active = 1 ORDER BY id ASC'
    )
    return rows
  },
}
