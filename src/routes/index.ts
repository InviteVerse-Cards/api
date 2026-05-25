import { Router } from 'express'
import authRoutes from './auth.routes'
import userRoutes from './user.routes'
import creditRoutes from './credit.routes'
import adminRoutes from './admin'
import templateRoutes from './template.routes'
import invitationRoutes from './invitation.routes'
import publicRoutes from './public.routes'
import uploadRoutes from './upload.routes'
import aiRoutes from './ai.routes'
import { TrackController } from '@/controllers/track.controller'
import { HeartbeatController } from '@/controllers/heartbeat.controller'
import { optionalToken } from '@/middleware/auth.middleware'
import { apiRateLimit } from '@/middleware/rateLimit'

const router = Router()

router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/credits', creditRoutes)
router.use('/admin', adminRoutes)
router.use('/templates', templateRoutes)
router.use('/invitations', invitationRoutes)
router.use('/uploads', uploadRoutes)
router.use('/ai', aiRoutes)
router.use('/public', publicRoutes)

// Traffic tracking routes
router.post('/track', apiRateLimit, optionalToken, TrackController.track)
router.post('/heartbeat', apiRateLimit, optionalToken, HeartbeatController.ping)

export default router
