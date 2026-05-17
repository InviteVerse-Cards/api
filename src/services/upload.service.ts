import multer from 'multer'
import cloudinary from '@/config/cloudinary'
import type { UploadApiOptions } from 'cloudinary'
import { createError } from '@/utils/response'
import type { Request } from 'express'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/wav', 'audio/mp3']
const MAX_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB

// Store in memory for Cloudinary stream upload
const storage = multer.memoryStorage()

export const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter(_req: Request, file, cb) {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(createError('INVALID_FILE_TYPE', 'Định dạng file không hỗ trợ (chỉ nhận ảnh hoặc mp3)', 422))
    }
  },
})

export interface UploadResult {
  url: string
  publicId: string
}

export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  publicId?: string
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const options: UploadApiOptions = {
      folder,
      resource_type: 'auto',
      ...(publicId ? { public_id: publicId, overwrite: true } : {}),
    }

    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error || !result) {
        reject(createError('UPLOAD_FAILED', 'Tải file lên Cloudinary thất bại', 502))
        return
      }
      resolve({ url: result.secure_url, publicId: result.public_id })
    })

    stream.end(buffer)
  })
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId)
}
