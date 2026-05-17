import { Router } from 'express'
import { verifyToken } from '@/middleware/auth.middleware'
import { upload } from '@/services/upload.service'
import { UploadController } from '@/controllers/upload.controller'

const router = Router()

router.post('/', verifyToken, upload.single('file'), UploadController.upload)

export default router
