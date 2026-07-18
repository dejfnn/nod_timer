import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../db'
import { authMiddleware, workspaceMiddleware, type WorkspaceEnv } from '../auth'

const app = new Hono<WorkspaceEnv>()
app.use('*', authMiddleware)
app.use('*', workspaceMiddleware)

const ClientInput = z.object({ name: z.string().min(1) })

app.get('/', async (c) => {
  const clients = await prisma.client.findMany({
    where: { workspaceId: c.get('workspaceId') },
    orderBy: { name: 'asc' },
  })
  return c.json(clients)
})

app.post('/', async (c) => {
  const body = ClientInput.parse(await c.req.json())
  const client = await prisma.client.create({
    data: { ...body, workspaceId: c.get('workspaceId') },
  })
  return c.json(client, 201)
})

app.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = ClientInput.partial().parse(await c.req.json())
  const { count } = await prisma.client.updateMany({
    where: { id, workspaceId: c.get('workspaceId') },
    data: body,
  })
  if (count === 0) return c.json({ error: 'Not found' }, 404)
  return c.json(await prisma.client.findUnique({ where: { id } }))
})

app.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const workspaceId = c.get('workspaceId')
  // Mirror frontend deleteClient: null out clientId on this workspace's projects.
  await prisma.$transaction([
    prisma.project.updateMany({ where: { workspaceId, clientId: id }, data: { clientId: null } }),
    prisma.client.deleteMany({ where: { id, workspaceId } }),
  ])
  return c.json({ ok: true })
})

export default app
