import { Router } from 'express'
import { AdminOrderController } from '@/controllers/admin/adminOrder.controller'

const router = Router()

router.get('/', AdminOrderController.list)
router.get('/:id', AdminOrderController.getById)
router.put('/:id/confirm', AdminOrderController.manualFulfill)
router.post('/:id/fulfill', AdminOrderController.manualFulfill)
router.post('/:id/cancel', AdminOrderController.cancel)

export default router
