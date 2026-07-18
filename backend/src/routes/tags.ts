import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../db'
import { authMiddleware, workspaceMiddleware, type WorkspaceEnv } from '../auth'

const app = new Hono<WorkspaceEnv>()
app.use('*', authMiddleware)
app.use('*', workspaceMiddleware)

const TagInput = z.object({ name: z.string().min(1) })

app.get('/', async (c) => {
  const tags = await prisma.tag.findMany({
    where: { workspaceId: c.get('workspaceId') },
    orderBy: { name: 'asc' },
  })
  return c.json(tags)
})

// GET /api/tags/stats — number of entries using each tag (all time, workspace-wide)
app.get('/stats', async (c) => {
  const rows = await prisma.$queryRaw<{ tagId: string; count: number }[]>`
    SELECT t.tag AS "tagId", COUNT(*)::int AS count
    FROM "TimeEntry", unnest("tagIds") AS t(tag)
    WHERE "workspaceId" = ${c.get('workspaceId')}
    GROUP BY t.tag`
  return c.json(rows)
})

app.post('/', async (c) => {
  const body = TagInput.parse(await c.req.json())
  const tag = await prisma.tag.create({ data: { ...body, workspaceId: c.get('workspaceId') } })
  return c.json(tag, 201)
})

app.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = TagInput.partial().parse(await c.req.json())
  const { count } = await prisma.tag.updateMany({
    where: { id, workspaceId: c.get('workspaceId') },
    data: body,
  })
  if (count === 0) return c.json({ error: 'Not found' }, 404)
  return c.json(await prisma.tag.findUnique({ where: { id } }))
})

app.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const workspaceId = c.get('workspaceId')
  // Remove the tag id from all entries and running timers in this workspace.
  await prisma.$transaction(async (tx) => {
    const entries = await tx.timeEntry.findMany({
      where: { workspaceId, tagIds: { has: id } },
      select: { id: true, tagIds: true },
    })
    for (const e of entries) {
      await tx.timeEntry.update({
        where: { id: e.id },
        data: { tagIds: e.tagIds.filter((t) => t !== id) },
      })
    }
    const running = await tx.runningEntry.findMany({
      where: { workspaceId, tagIds: { has: id } },
    })
    for (const r of running) {
      await tx.runningEntry.update({
        where: { id: r.id },
        data: { tagIds: r.tagIds.filter((t) => t !== id) },
      })
    }
    await tx.tag.deleteMany({ where: { id, workspaceId } })
  })
  return c.json({ ok: true })
})

export default app
