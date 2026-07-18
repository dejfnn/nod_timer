import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../db'
import { authMiddleware, type AuthEnv } from '../auth'

const app = new Hono<AuthEnv>()
app.use('*', authMiddleware)

const ProjectInput = z.object({
  name: z.string().min(1),
  color: z.string().min(1),
  clientId: z.string().nullable().optional(),
  rate: z.number().nullable().optional(),
  archived: z.boolean().optional(),
})

app.get('/', async (c) => {
  const projects = await prisma.project.findMany({
    where: { userId: c.get('userId') },
    orderBy: { name: 'asc' },
  })
  return c.json(projects)
})

// GET /api/projects/stats — total tracked ms per project (all time)
app.get('/stats', async (c) => {
  const rows = await prisma.$queryRaw<{ projectId: string; ms: number }[]>`
    SELECT "projectId", SUM("stop" - "start")::float AS ms
    FROM "TimeEntry"
    WHERE "userId" = ${c.get('userId')} AND "projectId" IS NOT NULL
    GROUP BY "projectId"`
  return c.json(rows)
})

app.post('/', async (c) => {
  const body = ProjectInput.parse(await c.req.json())
  const project = await prisma.project.create({ data: { ...body, userId: c.get('userId') } })
  return c.json(project, 201)
})

app.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = ProjectInput.partial().parse(await c.req.json())
  const { count } = await prisma.project.updateMany({
    where: { id, userId: c.get('userId') },
    data: body,
  })
  if (count === 0) return c.json({ error: 'Not found' }, 404)
  return c.json(await prisma.project.findUnique({ where: { id } }))
})

app.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const userId = c.get('userId')
  // Mirror frontend deleteProject: null projectId on entries and running.
  await prisma.$transaction([
    prisma.timeEntry.updateMany({ where: { userId, projectId: id }, data: { projectId: null } }),
    prisma.runningEntry.updateMany({ where: { userId, projectId: id }, data: { projectId: null } }),
    prisma.project.deleteMany({ where: { id, userId } }),
  ])
  return c.json({ ok: true })
})

export default app
