# add-middleware

## Mục đích
Tạo một Express middleware mới (TypeScript) theo đúng pattern của project: typed Request/Response/NextFunction, error handling với next(err), logging với winston, và đăng ký vào app.ts hoặc routes cụ thể.

## Cách dùng
`/add-middleware <name> <type> <description>`

Types:
- `global` — áp dụng cho toàn bộ app (đăng ký trong app.ts trước routes)
- `route` — áp dụng cho một hoặc một nhóm routes cụ thể
- `error` — error handler middleware (4 params: err, req, res, next)

Ví dụ:
- `/add-middleware maintenanceMode global Chặn tất cả requests khi site đang bảo trì`
- `/add-middleware checkDeviceLimit route Giới hạn số thiết bị đăng nhập đồng thời`
- `/add-middleware handleNotFound error Xử lý 404 khi không tìm thấy route`

## Các bước thực hiện

### Bước 1 — Xác định loại middleware

**Global middleware** (đăng ký cho tất cả routes):
- Maintenance mode, request logging, response time header, CORS custom logic
- Đăng ký trong `app.ts` TRƯỚC các routes
- Chạy với mọi request

**Route middleware** (đăng ký cho route/group cụ thể):
- Auth checks, credit checks, rate limiting per route, role guards
- Đăng ký trong route file: `router.get('/path', <middleware>, controller)`
- Chỉ chạy khi request khớp route

**Error middleware** (4 params):
- Xử lý lỗi từ `next(err)`
- Phải đặt CUỐI CÙNG trong app.ts, sau tất cả routes
- `(err: Error, req: Request, res: Response, next: NextFunction)`

### Bước 2 — Tạo middleware file

Tạo `src/middleware/<middlewareName>.ts`:

#### Template — Standard (route) middleware:

```typescript
import { Request, Response, NextFunction } from 'express'
import { logger } from '@/utils/logger'

// Types nếu middleware cần options:
interface <MiddlewareName>Options {
  // ví dụ: maxDevices?: number
}

/**
 * <Mô tả middleware làm gì>
 * Dùng cho: <route nào, điều kiện nào>
 */
export const <middlewareName> = (options?: <MiddlewareName>Options) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Logic middleware ở đây

      // Nếu điều kiện không thỏa mãn → trả lỗi và DỪNG chain:
      if (/* condition failed */) {
        res.status(4xx).json({
          success: false,
          error: {
            code: 'ERROR_CODE',
            message: 'Mô tả lỗi bằng tiếng Việt',
          },
        })
        return  // QUAN TRỌNG: return để không gọi next()
      }

      // Nếu cần gắn data vào request để controller dùng:
      // req.someCustomField = value  // phải khai báo trong express.d.ts trước

      // Cho phép tiếp tục:
      next()
    } catch (error) {
      logger.error(`[<MIDDLEWARE_NAME>] Unexpected error:`, error)
      next(error)  // Chuyển lỗi đến error handler
    }
  }

// Nếu middleware không cần options (dùng trực tiếp):
export const <middlewareName>Simple = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Logic...
    next()
  } catch (error) {
    logger.error(`[<MIDDLEWARE_NAME>] Error:`, error)
    next(error)
  }
}
```

#### Template — Error handler middleware:

```typescript
import { Request, Response, NextFunction } from 'express'
import { logger } from '@/utils/logger'

interface AppError extends Error {
  statusCode?: number
  code?: string
}

/**
 * Global error handler — phải đặt cuối cùng trong app.ts
 * Xử lý tất cả lỗi được forward qua next(err)
 */
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction  // PHẢI có next param kể cả không dùng (Express yêu cầu 4 params)
): void => {
  const statusCode = err.statusCode ?? 500
  const code       = err.code ?? 'INTERNAL_ERROR'

  logger.error(`[ERROR_HANDLER] ${req.method} ${req.path} — ${statusCode} ${code}: ${err.message}`, {
    stack:    err.stack,
    userId:   req.user?.id,
    ip:       req.ip,
    body:     req.method !== 'GET' ? req.body : undefined,
  })

  // KHÔNG expose stack trace trong production:
  const isDev = process.env.NODE_ENV !== 'production'

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: statusCode === 500 && !isDev
        ? 'Đã có lỗi xảy ra, vui lòng thử lại sau'
        : err.message,
      ...(isDev && { stack: err.stack }),
    },
  })
}
```

#### Template — Global middleware (maintenance mode ví dụ):

```typescript
import { Request, Response, NextFunction } from 'express'
import { pool } from '@/config/database'
import { RowDataPacket } from 'mysql2/promise'
import { logger } from '@/utils/logger'

// Cache setting để tránh query DB mỗi request:
let maintenanceModeCache: { value: boolean; lastChecked: number } | null = null
const CACHE_TTL_MS = 30_000  // 30 giây

async function isMaintenanceMode(): Promise<boolean> {
  const now = Date.now()
  if (maintenanceModeCache && now - maintenanceModeCache.lastChecked < CACHE_TTL_MS) {
    return maintenanceModeCache.value
  }

  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT `value` FROM site_settings WHERE `key` = ? LIMIT 1',
      ['maintenance_mode']
    )
    const value = rows[0] ? rows[0]['value'] === '1' : false
    maintenanceModeCache = { value, lastChecked: now }
    return value
  } catch {
    return false  // Nếu DB lỗi → không chặn (fail open)
  }
}

/**
 * Global middleware kiểm tra maintenance mode
 * Admin (role='admin') vẫn được phép truy cập khi đang bảo trì
 */
export const maintenanceGuard = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const inMaintenance = await isMaintenanceMode()

    if (!inMaintenance) {
      next()
      return
    }

    // Cho phép: health check endpoint, admin routes, auth endpoints
    const allowedPaths = ['/api/v1/health', '/api/v1/auth/login']
    if (allowedPaths.some(p => req.path.startsWith(p))) {
      next()
      return
    }

    // Cho phép admin user vào (nếu đã auth):
    if (req.user?.role === 'admin') {
      next()
      return
    }

    logger.info(`[MAINTENANCE] Blocked request: ${req.method} ${req.path}`)

    res.status(503).json({
      success: false,
      error: {
        code: 'MAINTENANCE_MODE',
        message: 'Hệ thống đang bảo trì, vui lòng quay lại sau',
      },
    })
  } catch (error) {
    logger.error('[MAINTENANCE_GUARD] Error:', error)
    next()  // Fail open — nếu middleware lỗi thì cho đi tiếp
  }
}
```

### Bước 3 — Cập nhật express.d.ts (nếu cần)

Nếu middleware gắn thêm data vào `req`:

```typescript
// src/types/express.d.ts
import { User } from './user.types'

declare global {
  namespace Express {
    interface Request {
      user?: User           // gắn bởi auth.middleware
      sessionId?: string    // cho guest tracking
      // THÊM FIELD MỚI NẾU CẦN:
      // requestId?: string  // gắn bởi requestId middleware
      // deviceId?: string   // gắn bởi deviceCheck middleware
    }
  }
}
```

### Bước 4 — Đăng ký middleware

#### Trong app.ts (global middleware):

```typescript
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { maintenanceGuard } from '@/middleware/maintenanceGuard'
import { errorHandler } from '@/middleware/errorHandler'

const app = express()

// ─── Security middlewares (đầu tiên) ─────────────────────────────
app.use(helmet())
app.use(cors({ credentials: true, origin: process.env.FRONTEND_URL }))

// ─── Body parsing ─────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// ─── Custom global middlewares (TRƯỚC routes) ─────────────────────
app.use(maintenanceGuard)          // thêm middleware mới ở đây
// app.use(requestIdMiddleware)
// app.use(requestLoggerMiddleware)

// ─── Routes ───────────────────────────────────────────────────────
app.use('/api/v1/auth',     authRouter)
app.use('/api/v1/readings', readingRouter)
// ... các routes khác

// ─── Error handler (CUỐI CÙNG) ───────────────────────────────────
app.use(errorHandler)
```

#### Trong route file (route-level middleware):

```typescript
import { Router } from 'express'
import { checkDeviceLimit } from '@/middleware/checkDeviceLimit'
import { verifyToken } from '@/middleware/auth.middleware'

const router = Router()

// Áp dụng cho tất cả routes trong router này:
router.use(verifyToken)
router.use(checkDeviceLimit())

// Hoặc áp dụng cho route cụ thể:
router.post('/sensitive-action', checkDeviceLimit({ maxDevices: 2 }), controller)
```

### Bước 5 — Viết type guard (nếu middleware check điều kiện)

```typescript
// Utility function để check và guard TypeScript type:
function assertUser(req: Request): asserts req is Request & { user: NonNullable<Request['user']> } {
  if (!req.user) throw new Error('User not authenticated')
}

// Dùng trong middleware:
export const requireVerifiedEmail = async (req: Request, res: Response, next: NextFunction) => {
  assertUser(req)
  if (!req.user.is_verified) {
    res.status(403).json({
      success: false,
      error: { code: 'EMAIL_NOT_VERIFIED', message: 'Vui lòng xác thực email trước' },
    })
    return
  }
  next()
}
```

## Convention & Rules

### Middleware parameter naming
```typescript
// ĐÚNG — dùng _ prefix cho params không dùng:
(req: Request, _res: Response, next: NextFunction) => { ... }
// Hoặc với error handler:
(err: Error, req: Request, res: Response, _next: NextFunction) => { ... }
```

### Middleware execution order trong app.ts (BẮT BUỘC)
```
1. helmet() — security headers
2. cors() — CORS headers
3. express.json() — body parsing
4. cookieParser() — cookie parsing
5. Custom global middlewares (rate limit, maintenance, request ID)
6. Routes (các router)
7. 404 handler (nếu có)
8. errorHandler (CUỐI CÙNG)
```

### Error forwarding
```typescript
// Lỗi business logic (expected) → trả thẳng response:
res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } })
return

// Lỗi bất ngờ (unexpected) → forward sang error handler:
} catch (error) {
  next(error)
}
```

### Logging conventions
```typescript
// Format: [MIDDLEWARE_NAME] action: details
logger.info(`[MAINTENANCE_GUARD] Blocked: ${req.method} ${req.path}`)
logger.warn(`[RATE_LIMIT] User ${req.user?.id} exceeded limit`)
logger.error(`[AUTH_MIDDLEWARE] JWT verify error:`, error)
// Không log sensitive data: password, api_key, token raw value
```

### Middleware với options (factory pattern)
```typescript
// Dùng factory khi middleware cần config:
export const requireRole = (role: 'admin' | 'user') =>
  (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) { ... }
    next()
  }

// Dùng trong route:
router.get('/admin', requireRole('admin'), controller)
```

### Async middleware phải handle rejection
```typescript
// ĐÚNG:
export const asyncMiddleware = async (req, res, next) => {
  try {
    await someAsyncOperation()
    next()
  } catch (err) {
    next(err)  // PHẢI forward error
  }
}

// SAI — promise rejection không được catch:
export const badMiddleware = async (req, res, next) => {
  await someAsyncOperation()  // nếu throw → unhandled rejection!
  next()
}
```

## Checklist sau khi hoàn thành

- [ ] TypeScript types đầy đủ (Request, Response, NextFunction imported từ 'express')
- [ ] Async functions đều có try/catch và gọi `next(error)` trong catch
- [ ] Middleware không gọi `next()` sau khi đã `res.json()` (tránh "headers already sent")
- [ ] Log dùng `logger` (winston), không dùng `console.log`
- [ ] Không log sensitive data (password, raw token, api_key)
- [ ] Nếu gắn data vào `req.*` → đã khai báo trong `src/types/express.d.ts`
- [ ] Global middleware đăng ký TRƯỚC routes trong app.ts
- [ ] Error handler middleware có đúng 4 params
- [ ] Route-level middleware có trong đúng route file
- [ ] Factory pattern dùng cho middleware cần config
- [ ] Không có TypeScript errors (check với `tsc --noEmit`)
