import { Router } from 'express'
import { AdminAIController } from '@/controllers/admin/adminAI.controller'

const router = Router()

router.get('/', AdminAIController.list)
router.post('/fetch-models', AdminAIController.fetchModels)
router.post('/', AdminAIController.create)
router.put('/:id', AdminAIController.update)
router.post('/:id/set-default', AdminAIController.setDefault)
router.post('/:id/test', AdminAIController.testKey)
router.delete('/:id', AdminAIController.delete)

export default router
