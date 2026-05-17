import { Router } from 'express'
import { AdminTemplateController } from '@/controllers/admin/adminTemplate.controller'

const router = Router()

router.get('/', AdminTemplateController.list)
router.post('/', AdminTemplateController.create)
router.put('/:uuid', AdminTemplateController.update)
router.delete('/:uuid', AdminTemplateController.remove)

export default router
