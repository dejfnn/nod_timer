import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { rateLimit } from './rateLimit'

function makeApp(max: number) {
  const app = new Hono()
  app.use('/login', rateLimit({ windowMs: 60_000, max }))
  app.post('/login', (c) => c.json({ ok: true }))
  return app
}

const post = (app: Hono, ip: string) =>
  app.request('/login', { method: 'POST', headers: { 'x-forwarded-for': ip } })

describe('rateLimit', () => {
  it('allows requests under the limit', async () => {
    const app = makeApp(3)
    for (let i = 0; i < 3; i++) {
      expect((await post(app, '1.2.3.4')).status).toBe(200)
    }
  })

  it('blocks requests over the limit with 429', async () => {
    const app = makeApp(2)
    await post(app, '1.2.3.4')
    await post(app, '1.2.3.4')
    const res = await post(app, '1.2.3.4')
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBeTruthy()
  })

  it('tracks IPs independently', async () => {
    const app = makeApp(1)
    expect((await post(app, '1.1.1.1')).status).toBe(200)
    expect((await post(app, '2.2.2.2')).status).toBe(200)
    expect((await post(app, '1.1.1.1')).status).toBe(429)
  })
})
