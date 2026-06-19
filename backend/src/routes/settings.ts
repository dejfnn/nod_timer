import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../db'
import { authMiddleware, type AuthEnv } from '../auth'

const app = new Hono<AuthEnv>()
app.use('*', authMiddleware)

const SettingsInput = z.object({
  currency: z.string().optional(),
  defaultRate: z.number().optional(),
  weekStart: z.union([z.literal(0), z.literal(1)]).optional(),
  hourFormat: z.union([z.literal('12'), z.literal('24')]).optional(),
})

app.get('/', async (c) => {
  const userId = c.get('userId')
  const settings = await prisma.settings.upsert({
    where: { userId },
    create: { userId },
    update: {},
  })
  return c.json(settings)
})

app.put('/', async (c) => {
  const userId = c.get('userId')
  const body = SettingsInput.parse(await c.req.json())
  const settings = await prisma.settings.upsert({
    where: { userId },
    create: { userId, ...body },
    update: body,
  })
  return c.json(settings)
})

export default app
