# [SK-API-02] Database & MySQL

> Trigger: Bất kỳ task nào có SQL queries, DB schema, migrations.

---

## Pool Setup

```typescript
// config/database.ts
import mysql from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: '+07:00',
})

export default pool
```

---

## Query Patterns (bắt buộc)

### SELECT một record

```typescript
import pool from '@/config/database'
import type { RowDataPacket } from 'mysql2'

interface InvRow extends RowDataPacket {
  id: number; uuid: string; slug: string; user_id: number
  title: string; status: string; theme_config: string
}

const [rows] = await pool.query<InvRow[]>(
  `SELECT id, uuid, slug, user_id, title, status, theme_config
   FROM invitations
   WHERE uuid = ? AND deleted_at IS NULL`,
  [uuid]
)
const invitation = rows[0] ?? null
```

### SELECT nhiều records với pagination

```typescript
const [rows] = await pool.query<InvRow[]>(
  `SELECT id, uuid, title, status, view_count, published_at
   FROM invitations
   WHERE user_id = ? AND deleted_at IS NULL
   ORDER BY created_at DESC
   LIMIT ? OFFSET ?`,
  [userId, limit, offset]
)

const [[{ total }]] = await pool.query<Array<{ total: number } & RowDataPacket>>(
  `SELECT COUNT(*) as total FROM invitations WHERE user_id = ? AND deleted_at IS NULL`,
  [userId]
)
```

### INSERT

```typescript
import type { ResultSetHeader } from 'mysql2'

const [result] = await pool.query<ResultSetHeader>(
  `INSERT INTO invitations (uuid, user_id, template_id, slug, title, category, theme_config)
   VALUES (UUID(), ?, ?, ?, ?, ?, ?)`,
  [userId, templateId, slug, title, category, JSON.stringify(themeConfig)]
)
return result.insertId
```

### UPDATE

```typescript
const [result] = await pool.query<ResultSetHeader>(
  `UPDATE invitations SET title = ?, theme_config = ?, updated_at = NOW()
   WHERE uuid = ? AND user_id = ?`,
  [title, JSON.stringify(themeConfig), uuid, userId]
)
if (result.affectedRows === 0) throw new AppError('NOT_FOUND', 'Không tìm thấy thiệp', 404)
```

### Soft Delete

```typescript
await pool.query(
  `UPDATE invitations SET deleted_at = NOW() WHERE uuid = ? AND user_id = ?`,
  [uuid, userId]
)
```

### Transaction

```typescript
const conn = await pool.getConnection()
try {
  await conn.beginTransaction()

  const [inv] = await conn.query<ResultSetHeader>(
    'INSERT INTO invitations (...) VALUES (?)', [...]
  )
  await conn.query(
    'INSERT INTO invitation_sections (invitation_id, ...) VALUES ?',
    [sectionsData.map(s => [inv.insertId, ...])]
  )

  await conn.commit()
  return inv.insertId
} catch (err) {
  await conn.rollback()
  throw err
} finally {
  conn.release()
}
```

---

## JSON Columns

```typescript
// Lưu JSON column: luôn JSON.stringify trước khi INSERT/UPDATE
await pool.query(
  'UPDATE invitations SET theme_config = ? WHERE id = ?',
  [JSON.stringify(themeConfig), id]
)

// Đọc JSON column: MySQL trả về string, cần parse
const raw = rows[0]
const invitation = {
  ...raw,
  theme_config: typeof raw.theme_config === 'string'
    ? JSON.parse(raw.theme_config)
    : raw.theme_config,
  sections: [],
}
```

---

## Bulk Insert

```typescript
// Bulk insert sections
const values = sections.map(s => [
  invitationId,
  s.section_type,
  s.sort_order,
  s.is_enabled ? 1 : 0,
  JSON.stringify(s.config),
])

await pool.query(
  `INSERT INTO invitation_sections (invitation_id, section_type, sort_order, is_enabled, config)
   VALUES ?`,
  [values]
)
```

---

## Migration Convention

```sql
-- migrations/005_create_invitations.sql
CREATE TABLE IF NOT EXISTS invitations (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid          VARCHAR(36)  NOT NULL UNIQUE DEFAULT (UUID()),
  user_id       BIGINT UNSIGNED NOT NULL,
  template_id   BIGINT UNSIGNED,
  slug          VARCHAR(200) NOT NULL UNIQUE,
  title         VARCHAR(300) NOT NULL,
  category      VARCHAR(100) NOT NULL,
  status        ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  theme_config  JSON NOT NULL,
  watermark     TINYINT(1) NOT NULL DEFAULT 1,
  view_count    INT UNSIGNED NOT NULL DEFAULT 0,
  published_at  DATETIME,
  deleted_at    DATETIME,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_status (user_id, status, deleted_at),
  INDEX idx_slug (slug)
);
```

**Migration rules:**
- File đặt tên: `NNN_description.sql` (NNN là số thứ tự 3 chữ số)
- LUÔN dùng `IF NOT EXISTS` / `IF EXISTS`
- LUÔN có `created_at`, `updated_at` trên mọi bảng
- Soft delete: dùng `deleted_at DATETIME` không dùng `is_deleted`
- UUID: dùng `VARCHAR(36)` với `DEFAULT (UUID())` cho public IDs

---

## Anti-patterns (KHÔNG làm)

```typescript
// ❌ String concatenation SQL — SQL injection
const rows = await pool.query(`SELECT * FROM users WHERE id = ${userId}`)

// ❌ SELECT * — không rõ ràng, lãng phí
const [rows] = await pool.query('SELECT * FROM invitations WHERE id = ?', [id])

// ❌ Quên parse JSON column
const inv = rows[0]
inv.theme_config.primary_color  // sẽ fail nếu string chưa parse

// ❌ Không handle null result
const user = rows[0]
return user.email  // crash nếu rows rỗng
```

---

## Repository Pattern (khi service phức tạp)

```typescript
// modules/invitations/invitations.repository.ts
export const InvitationRepository = {
  async findByUuid(uuid: string): Promise<InvitationRow | null> {
    const [rows] = await pool.query<InvRow[]>(
      `SELECT id, uuid, user_id, slug, title, status, theme_config, watermark, view_count
       FROM invitations WHERE uuid = ? AND deleted_at IS NULL`,
      [uuid]
    )
    if (!rows[0]) return null
    return { ...rows[0], theme_config: JSON.parse(rows[0].theme_config as unknown as string) }
  },

  async countByUser(userId: number): Promise<number> {
    const [[row]] = await pool.query<Array<{ total: number } & RowDataPacket>>(
      `SELECT COUNT(*) as total FROM invitations WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    )
    return row.total
  },
}
```
