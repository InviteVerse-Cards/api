import { Router } from 'express'
import { AdminSettingController } from '@/controllers/admin/adminSetting.controller'

const router = Router()

router.get('/', AdminSettingController.getAll)
router.put('/', AdminSettingController.setMany)
router.put('/:key', AdminSettingController.set)

export default router
