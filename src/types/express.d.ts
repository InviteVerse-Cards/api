import type { UserRow } from './user.types'

declare global {
  namespace Express {
    interface Request {
      user?: UserRow
      sessionId?: string
    }
  }
}
