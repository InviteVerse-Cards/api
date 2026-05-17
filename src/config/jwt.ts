export const JWT_CONFIG = {
  accessSecret:  process.env.JWT_ACCESS_SECRET ?? 'dev_access_secret_change_me',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev_refresh_secret_change_me',
  accessExpiry:  '15m',
  refreshExpiry: '30d',
  accessMaxAge:  15 * 60 * 1000,
  refreshMaxAge: 30 * 24 * 60 * 60 * 1000,
} as const
