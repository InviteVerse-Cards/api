# review-endpoint

## Mục đích
Thực hiện security và logic review cho một endpoint cụ thể. Kiểm tra: input validation, auth middleware chain order, SQL injection prevention, rate limiting, data leakage, error codes và HTTP status codes.

## Cách dùng
`/review-endpoint <method> <path>`

Ví dụ:
- `/review-endpoint POST /readings/love`
- `/review-endpoint GET /admin/users`
- `/review-endpoint PUT /users/profile`
- `/review-endpoint POST /credits/create-order`

## Các bước thực hiện

### Bước 1 — Xác định và đọc các file liên quan

Từ `<method> <path>`, xác định các files cần review:

```
Route:       src/routes/<module>.routes.ts
Controller:  src/controllers/<module>.controller.ts
Service:     src/services/<module>.service.ts
Validator:   src/middleware/validators/<module>.validator.ts
Types:       src/types/<module>.types.ts
Model:       src/models/<model>.model.ts
```

Đọc tất cả các files này trước khi review.

### Bước 2 — Review middleware chain order

Kiểm tra trong route file:

```typescript
// Đúng thứ tự cho premium reading endpoint:
router.post('/love',
  rateLimiter,        // 1. Rate limit (optional but recommended)
  verifyToken,        // 2. Auth check
  requireCredits,     // 3. Credits check (sau verifyToken vì cần req.user)
  validate(rules),    // 4. Input validation
  controller          // 5. Business logic
)

// Đúng thứ tự cho admin endpoint:
router.get('/users',
  verifyToken,         // 1. Auth
  requireRole('admin'), // 2. Role check (phải sau verifyToken)
  validate(rules),     // 3. Validation (query params)
  controller           // 4. Logic
)
```

**Red flags:**
- `requireCredits` TRƯỚC `verifyToken` → `req.user` sẽ là undefined → crash
- `requireRole` TRƯỚC `verifyToken` → role check luôn fail
- `validate` TRƯỚC `verifyToken` → validator không thể dùng `req.user` nếu cần
- Không có `verifyToken` cho endpoint cần auth
- Không có `requireRole('admin')` cho admin endpoints

### Bước 3 — Review input validation

Kiểm tra validator file:

**Checklist validation:**

```typescript
// a) Tất cả user input đều phải được validate:
body('email').isEmail().normalizeEmail()
body('full_name').trim().notEmpty().isLength({ min: 2, max: 100 })
body('birth_date').isISO8601()
body('amount').isInt({ min: 1 })
param('id').isInt({ min: 1 })
query('page').optional().isInt({ min: 1, max: 1000 })

// b) KHÔNG có raw user input đi thẳng vào SQL
// c) KHÔNG có open redirect (URL từ user dùng làm redirect)
// d) Input được sanitize: .trim(), .escape() khi cần
// e) File upload: check MIME type, size limit, không cho phép .exe/.php

// f) Rate limiting cho sensitive endpoints:
import rateLimit from 'express-rate-limit'

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 phút
  max: 5,                     // 5 lần đăng nhập sai
  message: { success: false, error: { code: 'TOO_MANY_ATTEMPTS' } },
  standardHeaders: true,
  legacyHeaders: false,
})
```

**Kiểm tra các attack vectors:**
- **XSS:** Input string có được escape không? (`.escape()` hoặc `sanitizeHtml`)
- **Path traversal:** Nếu nhận filename từ user → có validate safe path không?
- **Mass assignment:** Có lọc đúng fields từ `req.body` không? (không assign toàn bộ body vào DB)

### Bước 4 — Review SQL queries trong service/model

Kiểm tra từng SQL query:

```typescript
// ĐÚNG — parameterized query:
const [rows] = await pool.execute<RowDataPacket[]>(
  'SELECT id, email, full_name, credits_balance FROM users WHERE id = ? AND is_active = 1',
  [userId]
)

// SAI — SQL injection risk:
await pool.query(`SELECT * FROM users WHERE email = '${email}'`)  // ❌
await pool.execute(`SELECT * FROM ${tableName} WHERE id = ${id}`) // ❌

// ĐÚNG — dynamic ORDER BY (cần whitelist):
const allowedOrderBy = ['created_at', 'id', 'credits_balance']
const orderBy = allowedOrderBy.includes(req.query.sort as string)
  ? req.query.sort
  : 'created_at'
// Sau đó dùng trong query (string literal vì đã whitelist):
`SELECT * FROM users ORDER BY ${orderBy} DESC`  // OK nếu đã whitelist

// SAI — ORDER BY từ user input trực tiếp:
`SELECT * FROM users ORDER BY ${req.query.sort}`  // ❌ SQL injection
```

**Checklist SQL security:**
- [ ] Tất cả `WHERE` conditions dùng `?` placeholder
- [ ] Tất cả `VALUES` dùng `?` placeholder
- [ ] Dynamic column/table names được whitelist trước khi dùng
- [ ] LIKE search: `%${search}%` là an toàn nếu `search` được validate length trước
- [ ] Không có `eval()` hoặc string template trong SQL
- [ ] Transactions dùng cho multi-step operations (credits deduction + readings insert)

### Bước 5 — Review response data leakage

Kiểm tra những gì controller trả về:

```typescript
// SAI — trả về toàn bộ user object (có thể có password_hash):
res.json({ success: true, data: user })  // ❌ nếu user có password_hash

// ĐÚNG — chỉ trả về fields cần thiết:
const { id, full_name, email, credits_balance, credits_expires_at, role } = user
res.json({ success: true, data: { id, full_name, email, credits_balance, credits_expires_at, role } })

// Blacklist các fields KHÔNG BAO GIỜ trả về:
const SENSITIVE_FIELDS = [
  'password_hash',    // users table
  'api_key_enc',      // ai_models table
  'token_hash',       // refresh_tokens table
  'bank_token',       // web2m config
]
```

**Review từng response trong controller:**

```typescript
// Admin endpoint — có thể trả về thêm data:
// GET /admin/users/:id → OK trả email, phone, credits, logs
// GET /admin/ai-models → KHÔNG trả api_key_enc (chỉ masked version)

// User endpoint — chỉ trả data của chính họ:
// GET /users/profile → KHÔNG trả password_hash, KHÔNG trả data của user khác

// Public endpoint — tối thiểu:
// GET /credit-packages → chỉ trả name, credits, price, validity_days
```

### Bước 6 — Review error handling và HTTP status codes

```typescript
// Kiểm tra: có try/catch bao toàn bộ controller không?
export const controller = async (req, res) => {
  try {
    // ...
  } catch (error) {
    logger.error(...)
    res.status(500).json(...)
  }
}

// Kiểm tra: status codes đúng không?
// 200 → thành công, data trả về
// 201 → tạo mới thành công
// 400 → bad request (malformed request)
// 401 → unauthenticated (cần đăng nhập)
// 402 → payment required (no credits / frozen)
// 403 → forbidden (không có quyền)
// 404 → not found (resource không tồn tại)
// 409 → conflict (email đã tồn tại, v.v.)
// 422 → unprocessable entity (validation error)
// 429 → too many requests (rate limit)
// 500 → server error (không expose details trong production)
// 503 → service unavailable (maintenance mode)
```

**Red flags trong error responses:**
- Trả về stack trace trong production: `res.json({ error: err.stack })` ❌
- Leak DB error messages: `res.json({ error: err.message })` (có thể chứa SQL) ❌
- Inconsistent error format (không theo `{ success, error: { code, message } }`) ❌

### Bước 7 — Review rate limiting

Kiểm tra các endpoint nhạy cảm có rate limit:

```typescript
// Auth endpoints (bắt buộc):
POST /auth/login            → 5 attempts / 15 phút / IP
POST /auth/register         → 3 attempts / 60 phút / IP
POST /auth/forgot-password  → 3 attempts / 60 phút / IP

// API endpoints (khuyến nghị):
POST /readings/*            → 30 requests / 15 phút / user
POST /credits/create-order  → 5 requests / 60 phút / user

// Admin endpoints:
// Ít strict hơn nhưng nên có global rate limit
```

Kiểm tra trong `src/middleware/rateLimit.ts` và trong route files.

### Bước 8 — Review authentication edge cases

```typescript
// Kiểm tra verifyToken middleware:
// 1. Cookie access_token không tồn tại → 401 NO_TOKEN
// 2. Token format sai → 401 TOKEN_EXPIRED (hoặc TOKEN_INVALID)
// 3. Token đúng nhưng user.is_active = 0 → 401 USER_INACTIVE
// 4. Token expired → 401 TOKEN_EXPIRED
// 5. User bị xoá sau khi issue token → 401 USER_INACTIVE

// Kiểm tra requireCredits middleware:
// 1. credits_balance = 0 → 402 NO_CREDITS
// 2. credits_balance > 0 nhưng credits_expires_at < NOW() → 402 CREDITS_FROZEN
// 3. credits_balance > 0 và expires_at > NOW() → pass

// Kiểm tra optionalToken (guest endpoints):
// 1. Không có token → req.user = undefined, vẫn next()
// 2. Token hợp lệ → req.user = User object
// 3. Token hết hạn → req.user = undefined, vẫn next() (không throw)
```

### Bước 9 — Tổng hợp findings

Sau khi review xong, liệt kê:

**Critical Issues (phải sửa ngay):**
- SQL injection vulnerabilities
- Authentication bypass
- Sensitive data leakage (password_hash, api_key_enc in response)
- Missing auth middleware trên protected endpoint

**High Issues (nên sửa trước release):**
- Missing rate limiting on auth endpoints
- Validation không đủ (thiếu length check, type check)
- Wrong HTTP status codes
- Missing try/catch

**Medium Issues (tech debt):**
- Inconsistent error format
- Logging thiếu hoặc thừa
- TypeScript `any` types
- Missing input sanitization

**Low Issues (nice to fix):**
- Response có thể tối ưu thêm
- Validation message không rõ ràng

## Convention & Rules

### Security hierarchy (từ cao đến thấp)
1. **Authentication** — verifyToken phải là middleware đầu tiên sau rate limit
2. **Authorization** — requireRole sau verifyToken, requireCredits sau verifyToken
3. **Input Validation** — validate() sau auth checks
4. **Business Logic** — controller xử lý sau khi đã pass tất cả guards
5. **Output Sanitization** — không trả về sensitive fields

### Fields tuyệt đối không trả về client
| Field | Table | Lý do |
|---|---|---|
| `password_hash` | users | Bcrypt hash — không cần |
| `api_key_enc` | ai_models | Encrypted API key |
| `token_hash` | refresh_tokens | SHA-256 hash của token |
| `api_key_enc` | bất kỳ | Mọi encrypted secret |

### Parameterized query checklist
- Mọi `WHERE col = value` → phải dùng `?`
- Mọi `VALUES (...)` insert → phải dùng `?`
- Dynamic column names (ORDER BY, GROUP BY) → whitelist trước
- Không có template literal trong SQL string (trừ whitelist)

### Response format validation
Mọi response phải theo đúng format:
```typescript
// Success:
{ success: true, data: T, message?: string }
// Error:
{ success: false, error: { code: string, message: string, details?: unknown } }
```
Không có format nào khác.

## Checklist review đầy đủ

### Auth & Authorization
- [ ] Endpoint protected cần auth có `verifyToken` middleware
- [ ] Admin endpoints có `requireRole('admin')` sau `verifyToken`
- [ ] Credit-required endpoints có `requireCredits` sau `verifyToken`
- [ ] Guest endpoints dùng `optionalToken` (không block non-auth users)
- [ ] Middleware chain đúng thứ tự

### Input Validation
- [ ] Tất cả request body fields đều có validator rules
- [ ] Path params (`:id`) được validate là integer dương
- [ ] Query params có optional() và type check
- [ ] String inputs có `.trim()` và length limits
- [ ] Date inputs dùng `.isISO8601()`
- [ ] Enum inputs dùng `.isIn(['val1', 'val2'])`
- [ ] Rate limiting áp dụng cho sensitive endpoints

### SQL Security
- [ ] Tất cả queries dùng parameterized placeholders `?`
- [ ] Không có string interpolation trong SQL
- [ ] Dynamic ORDER BY/GROUP BY được whitelist
- [ ] Transactions dùng cho multi-step DB operations

### Response Security
- [ ] `password_hash` không xuất hiện trong response
- [ ] `api_key_enc` không xuất hiện trong response
- [ ] `token_hash` không xuất hiện trong response
- [ ] Không có internal error details trong production response
- [ ] HTTP status codes đúng với từng tình huống

### Error Handling
- [ ] Controller có try/catch bao toàn bộ
- [ ] Errors được log với `logger.error()` (không `console.log`)
- [ ] `next(error)` được gọi cho unexpected errors
- [ ] Không trả về stack trace trong production
- [ ] Error messages bằng tiếng Việt, thân thiện với user

### Logic Correctness
- [ ] Credit deduction chỉ xảy ra sau khi AI call thành công
- [ ] `credit_usage_log` được ghi đồng thời với credit deduction
- [ ] `readings` record được lưu với đúng `is_free`, `credits_used`, `ai_model_id`
- [ ] Xem lại history KHÔNG trigger credit deduction
