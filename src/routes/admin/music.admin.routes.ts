import { Router } from 'express'
import { AdminMusicController } from '@/controllers/admin/adminMusic.controller'
import { upload } from '@/services/upload.service'

const router = Router()

router.get('/', AdminMusicController.list)
router.post('/', AdminMusicController.create)
router.post('/upload', upload.single('file'), AdminMusicController.upload)
router.patch('/:id/set-default', AdminMusicController.setDefault)
router.patch('/:id', AdminMusicController.update)
router.delete('/:id', AdminMusicController.remove)

export default router
