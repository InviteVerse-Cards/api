import type { Request, Response, NextFunction } from 'express'
import { uploadToCloudinary } from '@/services/upload.service'
import { success, createError } from '@/utils/response'

export const UploadController = {
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return next(createError('NO_FILE', 'Vui lòng chọn file ảnh', 400))
      }

      const purpose = (req.body.purpose as string) || 'other'
      const folder = `inviteverse/users/${req.user!.id}/${purpose}`

      const result = await uploadToCloudinary(req.file.buffer, folder)
      return res.status(201).json(success(result, 'Upload thành công'))
    } catch (err) {
      next(err)
    }
  },
}
