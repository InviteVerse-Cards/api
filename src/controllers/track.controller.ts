import type { Request, Response } from 'express'
import pool from '@/config/database'
import crypto from 'crypto'

const SESSION_COOKIE = 'iv_sid'
const SESSION_MAX_AGE = 365 * 24 * 60 * 60 * 1000 // 1 year

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

export const TrackController = {
  async track(req: Request, res: Response) {
    try {
      const ua: string = req.headers['user-agent'] ?? ''
      if (BOT_PATTERN.test(ua)) {
        return res.status(200).json({ success: true })
      }

      const { type, page, event_type, module, meta, referrer } = req.body as {
        type: 'pageview' | 'event'
        page?: string
        event_type?: string
        module?: string
        meta?: Record<string, unknown>
        referrer?: string
      }

      const ip = getIp(req)
      const sessionId = resolveSession(req, res)
      const userId: number | null = (req.user as { id: number } | undefined)?.id ?? null

      res.status(200).json({ success: true })

      if (type === 'pageview' && page) {
        const safePage = page.slice(0, 128)
        const safeReferrer = referrer ? referrer.slice(0, 512) : null
        const safeUa = ua ? ua.slice(0, 512) : null
        await pool.query(
          `INSERT INTO page_view_logs (session_id, user_id, page, referrer, user_agent, ip_address)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [sessionId, userId, safePage, safeReferrer, safeUa, ip]
        )
        return
      }

      if (type === 'event' && event_type) {
        const safeEvent = event_type.slice(0, 64)
        const safeModule = module ? module.slice(0, 32) : null
        const safeMeta = meta ? JSON.stringify(meta) : null
        await pool.query(
          `INSERT INTO feature_events (session_id, user_id, event_type, module, meta, ip_address)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [sessionId, userId, safeEvent, safeModule, safeMeta, ip]
        )
      }
    } catch (err) {
      console.error('Lỗi tracking:', err)
      if (!res.headersSent) {
        res.status(200).json({ success: true })
      }
    }
  },
}
