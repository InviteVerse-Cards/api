export const WEB2M_CONFIG = {
  bankName:        process.env.BANK_NAME ?? '',
  bankNumber:      process.env.BANK_NUMBER ?? '',
  accountHolder:   process.env.BANK_ACCOUNT_HOLDER ?? '',
  isMask:          process.env.IS_MASK ?? '0',
  bankBackground:  process.env.BANK_BACKGROUND ?? '1',
  bankToken:       process.env.BANK_TOKEN ?? '',
  bankPassword:    process.env.BANK_PASSWORD ?? '',
  apiGetQr:        process.env.API_GET_QR ?? '',
  apiGetTransaction:    process.env.API_GET_TRANSACTION ?? '',
  apiGetTransactionV2:  process.env.API_GET_TRANSACTION_V2 ?? '',
} as const
