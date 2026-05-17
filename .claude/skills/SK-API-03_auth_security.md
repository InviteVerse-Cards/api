# [SK-API-03] Auth & Security

> Trigger: Viết endpoint có auth, rate limit, input validation, upload, hoặc security review.

---

## JWT Strategy

```typescript
// config/jwt.ts
import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET!
const EXPIRES_IN = Number(process.env.JWT_EXPIRES_IN || 86400)

interface JWTPayload {
  sub: number      // user id
  uuid: string
  plan: 'free' | 'pro'
  iat?: number
  exp?: number
}

export function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN })
}

export function verifyJWT(token: string): JWTPayload {
  return jwt.verify(token, SECRET) as JWTPayload
}
```

---

## verifyToken Middleware

```typescript
// middleware/auth.middleware.ts
import type { Request, Response, NextFunction } from 'express'
import { verifyJWT } from '@/config/jwt'
import { AppError } from '@/shared/errors/AppError'

export async function verifyToken(req: Request, res: Response, next: NextFunction) {
  const token =
    req.cookies?.access_token ||
    req.headers.authorization?.replace('Bearer ', '')

  if (!token) {
    return next(new AppError('UNAUTHORIZED', 'Vui lòng đăng nhập', 401))
  }

  try {
    const payload = verifyJWT(token)
    req.user = { id: payload.sub, uuid: payload.uuid, plan: payload.plan }
    return next()
  } catch {
    return next(new AppError('TOKEN_INVALID', 'Phiên đăng nhập hết hạn', 401))
  }
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const token =
    req.cookies?.access_token ||
    req.headers.authorization?.replace('Bearer ', '')
  if (token) {
    try {
      const payload = verifyJWT(token)
      req.user = { id: payload.sub, uuid: payload.uuid, plan: payload.plan }
    } catch { /* ignore */ }
  }
  return next()
}
```

---

## Express Type Augmentation

```typescript
// shared/types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number
        uuid: string
        plan: 'free' | 'pro'
      }
    }
  }
}
export {}
```

---

## Rate Limiting

```typescript
// middleware/rateLimit.middleware.ts
import rateLimit from 'express-rate-limit'

// Cho API chung
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Quá nhiều request, thử lại sau 15 phút' } },
})

// Cho auth endpoints (chặt hơn)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Quá nhiều lần thử, thử lại sau 15 phút' } },
})

// Cho AI endpoints
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 giờ
  max: 20,
  keyGenerator: (req) => String(req.user?.id || req.ip),
  message: { success: false, error: { code: 'AI_RATE_LIMIT', message: 'Giới hạn AI request mỗi giờ' } },
})

// Cho webhook (không rate limit — web2m gọi)
export const noLimit = (_req: any, _res: any, next: any) => next()
```

---

## Input Validation (Zod)

```typescript
// modules/invitations/invitations.schema.ts
import { z } from 'zod'

export const createInvitationSchema = z.object({
  body: z.object({
    template_id: z.number().int().positive().optional(),
    title: z.string().min(1).max(300),
    category: z.enum(['wedding', 'birthday', 'baby_shower', 'housewarming', 'corporate']),
    theme_config: z.record(z.unknown()).optional(),
    sections: z.array(z.object({
      section_type: z.string(),
      sort_order: z.number().int().min(0),
      is_enabled: z.boolean(),
      config: z.record(z.unknown()),
    })).optional(),
  }),
})

// validate middleware
export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({ body: req.body, params: req.params, query: req.query })
    if (!result.success) {
      return next(new AppError(
        'VALIDATION_ERROR',
        result.error.errors.map(e => e.message).join(', '),
        400
      ))
    }
    return next()
  }
}
```

---

## requireCredits Middleware

```typescript
// middleware/checkCredits.middleware.ts
export function requireCredits(amount: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT balance FROM credits WHERE user_id = ?',
      [req.user!.id]
    )
    const balance = rows[0]?.balance ?? 0
    if (balance < amount) {
      return next(new AppError(
        'CREDIT_INSUFFICIENT',
        `Cần ${amount} credit để thực hiện. Số dư hiện tại: ${balance}`,
        402
      ))
    }
    return next()
  }
}
```

---

## Password Hashing

```typescript
import bcrypt from 'bcryptjs'

// Hash khi register
const passwordHash = await bcrypt.hash(password, 12)

// Verify khi login
const isValid = await bcrypt.compare(plainPassword, storedHash)
if (!isValid) throw new AppError('AUTH_FAILED', 'Email hoặc mật khẩu không đúng', 401)
```

---

## Owner Verification (luôn làm khi access resource)

```typescript
// Kiểm tra ownership — dùng cho mọi resource của user
async function assertOwner(uuid: string, userId: number): Promise<InvitationRow> {
  const invitation = await InvitationRepository.findByUuid(uuid)
  if (!invitation) throw new AppError('NOT_FOUND', 'Không tìm thấy thiệp', 404)
  if (invitation.user_id !== userId) throw new AppError('FORBIDDEN', 'Không có quyền', 403)
  return invitation
}
```

---

## SQL Injection Prevention

```typescript
// ❌ TUYỆT ĐỐI không làm thế này
pool.query(`SELECT * FROM users WHERE email = '${email}'`)
pool.query(`SELECT * FROM users WHERE id = ${id}`)

// ✅ LUÔN dùng parameterized query
pool.query('SELECT * FROM users WHERE email = ?', [email])
pool.query('SELECT * FROM users WHERE id = ?', [id])
```

---

## XSS Prevention

```typescript
import { JSDOM } from 'jsdom'
import DOMPurify from 'dompurify'
const { window } = new JSDOM('')
const purify = DOMPurify(window)

// Sanitize user-generated text trước khi lưu DB
function sanitizeText(input: string): string {
  return purify.sanitize(input, { ALLOWED_TAGS: [] }).slice(0, 1000)
}

// Áp dụng cho: invitation title, section text fields, guest name, RSVP note
```

---

## Webhook Secret Verification (Web2m)

```typescript
// Verify webhook request là từ web2m, không từ attacker
export function verifyWebhookSecret(req: Request, res: Response, next: NextFunction) {
  const secret = req.headers['x-webhook-secret'] || req.headers['x-web2m-secret']
  if (secret !== process.env.WEB2M_SECRET) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid webhook secret' } })
  }
  return next()
}
```

---

## Security Headers (trong Nginx)

Các header security cần set ở Nginx (không cần set lại trong Express):

```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```
