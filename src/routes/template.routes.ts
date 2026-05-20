import { Router } from 'express'
import { TemplateController } from '@/controllers/template.controller'

const router = Router()

router.get('/categories', TemplateController.listCategories)
router.get('/', TemplateController.list)

export default router
