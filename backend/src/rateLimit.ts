import { createMiddleware } from 'hono/factory'

/**
 * Simple in-memory fixed-window rate limiter keyed by client IP + path.
 * Good enough for a single-instance deployment; swap for a shared store
 * (Redis) if the backend ever runs multiple replicas.
 */
export function rateLimit(opts: { windowMs: number; max: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>()

  return createMiddleware(async (c, next) => {
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      'local'
    const key = `${ip}:${c.req.path}`
    const now = Date.now()

    let rec = hits.get(key)
    if (!rec || rec.resetAt <= now) {
      rec = { count: 0, resetAt: now + opts.windowMs }
      hits.set(key, rec)
    }
    rec.count++

    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k)
    }

    if (rec.count > opts.max) {
      c.header('Retry-After', String(Math.ceil((rec.resetAt - now) / 1000)))
      return c.json({ error: 'Too many attempts, try again later' }, 429)
    }
    await next()
  })
}
