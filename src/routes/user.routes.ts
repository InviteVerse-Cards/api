import { Router } from 'express'
import { UserController } from '@/controllers/user.controller'
import { verifyToken } from '@/middleware/auth.middleware'
import { upload } from '@/services/upload.service'

const router = Router()

// All user routes require auth
router.use(verifyToken)

router.get('/profile', UserController.getProfile)
router.put('/profile', UserController.updateProfile)
router.patch('/password', UserController.changePassword)
router.post('/avatar', upload.single('avatar'), UserController.uploadAvatar)
router.delete('/avatar', UserController.deleteAvatar)
router.get('/credit-history', UserController.getCreditHistory)
router.delete('/account', UserController.deleteAccount)

export default router
