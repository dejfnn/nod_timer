import { Hono } from 'hono'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../db'
import { authMiddleware, type AuthEnv } from '../auth'

const app = new Hono<AuthEnv>()
app.use('*', authMiddleware)

const StartInput = z.object({
  description: z.string().optional(),
  projectId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
  billable: z.boolean().optional(),
  start: z.number().optional(),
})

// GET /api/running — current running timer or null
app.get('/', async (c) => {
  const running = await prisma.runningEntry.findUnique({ where: { userId: c.get('userId') } })
  return c.json(running)
})

// POST /api/running/start — start (or replace) the running timer
app.post('/start', async (c) => {
  const userId = c.get('userId')
  const body = StartInput.parse(await c.req.json().catch(() => ({})))
  const fields = {
    description: body.description ?? '',
    projectId: body.projectId ?? null,
    tagIds: body.tagIds ?? [],
    billable: body.billable ?? false,
    start: BigInt(body.start ?? Date.now()),
  }
  const running = await prisma.runningEntry.upsert({
    where: { userId },
    create: { userId, ...fields },
    update: fields,
  })
  return c.json(running, 201)
})

// PATCH /api/running — update fields of the running timer in place
app.patch('/', async (c) => {
  const userId = c.get('userId')
  const body = StartInput.partial().parse(await c.req.json())
  const data: Prisma.RunningEntryUpdateManyMutationInput = {}
  if (body.description !== undefined) data.description = body.description
  if (body.projectId !== undefined) data.projectId = body.projectId
  if (body.tagIds !== undefined) data.tagIds = body.tagIds
  if (body.billable !== undefined) data.billable = body.billable
  if (body.start !== undefined) data.start = BigInt(body.start)
  const { count } = await prisma.runningEntry.updateMany({ where: { userId }, data })
  if (count === 0) return c.json({ error: 'No running timer' }, 404)
  return c.json(await prisma.runningEntry.findUnique({ where: { userId } }))
})

// POST /api/running/stop — stop the timer, persist it as a TimeEntry
app.post('/stop', async (c) => {
  const userId = c.get('userId')
  const body = z.object({ stop: z.number().optional() }).parse(await c.req.json().catch(() => ({})))
  const entry = await prisma.$transaction(async (tx) => {
    const running = await tx.runningEntry.findUnique({ where: { userId } })
    if (!running) return null
    // Never persist a negative duration, even with a client-supplied stop.
    const stop = Math.max(body.stop ?? Date.now(), Number(running.start))
    const created = await tx.timeEntry.create({
      data: {
        userId,
        description: running.description,
        projectId: running.projectId,
        tagIds: running.tagIds,
        billable: running.billable,
        start: running.start,
        stop: BigInt(stop),
      },
    })
    await tx.runningEntry.delete({ where: { userId } })
    return created
  })
  if (!entry) return c.json({ error: 'No running timer' }, 404)
  return c.json(entry, 201)
})

// DELETE /api/running — discard the running timer without saving
app.delete('/', async (c) => {
  await prisma.runningEntry.deleteMany({ where: { userId: c.get('userId') } })
  return c.json({ ok: true })
})

export default app
