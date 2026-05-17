import mysql from 'mysql2/promise'
import { logger } from '@/utils/logger'

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'fengshui',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
  dateStrings: false,
})

pool.getConnection()
  .then(conn => { logger.info('MySQL connected'); conn.release() })
  .catch(err => logger.error('MySQL connection failed:', err))

export default pool
