import { Router } from 'express'
import { verifyToken, requireAdmin } from '@/middleware/auth.middleware'
import userAdminRoutes from './user.admin.routes'
import aiAdminRoutes from './ai.admin.routes'
import packageAdminRoutes from './package.admin.routes'
import orderAdminRoutes from './order.admin.routes'
import settingAdminRoutes from './setting.admin.routes'
import statsAdminRoutes from './stats.admin.routes'
import templateAdminRoutes from './template.admin.routes'
import categoryAdminRoutes from './category.admin.routes'
import musicAdminRoutes from './music.admin.routes'

const router = Router()

router.use(verifyToken, requireAdmin)

router.use('/users', userAdminRoutes)
router.use('/ai-models', aiAdminRoutes)
router.use('/credit-packages', packageAdminRoutes)
router.use('/credit-orders', orderAdminRoutes)
router.use('/settings', settingAdminRoutes)
router.use('/stats', statsAdminRoutes)
router.use('/templates', templateAdminRoutes)
router.use('/categories', categoryAdminRoutes)
router.use('/music', musicAdminRoutes)

export default router
