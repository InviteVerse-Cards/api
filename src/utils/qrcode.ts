import QRCode from 'qrcode'
import cloudinary from '@/config/cloudinary'
import { Readable } from 'stream'
import type { UploadApiResponse } from 'cloudinary'
import { logger } from '@/utils/logger'

export async function generateQRCode(url: string, invitationId: number | bigint): Promise<string> {
  try {
    const buffer = await QRCode.toBuffer(url, {
      width: 400,
      margin: 2,
      color: { dark: '#1a1a1a', light: '#ffffff' },
    })

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'inviteverse/qr',
          public_id: `qr_${invitationId}`,
          overwrite: true,
          resource_type: 'image',
        },
        (err, res) => (err || !res ? reject(err) : resolve(res))
      )
      Readable.from(buffer).pipe(stream)
    })

    return result.secure_url
  } catch (err) {
    logger.warn('QR generation failed, returning placeholder', err)
    return ''
  }
}
