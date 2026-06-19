import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../db'
import { authMiddleware, createToken, hashPassword, verifyPassword, type AuthEnv } from '../auth'

const app = new Hono()

const Credentials = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

app.post('/register', async (c) => {
  const { email, password } = Credentials.parse(await c.req.json())
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return c.json({ error: 'Email already registered' }, 409)
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      settings: { create: {} },
    },
  })
  const token = await createToken(user.id)
  return c.json({ token, user: { id: user.id, email: user.email } }, 201)
})

app.post('/login', async (c) => {
  const { email, password } = Credentials.parse(await c.req.json())
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return c.json({ error: 'Invalid credentials' }, 401)
  }
  const token = await createToken(user.id)
  return c.json({ token, user: { id: user.id, email: user.email } })
})

const me = new Hono<AuthEnv>()
me.use('*', authMiddleware)
me.get('/', async (c) => {
  const user = await prisma.user.findUnique({
    where: { id: c.get('userId') },
    select: { id: true, email: true, createdAt: true },
  })
  if (!user) return c.json({ error: 'Not found' }, 404)
  return c.json(user)
})
app.route('/me', me)

export default app
