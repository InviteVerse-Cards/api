import { Router } from 'express'
import { verifyToken } from '@/middleware/auth.middleware'
import { requireCredits } from '@/middleware/checkCredits'
import { apiRateLimit } from '@/middleware/rateLimit'
import { AIController } from '@/controllers/ai.controller'

const router = Router()

router.post('/generate-text', apiRateLimit, verifyToken, requireCredits(1), AIController.generateText)
router.post('/generate-theme', apiRateLimit, verifyToken, requireCredits(1), AIController.generateTheme)

export default router
