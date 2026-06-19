import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../db'
import { authMiddleware, type AuthEnv } from '../auth'

const app = new Hono<AuthEnv>()
app.use('*', authMiddleware)

const ClientInput = z.object({ name: z.string().min(1) })

app.get('/', async (c) => {
  const clients = await prisma.client.findMany({
    where: { userId: c.get('userId') },
    orderBy: { name: 'asc' },
  })
  return c.json(clients)
})

app.post('/', async (c) => {
  const body = ClientInput.parse(await c.req.json())
  const client = await prisma.client.create({ data: { ...body, userId: c.get('userId') } })
  return c.json(client, 201)
})

app.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = ClientInput.partial().parse(await c.req.json())
  const { count } = await prisma.client.updateMany({
    where: { id, userId: c.get('userId') },
    data: body,
  })
  if (count === 0) return c.json({ error: 'Not found' }, 404)
  return c.json(await prisma.client.findUnique({ where: { id } }))
})

app.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const userId = c.get('userId')
  // Mirror frontend deleteClient: null out clientId on this user's projects.
  await prisma.$transaction([
    prisma.project.updateMany({ where: { userId, clientId: id }, data: { clientId: null } }),
    prisma.client.deleteMany({ where: { id, userId } }),
  ])
  return c.json({ ok: true })
})

export default app
