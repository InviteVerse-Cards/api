import { Router } from 'express'
import { AdminInvitationController } from '@/controllers/admin/adminInvitation.controller'

const router = Router()

router.get('/', AdminInvitationController.list)
router.delete('/:uuid', AdminInvitationController.delete)

export default router
