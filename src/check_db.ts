import pool from './config/database'

async function check() {
  const [rows] = await pool.query<any[]>(
    'SELECT slug, default_config FROM templates WHERE slug = ?',
    ['cuoi-tim-lavender']
  )
  console.log('Template:', rows[0]?.slug)
  console.log('Config:', JSON.stringify(rows[0]?.default_config, null, 2))
  await pool.end()
}

check()
