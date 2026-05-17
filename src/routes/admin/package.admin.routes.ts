import { Router } from 'express'
import { AdminPackageController } from '@/controllers/admin/adminPackage.controller'

const router = Router()

router.get('/', AdminPackageController.list)
router.post('/', AdminPackageController.create)
router.put('/:id', AdminPackageController.update)
router.delete('/:id', AdminPackageController.delete)

export default router
