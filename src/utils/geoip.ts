import geoip from 'geoip-lite'

export interface GeoLocation {
  country: string | null
  city: string | null
}

const LOCAL_IPS = new Set(['127.0.0.1', '::1', 'localhost'])

// In-memory cache for IP lookup to avoid redundant external API calls
const ipCache = new Map<string, GeoLocation>()

export async function lookupIp(ip: string | null | undefined): Promise<GeoLocation> {
  if (!ip) {
    return { country: null, city: null }
  }

  const cleanIp = ip.replace(/^::ffff:/, '').trim()

  // Handle local dev IPs
  if (LOCAL_IPS.has(cleanIp) || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.') || cleanIp.startsWith('172.')) {
    return { country: 'VN', city: 'Môi trường Local (Dev)' }
  }

  // Check cache first
  if (ipCache.has(cleanIp)) {
    return ipCache.get(cleanIp)!
  }

  try {
    // Query ip-api.com for accurate location (especially for Vietnam ISPs like Viettel, VNPT, FPT)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)

    const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,countryCode,city`, {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (res.ok) {
      const data = (await res.json()) as { status: string; countryCode?: string; city?: string }
      if (data.status === 'success') {
        const result: GeoLocation = {
          country: data.countryCode || 'VN',
          city: data.city || null,
        }
        ipCache.set(cleanIp, result)
        return result
      }
    }
  } catch {
    // Silent fallback to offline geoip-lite if API is unreachable or times out
  }

  // Fallback to offline geoip-lite
  const geo = geoip.lookup(cleanIp)
  const fallbackResult: GeoLocation = {
    country: geo?.country || null,
    city: geo?.city || null,
  }
  if (fallbackResult.city) {
    ipCache.set(cleanIp, fallbackResult)
  }
  return fallbackResult
}
