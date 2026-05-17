import { Router } from 'express'
import { success } from '@/utils/response'
import pool from '@/config/database'
import type { RowDataPacket } from 'mysql2'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    interface StatsRow extends RowDataPacket {
      total_users: number
      active_users: number
      total_invitations: number
      published_invitations: number
      total_orders: number
      paid_orders: number
    }
    const [[stats]] = await pool.query<StatsRow[]>(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE is_active = 1)             AS total_users,
        (SELECT COUNT(*) FROM users WHERE is_active = 1 AND credits_balance > 0) AS active_users,
        (SELECT COUNT(*) FROM invitations WHERE deleted_at IS NULL)  AS total_invitations,
        (SELECT COUNT(*) FROM invitations WHERE status = 'published' AND deleted_at IS NULL) AS published_invitations,
        (SELECT COUNT(*) FROM credit_orders)                         AS total_orders,
        (SELECT COUNT(*) FROM credit_orders WHERE status = 'paid')   AS paid_orders
    `)
    return res.json(success(stats))
  } catch (err) { next(err) }
})

export default router
