import { Hono } from 'hono'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../db'
import { authMiddleware, type AuthEnv } from '../auth'

const app = new Hono<AuthEnv>()
app.use('*', authMiddleware)

const EntryInput = z.object({
  description: z.string().optional(),
  projectId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
  billable: z.boolean().optional(),
  start: z.number(),
  stop: z.number(),
})

// GET /api/entries?from=<ms>&to=<ms>&limit=<n>&beforeStart=<ms>&beforeId=<id>
// Range and keyset cursor are optional (returns all if omitted). The cursor is
// a (start, id) pair so pagination survives deletion of the boundary entry.
app.get('/', async (c) => {
  const from = c.req.query('from')
  const to = c.req.query('to')
  const limit = c.req.query('limit')
  const beforeStart = c.req.query('beforeStart')
  const beforeId = c.req.query('beforeId')

  const where: Prisma.TimeEntryWhereInput = { userId: c.get('userId') }
  if (from || to) {
    where.start = {}
    if (from) (where.start as Prisma.BigIntFilter).gte = BigInt(from)
    if (to) (where.start as Prisma.BigIntFilter).lt = BigInt(to)
  }
  if (beforeStart) {
    const bs = BigInt(beforeStart)
    where.AND = [
      {
        OR: beforeId
          ? [{ start: { lt: bs } }, { start: bs, id: { lt: beforeId } }]
          : [{ start: { lt: bs } }],
      },
    ]
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    orderBy: [{ start: 'desc' }, { id: 'desc' }],
    ...(limit ? { take: Math.min(Number(limit), 500) } : {}),
  })
  return c.json(entries)
})

app.post('/', async (c) => {
  const body = EntryInput.parse(await c.req.json())
  if (body.stop < body.start) return c.json({ error: 'stop must not be before start' }, 400)
  const entry = await prisma.timeEntry.create({
    data: {
      userId: c.get('userId'),
      description: body.description ?? '',
      projectId: body.projectId ?? null,
      tagIds: body.tagIds ?? [],
      billable: body.billable ?? false,
      start: BigInt(body.start),
      stop: BigInt(body.stop),
    },
  })
  return c.json(entry, 201)
})

app.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = EntryInput.partial().parse(await c.req.json())
  if (body.start !== undefined || body.stop !== undefined) {
    const existing = await prisma.timeEntry.findFirst({
      where: { id, userId: c.get('userId') },
      select: { start: true, stop: true },
    })
    if (!existing) return c.json({ error: 'Not found' }, 404)
    const start = body.start ?? Number(existing.start)
    const stop = body.stop ?? Number(existing.stop)
    if (stop < start) return c.json({ error: 'stop must not be before start' }, 400)
  }
  const data: Prisma.TimeEntryUncheckedUpdateManyInput = {}
  if (body.description !== undefined) data.description = body.description
  if (body.projectId !== undefined) data.projectId = body.projectId
  if (body.tagIds !== undefined) data.tagIds = body.tagIds
  if (body.billable !== undefined) data.billable = body.billable
  if (body.start !== undefined) data.start = BigInt(body.start)
  if (body.stop !== undefined) data.stop = BigInt(body.stop)
  const { count } = await prisma.timeEntry.updateMany({
    where: { id, userId: c.get('userId') },
    data,
  })
  if (count === 0) return c.json({ error: 'Not found' }, 404)
  return c.json(await prisma.timeEntry.findUnique({ where: { id } }))
})

app.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const { count } = await prisma.timeEntry.deleteMany({ where: { id, userId: c.get('userId') } })
  if (count === 0) return c.json({ error: 'Not found' }, 404)
  return c.json({ ok: true })
})

export default app
