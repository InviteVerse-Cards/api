import 'dotenv/config'
import path from 'path'
import { Umzug } from 'umzug'
import type { MigrationParams, UmzugStorage } from 'umzug'
import type { Pool, RowDataPacket } from 'mysql2/promise'
import pool from '@/config/database'
import { logger } from '@/utils/logger'

// ─── Custom MySQL storage (stores migration history in DB) ───────────────────
class MysqlStorage implements UmzugStorage<Pool> {
  constructor(private readonly db: Pool, private readonly table = 'migrations') {}

  private async ensureTable() {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS \`${this.table}\` (
        name       VARCHAR(255) NOT NULL PRIMARY KEY,
        run_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
  }

  async logMigration({ name }: MigrationParams<Pool>) {
    await this.ensureTable()
    await this.db.query(`INSERT IGNORE INTO \`${this.table}\` (name) VALUES (?)`, [name])
  }

  async unlogMigration({ name }: MigrationParams<Pool>) {
    await this.db.query(`DELETE FROM \`${this.table}\` WHERE name = ?`, [name])
  }

  async executed(): Promise<string[]> {
    await this.ensureTable()
    const [rows] = await this.db.query<RowDataPacket[]>(
      `SELECT name FROM \`${this.table}\` ORDER BY name ASC`
    )
    return rows.map(r => r.name as string)
  }
}

function safeLog(msg: unknown): string {
  if (typeof msg === 'string') return msg
  if (typeof msg === 'object' && msg !== null) {
    const { event, name, durationSeconds } = msg as Record<string, unknown>
    return JSON.stringify({ event, name, durationSeconds })
  }
  return String(msg)
}

// ─── Umzug instance ───────────────────────────────────────────────────────────
// migrations/ lives inside src/migrations/ — compiled to dist/migrations/
// Dùng forward slash để glob hoạt động trên Windows
const migrationsDir = path.join(__dirname, 'migrations').split(path.sep).join('/')

// In dev tsx runs .ts directly; in production node runs compiled .js
const ext = __filename.endsWith('.ts') ? 'ts' : 'js'

const umzug = new Umzug<Pool>({
  migrations: {
    glob: `${migrationsDir}/*.${ext}`,
    resolve: ({ name, path: migPath, context }) => {
       
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const migration = require(migPath!) as {
        up: (pool: Pool) => Promise<void>
        down: (pool: Pool) => Promise<void>
      }
      return {
        name,
        up:   () => migration.up(context),
        down: () => migration.down(context),
      }
    },
  },
  context: pool,
  storage: new MysqlStorage(pool),
  logger: {
    info:  msg => logger.info(`[migrate] ${safeLog(msg)}`),
    warn:  msg => logger.warn(`[migrate] ${safeLog(msg)}`),
    error: msg => logger.error(`[migrate] ${safeLog(msg)}`),
    debug: () => {},
  },
})

// ─── CLI ──────────────────────────────────────────────────────────────────────
async function main() {
  const command = process.argv[2] ?? 'up'

  try {
    if (command === 'up') {
      const applied = await umzug.up()
      if (applied.length === 0) logger.info('[migrate] Already up to date.')
      else logger.info(`[migrate] Applied: ${applied.map(m => m.name).join(', ')}`)

    } else if (command === 'down') {
      const rolled = await umzug.down()
      logger.info(`[migrate] Rolled back: ${rolled.map(m => m.name).join(', ')}`)

    } else if (command === 'status') {
      const executed = await umzug.executed()
      const pending  = await umzug.pending()
      logger.info(`[migrate] Executed (${executed.length}): ${executed.map(m => m.name).join(', ') || 'none'}`)
      logger.info(`[migrate] Pending  (${pending.length}): ${pending.map(m => m.name).join(', ')  || 'none'}`)

    } else {
      logger.error(`Unknown command "${command}". Use: up | down | status`)
      process.exit(1)
    }
  } catch (err) {
    logger.error('[migrate] Failed:', err)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
