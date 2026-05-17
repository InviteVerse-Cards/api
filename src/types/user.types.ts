export type UserRole = 'user' | 'admin'
export type CreditsStatus = 'active' | 'frozen' | 'empty'

export interface UserRow {
  id: number
  full_name: string
  email: string | null
  phone: string | null
  birth_date: Date | null
  gender: string | null
  password_hash: string | null
  avatar_url: string | null
  avatar_public_id: string | null
  role: UserRole
  credits_balance: number
  credits_expires_at: Date | null
  is_verified: boolean
  is_active: boolean
  last_login_at: Date | null
  email_verify_token: string | null
  email_verify_token_expires: Date | null
  reset_password_token: string | null
  reset_password_token_expires: Date | null
  created_at: Date
  updated_at: Date
}

export interface UserPublic {
  id: number
  full_name: string
  email: string | null
  phone: string | null
  birth_date: string | null
  gender: string | null
  avatar_url: string | null
  role: UserRole
  credits_balance: number
  credits_expires_at: string | null
  credits_status: CreditsStatus
  is_verified: boolean
  created_at: string
}

export interface RegisterDto {
  full_name: string
  email: string
  password: string
  phone?: string
}

export interface LoginDto {
  email: string
  password: string
}
