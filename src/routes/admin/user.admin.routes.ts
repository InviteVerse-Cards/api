import { Router } from 'express'
import { AdminUserController } from '@/controllers/admin/adminUser.controller'

const router = Router()

router.get('/', AdminUserController.list)
router.get('/:id', AdminUserController.getById)
router.put('/:id', AdminUserController.update)
router.post('/:id/adjust-credits', AdminUserController.adjustCredits)
router.post('/:id/grant-credits', AdminUserController.grantCredits)
router.post('/:id/reset-password', AdminUserController.resetPassword)
router.delete('/:id', AdminUserController.delete)

export default router
