import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { errorHandler } from '@/middleware/errorHandler'
import routes from '@/routes'

const app = express()

// Trust one level of reverse proxy (Nginx/Cloudflare) to get real client IP via X-Forwarded-For
app.set('trust proxy', 1)

app.use(helmet())
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://192.168.1.33:5173',
  ],
  // origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }))

app.use('/api/v1', routes)

app.use(errorHandler)

export default app
