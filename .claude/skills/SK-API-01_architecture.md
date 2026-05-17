# [SK-API-01] Architecture & Module Structure

> Trigger: Mọi task viết code API đều áp dụng skill này.

---

## Module Structure (bắt buộc)

Mỗi module follow pattern: **routes → controller → service → repository**

```
modules/<name>/
  <name>.routes.ts       # Khai báo endpoints + middleware chain
  <name>.controller.ts   # Nhận request, gọi service, trả response
  <name>.service.ts      # Business logic, không biết về req/res
  <name>.repository.ts   # Chỉ có DB queries (nếu phức tạp), optional
  <name>.schema.ts       # Zod validation schemas
```

**Khi nào tách repository:** Khi service có >3 DB queries, tách ra repository để service chỉ gọi repository functions.

---

## Route File Convention

```typescript
// modules/invitations/invitations.routes.ts
import { Router } from "express";
import { verifyToken } from "@/middleware/auth.middleware";
import { validate } from "@/middleware/validate.middleware";
import { apiLimiter } from "@/middleware/rateLimit.middleware";
import { InvitationController } from "./invitations.controller";
import {
  createInvitationSchema,
  updateInvitationSchema,
} from "./invitations.schema";

const router = Router();

router.get("/", verifyToken, InvitationController.list);
router.post(
  "/",
  verifyToken,
  apiLimiter,
  validate(createInvitationSchema),
  InvitationController.create,
);
router.get("/:uuid", verifyToken, InvitationController.getOne);
router.put(
  "/:uuid",
  verifyToken,
  validate(updateInvitationSchema),
  InvitationController.update,
);
router.delete("/:uuid", verifyToken, InvitationController.remove);
router.post("/:uuid/publish", verifyToken, InvitationController.publish);

export default router;
```

---

## Controller Convention

```typescript
// modules/invitations/invitations.controller.ts
import type { Request, Response, NextFunction } from "express";
import { success } from "@/utils/response";
import { AppError } from "@/shared/errors/AppError";
import { InvitationService } from "./invitations.service";

export const InvitationController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const data = await InvitationService.listByUser(req.user!.id, {
        page: Number(page),
        limit: Number(limit),
        status: status as string | undefined,
      });
      return res.json(success(data));
    } catch (err) {
      next(err);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invitation = await InvitationService.create(req.user!.id, req.body);
      return res.status(201).json(success(invitation, "Tạo thiệp thành công"));
    } catch (err) {
      next(err);
    }
  },
};
```

**Controller rules:**

- KHÔNG có business logic trong controller
- KHÔNG có SQL queries trong controller
- LUÔN dùng `try/catch + next(err)`
- LUÔN return sau mỗi response

---

## Service Convention

```typescript
// modules/invitations/invitations.service.ts
import { AppError } from "@/shared/errors/AppError";
import { InvitationRepository } from "./invitations.repository";
import { slugify } from "@/shared/utils/slugify";

export const InvitationService = {
  async listByUser(
    userId: number,
    opts: { page: number; limit: number; status?: string },
  ) {
    const { page, limit, status } = opts;
    const offset = (page - 1) * limit;
    return InvitationRepository.findByUser(userId, { limit, offset, status });
  },

  async create(userId: number, body: CreateInvitationDto) {
    // Kiểm tra free plan limit
    const count = await InvitationRepository.countByUser(userId);
    const user = await UserRepository.findById(userId);
    if (user.plan === "free" && count >= 3) {
      throw new AppError(
        "PLAN_LIMIT",
        "Free plan chỉ cho tạo tối đa 3 thiệp",
        403,
      );
    }

    const slug = await generateUniqueSlug(body.title);
    return InvitationRepository.create({ ...body, userId, slug });
  },
};
```

**Service rules:**

- Chứa business logic
- Không biết về `req`, `res`, `next`
- Throw `AppError` khi lỗi business
- Gọi các repository/service khác

---

## Response Helper (src/shared/utils/response.ts)

```typescript
export function success<T>(data: T, message?: string) {
  return { success: true, data, ...(message && { message }) };
}

export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
) {
  return {
    success: true,
    data: {
      items,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    },
  };
}
```

---

## AppError (src/shared/errors/AppError.ts)

```typescript
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// Error codes chuẩn:
// NOT_FOUND (404), FORBIDDEN (403), UNAUTHORIZED (401)
// PLAN_LIMIT (403), CREDIT_INSUFFICIENT (402)
// VALIDATION_ERROR (400), INTERNAL_ERROR (500)
```

---

## Error Handler Middleware

```typescript
// middleware/errorHandler.middleware.ts
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  logger.error(err);
  return res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Lỗi hệ thống, thử lại sau" },
  });
}
```

---

## app.ts Mount Order

```typescript
// app.ts
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/templates", templateRoutes);
app.use("/api/v1/invitations", invitationRoutes);
app.use("/api/v1/uploads", uploadRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/credits", creditRoutes);
app.use("/api/v1/public", publicRoutes); // NO AUTH — luôn đặt sau cùng
app.use(errorHandler); // LUÔN đặt cuối cùng
```

---

## Naming Conventions

| Loại                | Convention  | Ví dụ                         |
| ------------------- | ----------- | ----------------------------- |
| File module         | kebab-case  | `invitations.service.ts`      |
| Class/Object export | PascalCase  | `InvitationService`           |
| Function            | camelCase   | `createInvitation`            |
| DB column           | snake_case  | `user_id`, `created_at`       |
| API route           | kebab-case  | `/api/v1/template-categories` |
| Env var             | UPPER_SNAKE | `JWT_SECRET`                  |
