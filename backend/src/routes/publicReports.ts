import { Hono } from 'hono'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../db'

/**
 * Unauthenticated read-only access to shared reports. The share token is the
 * only credential; everything returned is scoped to the report's owner and
 * the saved date range.
 */
const app = new Hono()

const StoredParams = z.object({
  from: z.number(),
  to: z.number(),
  groupBy: z.enum(['project', 'client', 'tag', 'description', 'day']),
  rounding: z.number(),
  roundingDir: z.enum(['nearest', 'up', 'down']),
  filter: z.enum(['all', 'billable', 'uninvoiced']).optional(),
})

app.get('/:token', async (c) => {
  const report = await prisma.savedReport.findUnique({
    where: { shareToken: c.req.param('token') },
  })
  if (!report) return c.json({ error: 'Not found' }, 404)

  const parsed = StoredParams.safeParse(report.params)
  if (!parsed.success) return c.json({ error: 'Corrupt report parameters' }, 500)
  const params = parsed.data

  const where: Prisma.TimeEntryWhereInput = {
    userId: report.userId,
    start: { gte: BigInt(params.from), lt: BigInt(params.to) },
  }
  const [entries, projects, clients, tags, settings] = await Promise.all([
    prisma.timeEntry.findMany({ where, orderBy: { start: 'asc' } }),
    prisma.project.findMany({
      where: { userId: report.userId },
      select: { id: true, name: true, color: true, clientId: true, rate: true },
    }),
    prisma.client.findMany({
      where: { userId: report.userId },
      select: { id: true, name: true },
    }),
    prisma.tag.findMany({ where: { userId: report.userId }, select: { id: true, name: true } }),
    prisma.settings.findUnique({ where: { userId: report.userId } }),
  ])

  return c.json({
    name: report.name,
    params,
    entries,
    projects,
    clients,
    tags,
    currency: settings?.currency ?? 'CZK',
    defaultRate: settings?.defaultRate ?? 0,
  })
})

export default app
