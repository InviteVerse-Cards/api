import crypto from 'crypto'

export function generateTopupCode(): string {
  const now = new Date()
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('')
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `TOPUP${datePart}${randomPart}`
}

export function generateOTP(length = 6): string {
  return String(Math.floor(Math.random() * Math.pow(10, length))).padStart(length, '0')
}
