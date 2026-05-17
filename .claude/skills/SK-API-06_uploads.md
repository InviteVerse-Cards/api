# [SK-API-06] Uploads & Cloudinary

> Trigger: Viết bất kỳ tính năng upload file, xử lý ảnh, Cloudinary.

---

## Cloudinary Setup

```typescript
// config/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export default cloudinary
```

---

## Multer Setup (Memory Storage)

```typescript
// middleware/upload.middleware.ts
import multer from 'multer'
import { AppError } from '@/shared/errors/AppError'

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 10 * 1024 * 1024  // 10MB

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new AppError('INVALID_FILE', 'Chỉ chấp nhận ảnh (JPEG, PNG, WebP, GIF)', 400) as unknown as null)
    }
    cb(null, true)
  },
}).single('file')
```

---

## File Validation (Magic Bytes)

```typescript
// Không tin mimetype từ client — verify magic bytes thực sự
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png':  [[0x89, 0x50, 0x4E, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],  // RIFF...WEBP
  'image/gif':  [[0x47, 0x49, 0x46, 0x38]],  // GIF8
}

function validateMagicBytes(buffer: Buffer, mimetype: string): boolean {
  const expected = MAGIC_BYTES[mimetype]
  if (!expected) return false
  return expected.some(magic =>
    magic.every((byte, i) => buffer[i] === byte)
  )
}
```

---

## Upload Service

```typescript
// modules/uploads/uploads.service.ts
import cloudinary from '@/config/cloudinary'
import { Readable } from 'stream'

export const UploadsService = {
  async uploadImage(
    userId: number,
    invitationId: number | null,
    file: Express.Multer.File,
    purpose: 'background' | 'gallery' | 'avatar' | 'other' = 'other'
  ) {
    // Validate magic bytes
    if (!validateMagicBytes(file.buffer, file.mimetype)) {
      throw new AppError('INVALID_FILE', 'File không hợp lệ', 400)
    }

    // Upload to Cloudinary
    const folder = invitationId
      ? `inviteverse/invitations/${invitationId}`
      : `inviteverse/users/${userId}`

    const uploadResult = await uploadToCloudinary(file.buffer, {
      folder,
      resource_type: 'image',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    })

    // Tạo thumbnail URL
    const thumbnailUrl = cloudinary.url(uploadResult.public_id, {
      width: 400, height: 400, crop: 'fill', quality: 'auto', fetch_format: 'auto',
    })

    // Lưu vào DB
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO uploads (uuid, user_id, invitation_id, cloudinary_id, url, thumbnail_url,
       original_name, mime_type, size_bytes, width, height, purpose)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, invitationId, uploadResult.public_id, uploadResult.secure_url, thumbnailUrl,
        file.originalname, file.mimetype, file.size,
        uploadResult.width, uploadResult.height, purpose,
      ]
    )

    return {
      uuid: await getUUIDById(result.insertId),
      url: uploadResult.secure_url,
      thumbnail_url: thumbnailUrl,
      width: uploadResult.width,
      height: uploadResult.height,
    }
  },

  async deleteUpload(uuid: string, userId: number) {
    const upload = await UploadRepository.findByUuid(uuid)
    if (!upload) throw new AppError('NOT_FOUND', 'File không tìm thấy', 404)
    if (upload.user_id !== userId) throw new AppError('FORBIDDEN', 'Không có quyền', 403)

    // Xóa khỏi Cloudinary
    await cloudinary.uploader.destroy(upload.cloudinary_id)

    // Xóa khỏi DB
    await pool.query('DELETE FROM uploads WHERE uuid = ?', [uuid])
  },
}

// Helper: Buffer → Cloudinary stream upload
function uploadToCloudinary(
  buffer: Buffer,
  options: Record<string, unknown>
): Promise<cloudinary.UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error || !result) return reject(error)
      resolve(result)
    })
    Readable.from(buffer).pipe(stream)
  })
}
```

---

## Upload Controller

```typescript
// modules/uploads/uploads.controller.ts
export const UploadsController = {
  upload: async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return next(new AppError('NO_FILE', 'Vui lòng chọn file', 400))
      }

      const { purpose = 'other', invitation_id } = req.body
      const invitationId = invitation_id ? Number(invitation_id) : null

      // Verify invitation ownership nếu có invitation_id
      if (invitationId) {
        const inv = await InvitationRepository.findById(invitationId)
        if (!inv || inv.user_id !== req.user!.id) {
          throw new AppError('FORBIDDEN', 'Không có quyền upload vào thiệp này', 403)
        }
      }

      const result = await UploadsService.uploadImage(
        req.user!.id, invitationId, req.file, purpose
      )
      return res.status(201).json(success(result, 'Upload thành công'))
    } catch (err) {
      next(err)
    }
  },
}
```

---

## Upload Route

```typescript
// modules/uploads/uploads.routes.ts
router.post('/',
  verifyToken,
  uploadMiddleware,           // multer xử lý multipart
  validate(uploadSchema),     // validate purpose field
  UploadsController.upload
)

router.delete('/:uuid',
  verifyToken,
  UploadsController.delete
)
```

---

## Cloudinary URL Transformations

```typescript
// Tạo URL với transformation
const optimized = cloudinary.url(publicId, {
  quality: 'auto',
  fetch_format: 'auto',       // WebP khi browser support
  width: 1200,
  crop: 'limit',              // Không upscale
})

const thumbnail = cloudinary.url(publicId, {
  width: 400, height: 400,
  crop: 'fill',
  gravity: 'face',            // Focus vào mặt nếu có
  quality: 'auto',
  fetch_format: 'auto',
})

const ogImage = cloudinary.url(publicId, {
  width: 1200, height: 630,
  crop: 'fill',
  quality: 80,
})
```

---

## Free Plan Upload Limits

```typescript
// Kiểm tra free plan: giới hạn tổng dung lượng upload
async function checkUploadQuota(userId: number, plan: string): Promise<void> {
  if (plan === 'pro') return  // Pro không giới hạn

  const [[{ total_size }]] = await pool.query<Array<{ total_size: number } & RowDataPacket>>(
    'SELECT COALESCE(SUM(size_bytes), 0) as total_size FROM uploads WHERE user_id = ?',
    [userId]
  )

  const FREE_LIMIT = 50 * 1024 * 1024  // 50MB
  if (total_size >= FREE_LIMIT) {
    throw new AppError(
      'STORAGE_LIMIT',
      'Free plan giới hạn 50MB storage. Nâng lên Pro để tiếp tục.',
      403
    )
  }
}
```
