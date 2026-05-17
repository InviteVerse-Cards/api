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

export default router
