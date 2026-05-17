import { Router } from 'express'
import { verifyToken } from '@/middleware/auth.middleware'
import { apiRateLimit } from '@/middleware/rateLimit'
import { InvitationController } from '@/controllers/invitation.controller'

const router = Router()

router.get('/', verifyToken, InvitationController.list)
router.post('/', verifyToken, apiRateLimit, InvitationController.create)
router.get('/:uuid', verifyToken, InvitationController.getOne)
router.put('/:uuid', verifyToken, InvitationController.update)
router.delete('/:uuid', verifyToken, InvitationController.remove)
router.post('/:uuid/publish', verifyToken, InvitationController.publish)
router.get('/:uuid/guests', verifyToken, InvitationController.getGuests)

export default router
