/**
 * Simple in-memory rate limiter for Edge Runtime (Next.js middleware).
 *
 * State persists within a single edge instance but is NOT shared across
 * regions or instances. This provides basic abuse protection — for
 * production-scale rate limiting, upgrade to Upstash Redis or Vercel KV.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()
let lastCleanup = Date.now()
const CLEANUP_INTERVAL = 60_000 // 1 minute

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of Array.from(rateLimitMap.entries())) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number; reset: number } {
  cleanup()

  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return { success: true, remaining: limit - 1, reset: now + windowMs }
  }

  entry.count++

  if (entry.count > limit) {
    return { success: false, remaining: 0, reset: entry.resetTime }
  }

  return { success: true, remaining: limit - entry.count, reset: entry.resetTime }
}

/** Rate limit configuration per route pattern */
export const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  '/api/stripe':               { limit: 10,  windowMs: 60_000 },   // 10/min
  '/api/chapters':             { limit: 30,  windowMs: 60_000 },   // 30/min
  '/api/og':                   { limit: 20,  windowMs: 60_000 },   // 20/min
  '/api/recommendations':      { limit: 5,   windowMs: 60_000 },   // 5/min
  '/api/push':                 { limit: 10,  windowMs: 60_000 },   // 10/min
  '/api/admin':                { limit: 20,  windowMs: 60_000 },   // 20/min
  '/api':                      { limit: 60,  windowMs: 60_000 },   // 60/min (default)
}

/**
 * Find the most specific rate limit config for a given path.
 * Matches the longest prefix first.
 */
export function getRateLimitConfig(pathname: string): { limit: number; windowMs: number } {
  const sortedKeys = Object.keys(RATE_LIMITS).sort((a, b) => b.length - a.length)
  for (const key of sortedKeys) {
    if (pathname.startsWith(key)) {
      return RATE_LIMITS[key]
    }
  }
  return RATE_LIMITS['/api']
}
