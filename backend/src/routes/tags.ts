import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../db'
import { authMiddleware, type AuthEnv } from '../auth'

const app = new Hono<AuthEnv>()
app.use('*', authMiddleware)

const TagInput = z.object({ name: z.string().min(1) })

app.get('/', async (c) => {
  const tags = await prisma.tag.findMany({
    where: { userId: c.get('userId') },
    orderBy: { name: 'asc' },
  })
  return c.json(tags)
})

app.post('/', async (c) => {
  const body = TagInput.parse(await c.req.json())
  const tag = await prisma.tag.create({ data: { ...body, userId: c.get('userId') } })
  return c.json(tag, 201)
})

app.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const body = TagInput.partial().parse(await c.req.json())
  const { count } = await prisma.tag.updateMany({
    where: { id, userId: c.get('userId') },
    data: body,
  })
  if (count === 0) return c.json({ error: 'Not found' }, 404)
  return c.json(await prisma.tag.findUnique({ where: { id } }))
})

app.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const userId = c.get('userId')
  // Mirror frontend deleteTag: remove this tag id from all entries and running.
  await prisma.$transaction(async (tx) => {
    const entries = await tx.timeEntry.findMany({
      where: { userId, tagIds: { has: id } },
      select: { id: true, tagIds: true },
    })
    for (const e of entries) {
      await tx.timeEntry.update({
        where: { id: e.id },
        data: { tagIds: e.tagIds.filter((t) => t !== id) },
      })
    }
    const running = await tx.runningEntry.findUnique({ where: { userId } })
    if (running?.tagIds.includes(id)) {
      await tx.runningEntry.update({
        where: { userId },
        data: { tagIds: running.tagIds.filter((t) => t !== id) },
      })
    }
    await tx.tag.deleteMany({ where: { id, userId } })
  })
  return c.json({ ok: true })
})

export default app
