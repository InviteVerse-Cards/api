import 'dotenv/config'
import os from 'os'
import app from '@/app'
import { logger } from '@/utils/logger'

const PORT = Number(process.env.PORT) || 3000

function getLocalIPs() {
  const interfaces = os.networkInterfaces()
  const ips: string[] = []
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address)
      }
    }
  }
  return ips
}

app.listen(PORT, '0.0.0.0', () => {
  const localIPs = getLocalIPs()
  logger.info(`Server running on port ${PORT} [${process.env.NODE_ENV}]`)
  logger.info(`- Local: http://localhost:${PORT}`)
  localIPs.forEach(ip => logger.info(`- Network: http://${ip}:${PORT}`))
})

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason)
})

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err)
  process.exit(1)
})
