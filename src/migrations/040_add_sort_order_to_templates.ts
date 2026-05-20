import type { Pool } from 'mysql2/promise'
import type { RowDataPacket } from 'mysql2'

interface CategoryRow extends RowDataPacket {
  id: number
  slug: string
}

export async function up(pool: Pool) {
  await pool.query(`
    ALTER TABLE templates
      ADD COLUMN sort_order INT UNSIGNED NOT NULL DEFAULT 0 AFTER use_count
  `)

  // Seed sort_order theo thứ tự hiện tại (is_active DESC, plan_required ASC, use_count DESC)
  // per category để thứ tự ban đầu có nghĩa
  const [categories] = await pool.query<CategoryRow[]>('SELECT id, slug FROM template_categories')

  for (const cat of categories) {
    const [templates] = await pool.query<Array<{ id: number } & RowDataPacket>>(
      `SELECT id FROM templates WHERE category_id = ? ORDER BY is_active DESC, plan_required ASC, use_count DESC`,
      [cat.id]
    )
    for (let i = 0; i < templates.length; i++) {
      await pool.query('UPDATE templates SET sort_order = ? WHERE id = ?', [i, templates[i].id])
    }
  }

  console.log('[040] Added sort_order column to templates + seeded initial order per category')
}

export async function down(pool: Pool) {
  await pool.query('ALTER TABLE templates DROP COLUMN sort_order')
}
