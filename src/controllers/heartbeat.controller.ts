import type { Request, Response } from 'express'
import pool from '@/config/database'
import crypto from 'crypto'
import { lookupIp } from '@/utils/geoip'

const SESSION_COOKIE = 'iv_sid'
const SESSION_MAX_AGE = 365 * 24 * 60 * 60 * 1000

const BOT_PATTERN = /bot|crawler|spider|slurp|baiduspider|bingbot|googlebot|yandex|facebookexternalhit|wget|curl/i

function getIp(req: Request): string {
  const raw = req.ip ?? req.socket.remoteAddress ?? 'unknown'
  return raw === '::1' ? '127.0.0.1' : raw.replace(/^::ffff:/, '')
}

function resolveSession(req: Request, res: Response): string {
  let sessionId: string = req.cookies?.[SESSION_COOKIE]
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    res.cookie(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE,
    })
  }
  return sessionId
}

export const HeartbeatController = {
  async ping(req: Request, res: Response) {
    try {
      const ua: string = req.headers['user-agent'] ?? ''
      if (BOT_PATTERN.test(ua)) {
        return res.status(200).json({ success: true })
      }

      const ip = getIp(req)
      const { country, city } = lookupIp(ip)
      const sessionId = resolveSession(req, res)
      const userId: number | null = (req.user as { id: number } | undefined)?.id ?? null
      const page = typeof req.body?.page === 'string' ? req.body.page.slice(0, 128) : null

      res.status(200).json({ success: true })

      await pool.query(
        `INSERT INTO online_heartbeats (session_id, user_id, page, ip_address, country, city, last_seen)
         VALUES (?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE last_seen = NOW(), user_id = ?, page = ?, country = COALESCE(?, country), city = COALESCE(?, city)`,
        [sessionId, userId, page, ip, country, city, userId, page, country, city]
      )
    } catch (err) {
      console.error('Lỗi heartbeat:', err)
      if (!res.headersSent) {
        res.status(200).json({ success: true })
      }
    }
  },
}
