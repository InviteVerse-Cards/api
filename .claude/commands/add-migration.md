# add-migration

## Mục đích
Tạo một SQL migration file mới theo đúng naming convention và column conventions của project. Migration bao gồm CREATE TABLE và seed data nếu cần.

## Cách dùng
`/add-migration <description> [--seed]`

Ví dụ:
- `/add-migration create_career_readings`
- `/add-migration create_notification_settings --seed`
- `/add-migration add_phone_index_to_users`

## Các bước thực hiện

### Bước 1 — Xác định số thứ tự migration

Kiểm tra thư mục `migrations/` để lấy số thứ tự tiếp theo:

```bash
# Liệt kê tất cả migration files đã có:
ls migrations/
```

Các migration hiện tại trong project:
```
```

### Bước 2 — Phân tích yêu cầu table

Xác định:
1. Mục đích của table là gì?
2. Có cần liên kết (FOREIGN KEY) với bảng nào?
3. Có cần soft delete (`is_active`)? — Thường YES với các entity chính
4. Cần index gì cho performance?
5. Cần seed data không (`--seed`)? — Thường cần cho `credit_packages`, `site_settings`, `ai_prompts`

### Bước 3 — Tạo migration file

Tạo file `migrations/NNN_<description>.ts`:

```sql
-- Migration: NNN_<description>.ts
-- Created: YYYY-MM-DD
-- Description: <Mô tả ngắn bằng tiếng Việt>

-- ─── CREATE TABLE ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS <table_name> (
  -- Primary key:
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  -- Foreign keys (nếu có):
  user_id           BIGINT UNSIGNED NOT NULL,
  -- hoặc nullable:
  user_id           BIGINT UNSIGNED,

  -- Các columns theo đúng convention:
  name              VARCHAR(100) NOT NULL,
  description       VARCHAR(255),
  status            ENUM('pending','active','inactive') NOT NULL DEFAULT 'pending',
  amount            DECIMAL(12,2) NOT NULL,
  credits           INT UNSIGNED NOT NULL DEFAULT 0,
  is_active         TINYINT(1) NOT NULL DEFAULT 1,   -- soft delete
  sort_order        INT DEFAULT 0,                    -- sắp xếp hiển thị
  metadata          JSON,                             -- dữ liệu linh hoạt

  -- Timestamps (BẮT BUỘC cho hầu hết tables):
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign key constraints:
  CONSTRAINT fk_<table>_user FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,    -- hoặc ON DELETE SET NULL nếu nullable
    -- ON DELETE RESTRICT  -- nếu không muốn xoá cascade

  -- Indexes:
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  UNIQUE KEY uq_<field> (<field>)
);
```

### Bước 4 — Thêm seed data (nếu --seed hoặc cần thiết)

```sql
-- ─── SEED DATA ───────────────────────────────────────────────────────────────

INSERT INTO <table_name> (col1, col2, col3, created_at) VALUES
  ('value1', 'value2', 'value3', NOW()),
  ('value4', 'value5', 'value6', NOW());
```

**Seed data mẫu cho các table cụ thể:**

```

Cho `site_settings`:
```sql
INSERT INTO site_settings (`key`, `value`, `type`, `description`) VALUES
  ('setting_key', 'default_value', 'number', 'Mô tả setting này dùng để làm gì');
```

### Bước 5 — Review migration

Tự review lại các điểm sau trước khi lưu file:

1. Kiểm tra table name: lowercase, snake_case, plural
2. Kiểm tra PRIMARY KEY: `BIGINT UNSIGNED AUTO_INCREMENT`
3. Kiểm tra FOREIGN KEYs có tên constraint (`CONSTRAINT fk_...`)
4. Kiểm tra ON DELETE action phù hợp
5. Kiểm tra indexes có cho các columns thường dùng trong WHERE
6. Kiểm tra timestamps: `created_at DEFAULT CURRENT_TIMESTAMP`, `updated_at ... ON UPDATE`
7. Kiểm tra dùng `IF NOT EXISTS` để idempotent

## Convention & Rules

### Column naming (BẮT BUỘC)
- snake_case cho tất cả column names
- Boolean flags: `is_*` prefix → `is_active`, `is_verified`, `is_free`, `is_default`
- Timestamps: `created_at`, `updated_at`, `deleted_at`, `paid_at`, `expires_at`
- Foreign keys: `<referenced_table_singular>_id` → `user_id`, `package_id`, `model_id`
- Status/type enums: inline ENUM → `ENUM('value1','value2')`
- Money: `DECIMAL(12,2)` (hỗ trợ đến 9,999,999,999.99 VND)
- Credits: `INT UNSIGNED`
- IDs: `BIGINT UNSIGNED`
- IP address: `VARCHAR(45)` (hỗ trợ cả IPv6)
- Email: `VARCHAR(150)`
- URL/hash: `VARCHAR(255)` hoặc `TEXT`
- Long content (AI prompts, descriptions): `LONGTEXT`
- Structured data: `JSON`

### File naming convention (BẮT BUỘC)
```
NNN_<action>_<target>.sql
```
- `NNN`: 3 chữ số, zero-padded (001, 010, 099, 100)
- `<action>`: create, add, drop, alter, rename
- `<target>`: table name hoặc mô tả ngắn (snake_case)

Ví dụ hợp lệ:
```
011_create_career_readings.sql
012_add_refresh_token_index.sql
013_alter_users_add_phone_verified.sql
```

### ON DELETE strategy
| Relationship | ON DELETE |
|---|---|
| User xoá → xoá readings của họ | CASCADE |
| User xoá → order vẫn giữ (audit) | SET NULL |
| Package xoá → orders vẫn giữ | SET NULL |
| Token xoá → cascade xoá refresh tokens | CASCADE |
| Không muốn cho xoá parent nếu có con | RESTRICT |

### UNIQUE vs INDEX
- `UNIQUE KEY`: email, phone, topup_code, token_hash — dữ liệu phải unique
- `INDEX`: các column dùng trong WHERE thường xuyên (user_id, status, created_at)
- Composite index: `INDEX idx_user_module (user_id, module)` khi query kết hợp nhiều column
- Tên index: `idx_<columns>` → `idx_user_id`, `idx_user_status`, `idx_ip_date`
- Tên unique: `uq_<columns>` → `uq_email`, `uq_module_tier_version`

### Idempotent migrations
- Luôn dùng `CREATE TABLE IF NOT EXISTS`
- Với ALTER TABLE: check column tồn tại trước khi add (dùng stored procedure hoặc comment)
- Seed INSERT: dùng `INSERT IGNORE` hoặc `INSERT ... ON DUPLICATE KEY UPDATE`

### Encoding & Collation
- Không cần khai báo nếu database đã set default: `utf8mb4` + `utf8mb4_unicode_ci`
- Chỉ override nếu cần: `name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`

## Template đầy đủ

```sql
-- Migration: 0NN_create_<table_name>.ts
-- Created: YYYY-MM-DD
-- Description: Tạo bảng <table_name> để lưu...

CREATE TABLE IF NOT EXISTS <table_name> (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         BIGINT UNSIGNED NOT NULL,
  name            VARCHAR(100) NOT NULL,
  status          ENUM('pending','active','done') NOT NULL DEFAULT 'pending',
  amount          DECIMAL(12,2),
  meta            JSON,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_<table>_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,

  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- Seed data (nếu cần)
INSERT IGNORE INTO <table_name> (name, status, created_at) VALUES
  ('Sample 1', 'active', NOW()),
  ('Sample 2', 'active', NOW());
```

## Checklist sau khi hoàn thành

- [ ] File tên đúng format `NNN_description.sql` với số thứ tự tiếp theo
- [ ] Dùng `CREATE TABLE IF NOT EXISTS`
- [ ] PRIMARY KEY là `BIGINT UNSIGNED AUTO_INCREMENT`
- [ ] Có `created_at DATETIME DEFAULT CURRENT_TIMESTAMP`
- [ ] `updated_at` có `ON UPDATE CURRENT_TIMESTAMP` (nếu row có thể bị update)
- [ ] FOREIGN KEY có tên constraint (`CONSTRAINT fk_...`)
- [ ] ON DELETE action hợp lý với business logic
- [ ] Có INDEX cho các column thường filter/join
- [ ] Money dùng `DECIMAL(12,2)`, không dùng FLOAT
- [ ] Boolean dùng `TINYINT(1)`, không dùng BOOL
- [ ] Seed data dùng `INSERT IGNORE` hoặc `ON DUPLICATE KEY` (idempotent)
- [ ] Không có typo trong column names (sẽ gây lỗi khi chạy migration)
