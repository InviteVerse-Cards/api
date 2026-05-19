import { Router } from 'express'
import { AdminTemplateController } from '@/controllers/admin/adminTemplate.controller'

const router = Router()

router.get('/', AdminTemplateController.list)
router.post('/', AdminTemplateController.create)
router.get('/:uuid/full', AdminTemplateController.getFull)
router.put('/:uuid', AdminTemplateController.update)
router.put('/:uuid/theme', AdminTemplateController.updateTheme)
router.put('/:uuid/sections', AdminTemplateController.updateSections)
router.put('/:uuid/music', AdminTemplateController.updateMusic)
router.delete('/:uuid', AdminTemplateController.remove)

export default router
