# scaffold-route

## Mục đích
Scaffold đầy đủ một endpoint mới: route file, controller, service, validator, TypeScript types — đảm bảo đúng middleware chain và conventions của project InviteVerse Cards.

## Cách dùng
`/scaffold-route <method> <path> <description>`

Ví dụ:
- `/scaffold-route POST /readings/career Xem tử vi nghề nghiệp (premium, 1 credit)`
- `/scaffold-route GET /users/profile Lấy thông tin profile user hiện tại`

## Các bước thực hiện

### Bước 1 — Phân tích yêu cầu

Xác định từ arguments:
- HTTP method (GET / POST / PUT / DELETE / PATCH)
- Path (ví dụ: `/readings/career`)
- Có cần auth không? (nếu path liên quan user, readings, credits → YES)
- Có tốn credits không? (nếu là reading module premium → YES)
- Có phải admin-only không? (nếu path bắt đầu bằng `/admin/` → YES)

### Bước 2 — Tạo TypeScript types

Tạo hoặc cập nhật file `src/types/<module>.types.ts`:

```typescript
// src/types/<module>.types.ts

// Request body / query params
export interface <FeatureName>Request {
  // Điền các field cần thiết, ví dụ:
  full_name: string
  birth_date: string  // "YYYY-MM-DD"
  // ...
}

// Response data trả về client (KHÔNG có password_hash, api_key_enc)
export interface <FeatureName>Response {
  reading_id: number
  module: string
  result: Record<string, unknown>
  credits_remaining: number
}
```

Nếu endpoint thêm field mới vào `req.*`, cập nhật `src/types/express.d.ts`:
```typescript
declare global {
  namespace Express {
    interface Request {
      // thêm field mới nếu cần
    }
  }
}
```

### Bước 3 — Tạo validator

Tạo hoặc cập nhật file `src/middleware/validators/<module>.validator.ts`:

```typescript
import { body, param, query } from 'express-validator'

export const validate<FeatureName> = [
  body('field_name')
    .trim()
    .notEmpty().withMessage('field_name không được để trống')
    .isLength({ max: 100 }).withMessage('field_name tối đa 100 ký tự'),
  // Dùng .isISO8601() cho date, .isInt() cho số, .isEmail() cho email
  // KHÔNG dùng .custom() quá phức tạp — keep simple
]
```

Validator rules phải:
- Sanitize (`.trim()`, `.escape()` cho string input)
- Check type (`.isInt()`, `.isEmail()`, `.isISO8601()`)
- Check length limits
- Messages bằng tiếng Việt

### Bước 4 — Tạo service method

Thêm method vào `src/services/<module>.service.ts` hoặc tạo mới:

```typescript
import { pool } from '@/config/database'
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise'
import { logger } from '@/utils/logger'

export class <Module>Service {
  static async <methodName>(params: <FeatureName>Request, userId: number): Promise<<FeatureName>Response> {
    // 1. Validate business logic (ngoài validator)
    // 2. Query DB với parameterized queries — KHÔNG string concat
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM table WHERE id = ? AND user_id = ?',
      [id, userId]
    )

    // 3. Gọi AI nếu cần (dùng AIService.call())
    // 4. Trả về data

    return {
      reading_id: ...,
      // ...
    }
  }
}
```

### Bước 5 — Tạo controller

Tạo hoặc cập nhật `src/controllers/<module>.controller.ts`:

```typescript
import { Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { <Module>Service } from '@/services/<module>.service'
import { logger } from '@/utils/logger'

export const <methodName> = async (req: Request, res: Response): Promise<void> => {
  // 1. Kiểm tra validation errors (nếu có validator)
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        details: errors.array(),
      },
    })
    return
  }

  try {
    const userId = req.user!.id  // chỉ có nếu verifyToken đã chạy

    const result = await <Module>Service.<methodName>(req.body, userId)

    res.json({
      success: true,
      data: result,
      message: 'Thành công',
    })
  } catch (error) {
    logger.error(`[<MODULE>_CONTROLLER] <methodName> error:`, error)
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Đã có lỗi xảy ra, vui lòng thử lại',
      },
    })
  }
}
```

**Quy tắc controller:**
- Luôn có try/catch bao quanh toàn bộ logic
- Không chứa business logic — delegate sang service
- Không expose `password_hash`, `api_key_enc`, `token_hash`
- Log lỗi với `logger.error()` — không dùng `console.log`
- Return sớm sau `res.json()` hoặc dùng `return res.json(...)` để tránh "headers already sent"

### Bước 6 — Tạo route file

Tạo hoặc cập nhật `src/routes/<module>.routes.ts`:

```typescript
import { Router } from 'express'
import { verifyToken, requireRole } from '@/middleware/auth.middleware'
import { requireCredits } from '@/middleware/checkCredits'
import { validate } from '@/middleware/validate'
import { validate<FeatureName> } from '@/middleware/validators/<module>.validator'
import { <methodName> } from '@/controllers/<module>.controller'

const router = Router()

// Middleware chain phải theo đúng thứ tự:
// 1. Rate limiting (nếu có)
// 2. verifyToken (bắt buộc nếu cần auth)
// 3. requireRole('admin') (chỉ admin routes)
// 4. requireCredits (chỉ premium endpoints)
// 5. validate(validateRules) — sau verifyToken để dùng req.user nếu cần
// 6. controller

// Public endpoint (không cần auth):
router.get('/path', validate(validatePublic), controllerFn)

// Auth required:
router.post('/path', verifyToken, validate(validateRules), controllerFn)

// Auth + Credits required (premium reading):
router.post('/path', verifyToken, requireCredits, validate(validateRules), controllerFn)

// Admin only:
router.get('/admin/path', verifyToken, requireRole('admin'), controllerFn)

export default router
```

### Bước 7 — Đăng ký route trong app.ts

Mở `src/app.ts` và thêm:
```typescript
import <module>Router from '@/routes/<module>.routes'

// Trong phần app.use routes:
app.use('/api/v1/<module>', <module>Router)
```

Đảm bảo thêm sau middleware global (helmet, cors, cookieParser, rateLimit) nhưng trước `errorHandler`.

### Bước 8 — Kiểm tra lại toàn bộ

Chạy kiểm tra cuối (xem Checklist bên dưới).

## Convention & Rules

### Middleware chain order (BẮT BUỘC)
```
rateLimiter? → verifyToken? → requireRole? → requireCredits? → validate() → controller
```

### HTTP Status codes chuẩn
| Tình huống | Status |
|---|---|
| Thành công | 200 hoặc 201 (tạo mới) |
| Validation lỗi | 422 |
| Không có token / token hết hạn | 401 |
| Không có quyền (role) | 403 |
| Không tìm thấy resource | 404 |
| Hết credits / Credits frozen | 402 |
| Logic error (business rule) | 409 |
| Server error | 500 |

### Response format chuẩn (BẮT BUỘC)
```typescript
// Success:
{ success: true, data: T, message?: string }

// Error:
{ success: false, error: { code: string, message: string, details?: unknown } }

// Paginated:
{ success: true, data: { items: T[], total: number, page: number, limit: number, totalPages: number } }
```

### Error codes (dùng SCREAMING_SNAKE_CASE)
- `NO_TOKEN`, `TOKEN_EXPIRED`, `USER_INACTIVE`
- `FORBIDDEN`
- `NOT_FOUND`
- `NO_CREDITS`, `CREDITS_FROZEN`
- `VALIDATION_ERROR`
- `INTERNAL_ERROR`
- Module-specific: `READING_EXISTS`, `PACKAGE_NOT_FOUND`, v.v.

### DB queries
- LUÔN dùng parameterized queries: `pool.execute('SELECT * WHERE id = ?', [id])`
- KHÔNG bao giờ string concat vào SQL
- Import types: `ResultSetHeader` cho INSERT/UPDATE, `RowDataPacket` cho SELECT
- Pool import từ `@/config/database`

### Import alias
- Dùng `@/` thay vì `../../` — đã config trong tsconfig.json
- `@/config/database`, `@/middleware/auth.middleware`, `@/utils/logger`, v.v.

## Checklist sau khi hoàn thành

- [ ] TypeScript types được khai báo đầy đủ (không dùng `any`)
- [ ] Validator rules đã có cho tất cả input fields
- [ ] Controller có try/catch bao toàn bộ
- [ ] Controller KHÔNG expose password_hash, api_key_enc
- [ ] SQL dùng parameterized queries (có dấu `?`)
- [ ] Route đăng ký đúng middleware chain order
- [ ] Route đã được mount vào app.ts
- [ ] Không có `console.log` — chỉ dùng `logger.error/warn/info`
- [ ] HTTP status code đúng với từng tình huống
- [ ] Response format đúng `{ success, data?, error? }`
- [ ] File mới không có TypeScript errors (check với `tsc --noEmit`)
