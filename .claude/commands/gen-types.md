# gen-types

## Mục đích
Generate hoặc cập nhật TypeScript types từ ba nguồn: DB table schema → model interface, API response → frontend-facing type, AI response JSON → parsed interface. Cập nhật file types/*.ts phù hợp và augment express.d.ts nếu cần.

## Cách dùng
`/gen-types <source> <target>`

Sources:
- `db:<table_name>` — từ DB schema → model interface
- `api:<endpoint>` — từ API response shape → frontend type
- `ai:<module>` — từ AI JSON response → parsed type

Ví dụ:
- `/gen-types db:credit_orders` — generate interface từ credit_orders table
- `/gen-types api:GET /credits/balance` — generate type từ API response
- `/gen-types ai:career` — generate type từ AI response cho career module
- `/gen-types db:users --update-express` — generate và augment express.d.ts

## Các bước thực hiện

### Bước 1 — Xác định nguồn và target file

**Nguồn `db:<table>`:**
- Đọc schema từ `migrations/` (tìm file tạo table này)
- Hoặc từ WORKFLOW.md section 3
- Target: `src/types/<module>.types.ts`

**Nguồn `api:<endpoint>`:**
- Đọc controller để xem `res.json({ success: true, data: {...} })`
- Đọc service để xem return type
- Target: `src/types/<module>.types.ts` (backend) hoặc comment để frontend copy

**Nguồn `ai:<module>`:**
- Đọc `ai_prompts.user_template` trong DB (hoặc migration seed)
- Xem JSON schema trong prompt template
- Target: `src/types/reading.types.ts`

### Bước 2 — Generate từ DB schema

Từ SQL CREATE TABLE → TypeScript interface:

**Mapping rules (MySQL → TypeScript):**

| MySQL Type | TypeScript Type | Ghi chú |
|---|---|---|
| `BIGINT UNSIGNED` | `number` | ID fields |
| `INT UNSIGNED` | `number` | |
| `INT` | `number` | |
| `TINYINT(1)` | `boolean` | Khi là flag (is_active, is_verified) |
| `TINYINT` | `number` | Khi là số thực sự |
| `VARCHAR(n)` | `string` | |
| `TEXT`, `LONGTEXT` | `string` | |
| `DECIMAL(12,2)` | `number` | Dùng `Number()` khi đọc từ DB |
| `FLOAT`, `DOUBLE` | `number` | |
| `DATETIME` | `string \| Date` | Thường là `string` khi serialize |
| `JSON` | `Record<string, unknown>` hoặc interface cụ thể | |
| `ENUM('a','b')` | `'a' \| 'b'` | Union type |
| `NULL`-able column | `type \| null` | |

**Ví dụ — Generate từ credit_orders:**

SQL:
```sql
CREATE TABLE credit_orders (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id               BIGINT UNSIGNED NOT NULL,
  package_id            BIGINT UNSIGNED,              -- nullable
  credits               INT UNSIGNED NOT NULL,
  amount                DECIMAL(12,2) NOT NULL,
  topup_code            VARCHAR(100) UNIQUE,
  web2m_transaction_id  VARCHAR(200),                 -- nullable
  status                ENUM('pending','paid','failed','expired') DEFAULT 'pending',
  retry_count           TINYINT DEFAULT 0,
  qr_expires_at         DATETIME,                     -- nullable
  paid_at               DATETIME,                     -- nullable
  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)
```

Generated TypeScript:
```typescript
// src/types/credit.types.ts

export type CreditOrderStatus = 'pending' | 'paid' | 'failed' | 'expired'

/** Đại diện cho 1 row trong bảng credit_orders */
export interface CreditOrder {
  id:                   number
  user_id:              number
  package_id:           number | null        // nullable BIGINT → null
  credits:              number
  amount:               number               // DECIMAL → number
  topup_code:           string | null        // UNIQUE nhưng có thể null
  web2m_transaction_id: string | null
  status:               CreditOrderStatus
  retry_count:          number
  qr_expires_at:        string | null        // DATETIME nullable → string | null
  paid_at:              string | null
  created_at:           string               // DATETIME NOT NULL → string
  updated_at:           string
}

/** DTO để tạo credit_order mới (omit auto-generated fields) */
export interface CreateCreditOrderDto {
  user_id:       number
  package_id?:   number
  credits:       number
  amount:        number
  topup_code:    string
  status?:       CreditOrderStatus  // default 'pending'
  qr_expires_at: Date | string
}

/** DTO để update (partial, tất cả optional) */
export interface UpdateCreditOrderDto {
  status?:               CreditOrderStatus
  web2m_transaction_id?: string
  retry_count?:          number
  paid_at?:              Date | string
}
```

### Bước 3 — Generate từ API response

Từ controller response → frontend-facing type:

**Ví dụ — GET /credits/balance:**

Controller:
```typescript
res.json({
  success: true,
  data: {
    credits_balance:   user.credits_balance,    // number
    credits_expires_at: user.credits_expires_at, // string | null
    credits_status:    status,                  // 'active' | 'frozen' | 'empty'
    days_remaining:    daysLeft,                // number | null
  }
})
```

Generated TypeScript:
```typescript
// Thêm vào src/types/credit.types.ts:

export type CreditsStatus = 'active' | 'frozen' | 'empty'

/** Response của GET /credits/balance */
export interface CreditsBalanceResponse {
  credits_balance:    number
  credits_expires_at: string | null
  credits_status:     CreditsStatus
  days_remaining:     number | null
}

/** Response của POST /credits/create-order */
export interface CreateOrderResponse {
  order_id:        number
  package: {
    name:    string
    credits: number
  }
  topup_code:      string
  amount:          number
  qr_image_base64: string           // "data:image/png;base64,..."
  qr_expires_at:   string           // ISO 8601
  bank_info: {
    bank_name:      string
    account_number: string
    account_holder: string
    memo:           string
  }
}

/** Response của GET /credits/check-order/:id */
export interface CheckOrderResponse {
  order_id:           number
  status:             CreditOrderStatus
  credits_added?:     number         // chỉ có khi status = 'paid'
  new_balance?:       number         // chỉ có khi status = 'paid'
  credits_expires_at?: string | null // chỉ có khi status = 'paid'
}
```

### Bước 4 — Generate từ AI response JSON

Từ prompt template JSON schema → TypeScript interface:

**Ví dụ — Career module AI response:**

Prompt template yêu cầu:
```json
{
  "summary": "string",
  "sections": {
    "overview": { "visible": true, "content": { "title": "...", "description": "..." } },
    "strengths": { "visible": true, "content": { "title": "...", "items": ["..."] } },
    "challenges": { "visible": true, "content": { "title": "...", "items": ["..."] } },
    "advice": { "visible": true, "content": { "title": "...", "description": "..." } }
  },
  "lucky_numbers": [1, 5, 8],
  "lucky_colors": ["red", "gold"],
  "recommendations": ["rec1", "rec2"]
}
```

Generated TypeScript:
```typescript
// src/types/reading.types.ts

// ─── Generic section types ────────────────────────────────────────

interface TextSection {
  visible: boolean
  locked?: boolean
  required_plan?: 'free' | 'paid'
  teaser?: string
  content?: {
    title:       string
    description: string
  }
}

interface ListSection {
  visible: boolean
  locked?: boolean
  required_plan?: 'free' | 'paid'
  teaser?: string
  content?: {
    title: string
    items: string[]
  }
}

// ─── Career module ────────────────────────────────────────────────

export interface CareerReadingResult {
  summary:          string
  sections: {
    overview:   TextSection
    strengths:  ListSection
    challenges: ListSection
    advice:     TextSection
  }
  lucky_numbers?:    number[]
  lucky_colors?:     string[]
  recommendations?:  string[]
}

export interface CareerReadingRequest {
  full_name:    string
  birth_date:   string   // "YYYY-MM-DD"
  // Fields đặc thù của module nếu có:
  // career_field?: string
}

export interface CareerReading {
  reading_id:        number
  module:            'career'
  tier:              'free' | 'paid'
  result:            CareerReadingResult
  credits_used:      number
  credits_remaining: number
}
```

### Bước 5 — Cập nhật ReadingModule union type

Mỗi khi thêm module mới, cập nhật:

```typescript
// src/types/reading.types.ts

export type ReadingModule =
  | 'numerology'
  | 'love'
  | 'finance'
  | 'sim'
  | 'fengshui_home'
  | 'horoscope'
  | 'career'      // ← thêm module mới
  | 'health'      // ← thêm module mới

// Map module → result type:
export type ReadingResultByModule = {
  numerology:    NumerologyReadingResult
  love:          LoveReadingResult
  finance:       FinanceReadingResult
  sim:           SimReadingResult
  fengshui_home: FengshuiHomeReadingResult
  horoscope:     HoroscopeReadingResult
  career:        CareerReadingResult  // ← thêm
}
```

### Bước 6 — Augment express.d.ts (nếu --update-express)

Nếu có field mới cần gắn vào `req.*`:

```typescript
// src/types/express.d.ts
import { User } from './user.types'

declare global {
  namespace Express {
    interface Request {
      user?:       User           // gắn bởi verifyToken middleware
      sessionId?:  string         // gắn bởi session middleware (guest tracking)
      // Thêm field mới nếu cần:
      requestId?:  string         // gắn bởi requestId middleware
      deviceId?:   string         // gắn bởi device middleware
    }
  }
}

export {}  // Phải có để file được coi là module
```

### Bước 7 — Generate standard wrapper types

Luôn đảm bảo các generic response types tồn tại:

```typescript
// src/types/api.types.ts

/** Standard API response wrapper */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?:   T
  message?: string
  error?: {
    code:     string
    message:  string
    details?: unknown
  }
}

/** Paginated list response */
export interface PaginatedResponse<T> {
  items:      T[]
  total:      number
  page:       number
  limit:      number
  totalPages: number
}

/** Paginated API response */
export type PaginatedApiResponse<T> = ApiResponse<PaginatedResponse<T>>
```

### Bước 8 — Kiểm tra không có `any`

Sau khi generate, scan toàn bộ types file:

```typescript
// Thay thế any bằng unknown hoặc type cụ thể:
// SAI:
input_data: any
result_data: any

// ĐÚNG:
input_data: Record<string, unknown>
result_data: string  // JSON string lưu trong DB

// Hoặc nếu cần typed:
input_data: NumerologyReadingRequest | LoveReadingRequest | ...
```

## Convention & Rules

### File naming
- `src/types/user.types.ts` — User, UserRole, CreateUserDto, UpdateUserDto
- `src/types/reading.types.ts` — Reading, ReadingModule, result interfaces per module
- `src/types/credit.types.ts` — CreditOrder, CreditPackage, CreditsStatus, DTOs
- `src/types/ai.types.ts` — AiModel, AiPrompt, AICallOptions, AIResult
- `src/types/api.types.ts` — ApiResponse, PaginatedResponse (generic wrappers)
- `src/types/web2m.types.ts` — IWeb2MTransaction, TypeTransaction enum
- `src/types/express.d.ts` — Express.Request augmentation ONLY

### Naming conventions
| Item | Convention | Ví dụ |
|---|---|---|
| Interface | PascalCase | `CreditOrder`, `UserProfile` |
| DTO (input) | PascalCase + Dto suffix | `CreateCreditOrderDto` |
| Enum type | PascalCase | `CreditOrderStatus` |
| Union type | PascalCase | `ReadingModule`, `UserRole` |
| Enum (string) | Union type preferred | `'active' \| 'frozen' \| 'empty'` |
| Response type | PascalCase + Response suffix | `CreditsBalanceResponse` |

### Khi nào dùng `interface` vs `type`
- `interface` → cho objects có thể extend, model entities, DTOs
- `type` → cho union types, aliases, computed types
- `enum` → tránh dùng TypeScript enum; dùng `const` object hoặc union type thay

### Nullable conventions
```typescript
// ĐÚNG — rõ ràng khi nào null:
credits_expires_at: string | null  // nullable DATETIME
package_id: number | null          // nullable FK

// SAI — optional và nullable là khác nhau:
credits_expires_at?: string        // optional (có thể undefined)
package_id?: number                // sẽ không compile đúng khi DB trả null
```

### Date handling
```typescript
// Trong DB model (raw từ mysql2):
created_at: Date | string  // mysql2 có thể trả Date object

// Trong API response (sau serialize):
created_at: string  // toISOString() hoặc .toLocaleString()

// Trong DTO (input từ client):
birth_date: string  // "YYYY-MM-DD" format, validate bằng isISO8601()
expires_at: Date | string  // khi tạo trong service dùng Date object
```

## Checklist sau khi hoàn thành

- [ ] Tất cả columns từ DB schema đều có trong interface (không bỏ sót)
- [ ] Kiểu nullable (`string | null`) đúng với DB schema (NOT NULL vs nullable)
- [ ] `TINYINT(1)` flag fields được type là `boolean`, không phải `number`
- [ ] `DECIMAL` fields được type là `number` (với note về precision)
- [ ] `ENUM` được convert sang TypeScript union type
- [ ] DTO types (Create, Update) được tạo riêng, không dùng chung với DB interface
- [ ] `ReadingModule` union type được cập nhật nếu thêm module mới
- [ ] `express.d.ts` được augment nếu có field mới gắn vào `req.*`
- [ ] Không có `any` type — dùng `unknown` hoặc interface cụ thể
- [ ] `ApiResponse<T>` và `PaginatedResponse<T>` tồn tại trong `api.types.ts`
- [ ] TypeScript không báo lỗi: `tsc --noEmit` pass clean
- [ ] Import paths dùng `@/types/...` (không phải relative path)
