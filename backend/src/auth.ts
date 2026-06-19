import { createMiddleware } from 'hono/factory'
import { sign, verify } from 'hono/jwt'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me'
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

export type AuthEnv = { Variables: { userId: string } }

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function createToken(userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return sign({ sub: userId, iat: now, exp: now + TOKEN_TTL_SECONDS }, JWT_SECRET)
}

/** Requires a valid Bearer token; exposes the user id via c.get('userId'). */
export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  try {
    const payload = await verify(header.slice(7), JWT_SECRET, 'HS256')
    if (!payload.sub || typeof payload.sub !== 'string') {
      return c.json({ error: 'Invalid token' }, 401)
    }
    c.set('userId', payload.sub)
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
  await next()
})
