import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../db'
import { authMiddleware, type AuthEnv } from '../auth'

const app = new Hono<AuthEnv>()
app.use('*', authMiddleware)

// GET /api/data/export — full backup of the user's data (mirrors frontend export).
app.get('/export', async (c) => {
  const userId = c.get('userId')
  const [clients, projects, tags, timeEntries, settings] = await Promise.all([
    prisma.client.findMany({ where: { userId } }),
    prisma.project.findMany({ where: { userId } }),
    prisma.tag.findMany({ where: { userId } }),
    prisma.timeEntry.findMany({ where: { userId } }),
    prisma.settings.findUnique({ where: { userId } }),
  ])
  return c.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    clients,
    projects,
    tags,
    timeEntries,
    settings: settings ? [settings] : [],
  })
})

const ImportSchema = z.object({
  clients: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  projects: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        color: z.string(),
        clientId: z.string().nullable().optional(),
        rate: z.number().nullable().optional(),
        archived: z.boolean().optional(),
      }),
    )
    .optional(),
  tags: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  timeEntries: z.array(
    z.object({
      id: z.string(),
      description: z.string().optional(),
      projectId: z.string().nullable().optional(),
      tagIds: z.array(z.string()).optional(),
      billable: z.boolean().optional(),
      start: z.number(),
      stop: z.number(),
    }),
  ),
  settings: z
    .array(
      z.object({
        currency: z.string().optional(),
        defaultRate: z.number().optional(),
        weekStart: z.union([z.literal(0), z.literal(1)]).optional(),
        hourFormat: z.union([z.literal('12'), z.literal('24')]).optional(),
      }),
    )
    .optional(),
})

// POST /api/data/import — replaces ALL of the user's data (mirrors frontend import).
app.post('/import', async (c) => {
  const userId = c.get('userId')
  const data = ImportSchema.parse(await c.req.json())

  await prisma.$transaction(async (tx) => {
    await tx.timeEntry.deleteMany({ where: { userId } })
    await tx.runningEntry.deleteMany({ where: { userId } })
    await tx.project.deleteMany({ where: { userId } })
    await tx.client.deleteMany({ where: { userId } })
    await tx.tag.deleteMany({ where: { userId } })

    if (data.clients?.length) {
      await tx.client.createMany({
        data: data.clients.map((x) => ({ id: x.id, userId, name: x.name })),
      })
    }
    if (data.projects?.length) {
      await tx.project.createMany({
        data: data.projects.map((p) => ({
          id: p.id,
          userId,
          name: p.name,
          color: p.color,
          clientId: p.clientId ?? null,
          rate: p.rate ?? null,
          archived: p.archived ?? false,
        })),
      })
    }
    if (data.tags?.length) {
      await tx.tag.createMany({ data: data.tags.map((t) => ({ id: t.id, userId, name: t.name })) })
    }
    if (data.timeEntries.length) {
      await tx.timeEntry.createMany({
        data: data.timeEntries.map((e) => ({
          id: e.id,
          userId,
          description: e.description ?? '',
          projectId: e.projectId ?? null,
          tagIds: e.tagIds ?? [],
          billable: e.billable ?? false,
          start: BigInt(e.start),
          stop: BigInt(e.stop),
        })),
      })
    }

    const s = data.settings?.[0]
    await tx.settings.upsert({
      where: { userId },
      create: { userId, ...(s ?? {}) },
      update: s ?? {},
    })
  })

  return c.json({ ok: true })
})

export default app
