export type OrderStatus = 'pending' | 'paid' | 'failed' | 'expired'

export interface CreditPackageRow {
  id: number
  name: string
  credits: number
  price: number
  validity_days: number
  description: string | null
  is_active: boolean
  sort_order: number
  created_at: Date
  updated_at: Date
}

export interface CreditOrderRow {
  id: number
  user_id: number
  package_id: number | null
  credits: number
  amount: number
  topup_code: string
  web2m_transaction_id: string | null
  status: OrderStatus
  retry_count: number
  qr_expires_at: Date | null
  paid_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface CreditUsageLogRow {
  id: number
  user_id: number
  reading_id: number | null
  module: string
  credits_used: number
  balance_after: number
  created_at: Date
}
