import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { authMiddleware, createToken, hashPassword, verifyPassword, type AuthEnv } from './auth'

describe('password hashing', () => {
  it('verifies a correct password', async () => {
    const hash = await hashPassword('secret-password')
    expect(await verifyPassword('secret-password', hash)).toBe(true)
  })
  it('rejects a wrong password', async () => {
    const hash = await hashPassword('secret-password')
    expect(await verifyPassword('other-password', hash)).toBe(false)
  })
})

describe('authMiddleware', () => {
  const app = new Hono<AuthEnv>()
  app.use('*', authMiddleware)
  app.get('/whoami', (c) => c.json({ userId: c.get('userId') }))

  it('accepts a valid token and exposes the user id', async () => {
    const token = await createToken('user-123')
    const res = await app.request('/whoami', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ userId: 'user-123' })
  })

  it('rejects a missing header', async () => {
    const res = await app.request('/whoami')
    expect(res.status).toBe(401)
  })

  it('rejects a malformed token', async () => {
    const res = await app.request('/whoami', {
      headers: { Authorization: 'Bearer not-a-jwt' },
    })
    expect(res.status).toBe(401)
  })
})
