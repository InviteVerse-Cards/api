# InviteVerse — API Backend

Express.js + TypeScript backend. Đọc file này trước khi viết bất kỳ code nào.

> **Skills đang active cho session này:** Xem root CLAUDE.md để biết cách nạp skill.

---

## Stack & Tools

- **Runtime**: Node.js 20, TypeScript strict, tsx (dev), tsc (build → dist/)
- **Framework**: Express.js 4
- **Database**: MySQL 8 via `mysql2/promise` — **raw SQL, không dùng ORM**
- **Auth**: JWT cookie-based (httpOnly, sameSite: strict)
- **Payment**: Web2m — webhook-based (KHÔNG polling)
- **Storage**: Cloudinary (images)
- **AI**: Anthropic Claude API (claude-sonnet-4-6 / claude-haiku-4-5)
- **Logger**: Winston (`src/utils/logger.ts`)
- **Validation**: Zod hoặc express-validator
- **Path alias**: `@/` → `src/`

---

## Cấu trúc thư mục

```
src/
  config/          # database.ts, cloudinary.ts, claude.ts, env.ts
  middleware/      # auth.middleware.ts, rateLimit.ts, validate.ts, upload.ts, errorHandler.ts
  modules/
    auth/          # auth.routes.ts, auth.controller.ts, auth.service.ts, auth.schema.ts
    templates/     # templates.routes.ts, .controller.ts, .service.ts, .repository.ts
    invitations/   # invitations.routes.ts, .controller.ts, .service.ts, sections.service.ts
    uploads/       # uploads.routes.ts, .controller.ts, .service.ts
    ai/            # ai.routes.ts, .controller.ts, .service.ts, prompts/
    payments/      # payments.routes.ts, .controller.ts, .service.ts, web2m.service.ts
    credits/       # credits.service.ts, credits.repository.ts
    public/        # public.routes.ts, .controller.ts, .service.ts
  shared/
    types/         # common.types.ts, express.d.ts
    utils/         # slugify.ts, qrcode.ts, pagination.ts, crypto.ts
    errors/        # AppError.ts, ValidationError.ts
  migrations/      # 001_create_users.sql, 002_create_templates.sql, ...
  app.ts           # Express setup, mount routes
server.ts          # entry point
```

---

## Quy tắc bắt buộc khi viết code

### 1. Response Format — LUÔN dùng helper

```typescript
// src/shared/utils/response.ts
import { success, fail } from "@/utils/response";

// Thành công
return res.json(success(data, "Thông báo tùy chọn"));

// Lỗi — dùng next(err)
return next(new AppError("CREDIT_INSUFFICIENT", "Không đủ credits", 402));
```

Format chuẩn:

```json
{ "success": true, "data": {}, "message": "..." }
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```

### 2. Database — raw SQL với mysql2

```typescript
import pool from "@/config/database";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

// SELECT
const [rows] = await pool.query<RowDataPacket[]>(
  "SELECT * FROM invitations WHERE user_id = ? AND deleted_at IS NULL",
  [userId],
);

// INSERT
const [result] = await pool.query<ResultSetHeader>(
  "INSERT INTO invitations (uuid, user_id, slug, title, category) VALUES (UUID(), ?, ?, ?, ?)",
  [userId, slug, title, category],
);
return result.insertId;
```

**KHÔNG dùng string concat SQL. LUÔN dùng `?` placeholder.**

### 3. Middleware chain chuẩn

```typescript
router.post(
  "/invitations",
  authLimiter, // rate limiter
  verifyToken, // JWT → req.user
  validate(schema), // Zod/express-validator
  InvitationController.create,
);

router.post(
  "/ai/generate-text",
  aiLimiter,
  verifyToken,
  requireCredits(1), // kiểm tra đủ credit
  validate(schema),
  AIController.generateText,
);
```

### 4. Trừ credits — CHỈ trừ SAU KHI thành công

```typescript
// ĐÚNG — trong AI controller
const result = await AIService.generateText(context);
// AI xong mới trừ
await CreditsService.deduct(userId, 1, "spend_ai", generationId);
return res.json(success({ ...result, credits_remaining: newBalance }));

// SAI — đừng trừ trước khi AI call xong
```

### 5. Auth — JWT cookie-based

```typescript
// Set cookie khi login
res.cookie("access_token", accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 24 * 60 * 60 * 1000, // 24h
});

// verifyToken middleware đọc từ cookie hoặc Bearer header
const token =
  req.cookies.access_token || req.headers.authorization?.split(" ")[1];
```

### 6. Error handling — try/catch + next

```typescript
export const myController = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const data = await MyService.doSomething();
    return res.json(success(data));
  } catch (err) {
    next(err);
  }
};
```

### 7. Owner check — luôn verify ownership

```typescript
const invitation = await InvitationRepository.findByUuid(uuid);
if (!invitation)
  return next(new AppError("NOT_FOUND", "Không tìm thấy thiệp", 404));
if (invitation.user_id !== req.user!.id) {
  return next(new AppError("FORBIDDEN", "Không có quyền", 403));
}
```

### 8. TypeScript — không dùng `any`

```typescript
// ĐÚNG
const user = req.user!           // đã augment express.d.ts
const rows = result as InvRow[]

// SAI
const data: any = ...
function foo(x: any) { ... }
```

---

## Database Schema tóm tắt (InviteVerse)

| Bảng                  | Cột quan trọng                                                                          |
| --------------------- | --------------------------------------------------------------------------------------- |
| `users`               | `uuid`, `email`, `plan ENUM('free','pro')`, `is_verified`                               |
| `credits`             | `user_id`, `balance INT`, `total_earned`, `total_spent`                                 |
| `credit_transactions` | `user_id`, `amount INT`, `type ENUM(...)`, `reference_id`                               |
| `templates`           | `uuid`, `category_id`, `slug`, `plan_required`, `default_config JSON`                   |
| `template_categories` | `slug`, `name`                                                                          |
| `invitations`         | `uuid`, `user_id`, `slug`, `status ENUM(draft,published,archived)`, `theme_config JSON` |
| `invitation_sections` | `invitation_id`, `section_type`, `sort_order`, `is_enabled`, `config JSON`              |
| `uploads`             | `uuid`, `user_id`, `cloudinary_id`, `url`, `purpose`                                    |
| `ai_generations`      | `user_id`, `invitation_id`, `type`, `credits_used`, `status`                            |
| `payments`            | `uuid`, `user_id`, `provider_tx_id`, `amount_vnd`, `credits_granted`, `status`          |
| `guests`              | `invitation_id`, `name`, `rsvp_status`                                                  |

---

## Khi viết tính năng mới

Chỉ cần mô tả bằng ngôn ngữ tự nhiên, Claude sẽ tự theo convention trên.

Ví dụ:

- "Viết API tạo thiệp mới từ template" → route + controller + service + validation
- "Thêm endpoint publish thiệp → sinh QR code" → flow đầy đủ theo SK-API-07
- "Fix bug webhook web2m không match" → check SK-API-05

---

## Slash Commands

- `/scaffold-module <name>` — tạo đầy đủ routes + controller + service + repository
- `/scaffold-migration <name>` — tạo file migration SQL mới
- `/add-api <method> <path>` — thêm endpoint với full boilerplate
- `/review-security` — security review endpoint hiện tại
- `/debug-payment` — debug flow web2m payment
- `/debug-ai` — debug AI generation flow
- `/gen-types` — generate TypeScript types từ DB schema

---

## @imports Skill Files

@.claude/skills/SK-API-01_architecture.md
@.claude/skills/SK-API-02_database.md
@.claude/skills/SK-API-03_auth_security.md
@.claude/skills/SK-API-04_ai_integration.md
@.claude/skills/SK-API-05_payment_credits.md
@.claude/skills/SK-API-06_uploads.md
@.claude/skills/SK-API-07_invitations.md

---

## Biến môi trường

```env
NODE_ENV, PORT
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
JWT_SECRET, JWT_EXPIRES_IN=86400
CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
ANTHROPIC_API_KEY
WEB2M_SECRET
FRONTEND_URL
```

## Scripts

```bash
npm run dev        # tsx watch
npm run build      # tsc → dist/
npm run typecheck  # tsc --noEmit
npm run lint       # eslint src
```
