import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../db'
import { authMiddleware, workspaceMiddleware, type WorkspaceEnv } from '../auth'

const app = new Hono<WorkspaceEnv>()
app.use('*', authMiddleware)
app.use('*', workspaceMiddleware)

const ProjectInput = z.object({
  name: z.string().min(1),
  color: z.string().min(1),
  clientId: z.string().nullable().optional(),
  rate: z.number().nullable().optional(),
  archived: z.boolean().optional(),
  estimateHours: z.number().positive().nullable().optional(),
})

app.get('/', async (c) => {
  const projects = await prisma.project.findMany({
    where: { workspaceId: c.get('workspaceId') },
    orderBy: { name: 'asc' },
  })
  return c.json(projects)
})

// GET /api/projects/stats — total tracked ms per project (all time, workspace-wide)
app.get('/stats', async (c) => {
  const rows = await prisma.$queryRaw<{ projectId: string; ms: number }[]>`
    SELECT "projectId", SUM("stop" - "start")::float AS ms
    FROM "TimeEntry"
    WHERE "workspaceId" = ${c.get('workspaceId')} AND "projectId" IS NOT NULL
    GROUP BY "projectId"`
  return c.json(rows)
})

app.post('/', async (c) => {
  const body = ProjectInput.parse(await c.req.json())
  const project = await prisma.project.create({
    data: { ...body, workspaceId: c.get('workspaceId') },
  })
  return c.json(project, 201)
})

app.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = ProjectInput.partial().parse(await c.req.json())
  const { count } = await prisma.project.updateMany({
    where: { id, workspaceId: c.get('workspaceId') },
    data: body,
  })
  if (count === 0) return c.json({ error: 'Not found' }, 404)
  return c.json(await prisma.project.findUnique({ where: { id } }))
})

app.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const workspaceId = c.get('workspaceId')
  // Mirror frontend deleteProject: null projectId on entries and running timers.
  await prisma.$transaction([
    prisma.timeEntry.updateMany({ where: { workspaceId, projectId: id }, data: { projectId: null } }),
    prisma.runningEntry.updateMany({ where: { workspaceId, projectId: id }, data: { projectId: null } }),
    prisma.project.deleteMany({ where: { id, workspaceId } }),
  ])
  return c.json({ ok: true })
})

export default app
