import { randomBytes } from 'node:crypto'
import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../db'
import { authMiddleware, workspaceMiddleware, type WorkspaceEnv } from '../auth'

const app = new Hono<WorkspaceEnv>()
app.use('*', authMiddleware)
app.use('*', workspaceMiddleware)

const ReportParams = z.object({
  from: z.number(),
  to: z.number(),
  groupBy: z.enum(['project', 'client', 'tag', 'description', 'day', 'member']),
  rounding: z.number(),
  roundingDir: z.enum(['nearest', 'up', 'down']),
  filter: z.enum(['all', 'billable', 'uninvoiced']).optional(),
})

const ReportInput = z.object({
  name: z.string().min(1).max(100),
  params: ReportParams,
})

app.get('/', async (c) => {
  const reports = await prisma.savedReport.findMany({
    where: { userId: c.get('userId'), workspaceId: c.get('workspaceId') },
    orderBy: { createdAt: 'desc' },
  })
  return c.json(reports)
})

app.post('/', async (c) => {
  const body = ReportInput.parse(await c.req.json())
  const report = await prisma.savedReport.create({
    data: {
      userId: c.get('userId'),
      workspaceId: c.get('workspaceId'),
      name: body.name,
      params: body.params,
    },
  })
  return c.json(report, 201)
})

app.delete('/:id', async (c) => {
  const { count } = await prisma.savedReport.deleteMany({
    where: { id: c.req.param('id'), userId: c.get('userId') },
  })
  if (count === 0) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true })
})

// POST /api/reports/:id/share — enable a public share link (idempotent)
app.post('/:id/share', async (c) => {
  const id = c.req.param('id')
  const report = await prisma.savedReport.findFirst({
    where: { id, userId: c.get('userId') },
  })
  if (!report) return c.json({ error: 'Not found' }, 404)
  if (report.shareToken) return c.json(report)
  const updated = await prisma.savedReport.update({
    where: { id },
    data: { shareToken: randomBytes(16).toString('hex') },
  })
  return c.json(updated)
})

// DELETE /api/reports/:id/share — revoke the public link
app.delete('/:id/share', async (c) => {
  const { count } = await prisma.savedReport.updateMany({
    where: { id: c.req.param('id'), userId: c.get('userId') },
    data: { shareToken: null },
  })
  if (count === 0) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true })
})

export default app
