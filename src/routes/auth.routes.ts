import { Router } from 'express'
import { AuthController } from '@/controllers/auth.controller'
import { verifyToken } from '@/middleware/auth.middleware'
import { authRateLimit } from '@/middleware/rateLimit'
import {
  validate,
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@/middleware/validate'

const router = Router()

router.post('/register', authRateLimit, validate(registerSchema), AuthController.register)
router.post('/login', authRateLimit, validate(loginSchema), AuthController.login)
router.post('/refresh', authRateLimit, AuthController.refresh)
router.post('/logout', AuthController.logout)
router.get('/me', verifyToken, AuthController.me)
router.post('/verify-email', authRateLimit, validate(verifyEmailSchema), AuthController.verifyEmail)
router.post('/resend-verification', authRateLimit, validate(resendVerificationSchema), AuthController.resendVerification)
router.post('/forgot-password', authRateLimit, validate(forgotPasswordSchema), AuthController.forgotPassword)
router.post('/reset-password', authRateLimit, validate(resetPasswordSchema), AuthController.resetPassword)

export default router
