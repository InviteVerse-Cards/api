import geoip from 'geoip-lite'

export interface GeoLocation {
  country: string | null
  city: string | null
}

const LOCAL_IPS = new Set(['127.0.0.1', '::1', 'localhost'])

export function lookupIp(ip: string | null | undefined): GeoLocation {
  if (!ip) {
    return { country: null, city: null }
  }

  const cleanIp = ip.replace(/^::ffff:/, '').trim()

  // Handle local dev IPs
  if (LOCAL_IPS.has(cleanIp) || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.') || cleanIp.startsWith('172.')) {
    return { country: 'VN', city: 'Môi trường Local (Dev)' }
  }

  const geo = geoip.lookup(cleanIp)
  if (!geo) {
    return { country: null, city: null }
  }

  return {
    country: geo.country || null,
    city: geo.city || null,
  }
}
