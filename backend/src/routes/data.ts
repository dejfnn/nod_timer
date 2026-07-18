import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../db'
import { authMiddleware, workspaceMiddleware, type WorkspaceEnv } from '../auth'

const app = new Hono<WorkspaceEnv>()
app.use('*', authMiddleware)
app.use('*', workspaceMiddleware)

// GET /api/data/export — full backup of the active workspace's data
app.get('/export', async (c) => {
  const workspaceId = c.get('workspaceId')
  const userId = c.get('userId')
  const [clients, projects, tags, timeEntries, settings] = await Promise.all([
    prisma.client.findMany({ where: { workspaceId } }),
    prisma.project.findMany({ where: { workspaceId } }),
    prisma.tag.findMany({ where: { workspaceId } }),
    prisma.timeEntry.findMany({ where: { workspaceId } }),
    prisma.settings.findUnique({ where: { userId } }),
  ])
  return c.json({
    version: 2,
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
        estimateHours: z.number().nullable().optional(),
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
      invoicedAt: z.number().nullable().optional(),
    }),
  ),
  settings: z
    .array(
      z.object({
        currency: z.string().optional(),
        defaultRate: z.number().optional(),
        weekStart: z.union([z.literal(0), z.literal(1)]).optional(),
        hourFormat: z.union([z.literal('12'), z.literal('24')]).optional(),
        pomodoroMinutes: z.number().int().min(0).max(480).optional(),
      }),
    )
    .optional(),
})

// POST /api/data/import — replaces ALL of the workspace's data (owner only)
app.post('/import', async (c) => {
  if (c.get('workspaceRole') !== 'owner') return c.json({ error: 'Owner role required' }, 403)
  const workspaceId = c.get('workspaceId')
  const userId = c.get('userId')
  const data = ImportSchema.parse(await c.req.json())

  await prisma.$transaction(async (tx) => {
    await tx.timeEntry.deleteMany({ where: { workspaceId } })
    await tx.runningEntry.deleteMany({ where: { workspaceId } })
    await tx.project.deleteMany({ where: { workspaceId } })
    await tx.client.deleteMany({ where: { workspaceId } })
    await tx.tag.deleteMany({ where: { workspaceId } })

    if (data.clients?.length) {
      await tx.client.createMany({
        data: data.clients.map((x) => ({ id: x.id, workspaceId, name: x.name })),
      })
    }
    if (data.projects?.length) {
      await tx.project.createMany({
        data: data.projects.map((p) => ({
          id: p.id,
          workspaceId,
          name: p.name,
          color: p.color,
          clientId: p.clientId ?? null,
          rate: p.rate ?? null,
          archived: p.archived ?? false,
          estimateHours: p.estimateHours ?? null,
        })),
      })
    }
    if (data.tags?.length) {
      await tx.tag.createMany({
        data: data.tags.map((t) => ({ id: t.id, workspaceId, name: t.name })),
      })
    }
    if (data.timeEntries.length) {
      await tx.timeEntry.createMany({
        data: data.timeEntries.map((e) => ({
          id: e.id,
          workspaceId,
          userId,
          description: e.description ?? '',
          projectId: e.projectId ?? null,
          tagIds: e.tagIds ?? [],
          billable: e.billable ?? false,
          start: BigInt(e.start),
          stop: BigInt(e.stop),
          invoicedAt: e.invoicedAt != null ? BigInt(e.invoicedAt) : null,
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

// ---- Toggl Track import ----------------------------------------------------

const PROJECT_PALETTE = [
  '#ffb02e', '#ff6250', '#e14f8a', '#b05cff', '#5c7cff',
  '#2fb8ff', '#1fd3c2', '#41d97b', '#a8e03a', '#9a8c7a',
]

const TogglImportSchema = z.object({
  entries: z
    .array(
      z.object({
        client: z.string().nullable().optional(),
        project: z.string().nullable().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        billable: z.boolean().optional(),
        start: z.number(),
        stop: z.number(),
      }),
    )
    .min(1)
    .max(50_000),
})

// POST /api/data/import-toggl — merge import: creates missing clients/projects/
// tags by name and skips entries that already exist (same start+stop+description).
app.post('/import-toggl', async (c) => {
  const workspaceId = c.get('workspaceId')
  const userId = c.get('userId')
  const { entries } = TogglImportSchema.parse(await c.req.json())
  for (const e of entries) {
    if (e.stop < e.start) return c.json({ error: 'stop must not be before start' }, 400)
  }

  const range = entries.reduce(
    (acc, e) => ({ min: Math.min(acc.min, e.start), max: Math.max(acc.max, e.stop) }),
    { min: Infinity, max: -Infinity },
  )

  const result = await prisma.$transaction(
    async (tx) => {
      // sequential on purpose — concurrent queries are not supported inside
      // Prisma interactive transactions
      const clients = await tx.client.findMany({ where: { workspaceId } })
      const projects = await tx.project.findMany({ where: { workspaceId } })
      const tags = await tx.tag.findMany({ where: { workspaceId } })
      const existing = await tx.timeEntry.findMany({
        where: { workspaceId, start: { gte: BigInt(range.min), lte: BigInt(range.max) } },
        select: { description: true, start: true, stop: true },
      })

      const clientByName = new Map(clients.map((x) => [x.name.toLowerCase(), x.id]))
      const projectByName = new Map(projects.map((x) => [x.name.toLowerCase(), x.id]))
      const tagByName = new Map(tags.map((x) => [x.name.toLowerCase(), x.id]))
      const existingKeys = new Set(
        existing.map((e) => `${e.start}:${e.stop}:${e.description}`),
      )

      let createdClients = 0
      let createdProjects = 0
      let createdTags = 0

      const resolveClient = async (name: string): Promise<string> => {
        const key = name.toLowerCase()
        const found = clientByName.get(key)
        if (found) return found
        const created = await tx.client.create({ data: { workspaceId, name } })
        clientByName.set(key, created.id)
        createdClients++
        return created.id
      }

      const resolveProject = async (name: string, clientName: string | null): Promise<string> => {
        const key = name.toLowerCase()
        const found = projectByName.get(key)
        if (found) return found
        const created = await tx.project.create({
          data: {
            workspaceId,
            name,
            color:
              PROJECT_PALETTE[(projects.length + createdProjects) % PROJECT_PALETTE.length] ??
              '#5c7cff',
            clientId: clientName ? await resolveClient(clientName) : null,
          },
        })
        projectByName.set(key, created.id)
        createdProjects++
        return created.id
      }

      const resolveTag = async (name: string): Promise<string> => {
        const key = name.toLowerCase()
        const found = tagByName.get(key)
        if (found) return found
        const created = await tx.tag.create({ data: { workspaceId, name } })
        tagByName.set(key, created.id)
        createdTags++
        return created.id
      }

      const toInsert: {
        workspaceId: string
        userId: string
        description: string
        projectId: string | null
        tagIds: string[]
        billable: boolean
        start: bigint
        stop: bigint
      }[] = []
      let skippedDuplicates = 0

      for (const e of entries) {
        const description = e.description ?? ''
        const key = `${e.start}:${e.stop}:${description}`
        if (existingKeys.has(key)) {
          skippedDuplicates++
          continue
        }
        existingKeys.add(key)
        const tagIds: string[] = []
        for (const t of e.tags ?? []) {
          const id = await resolveTag(t)
          if (!tagIds.includes(id)) tagIds.push(id)
        }
        toInsert.push({
          workspaceId,
          userId,
          description,
          projectId: e.project ? await resolveProject(e.project, e.client ?? null) : null,
          tagIds,
          billable: e.billable ?? false,
          start: BigInt(e.start),
          stop: BigInt(e.stop),
        })
      }

      if (toInsert.length > 0) await tx.timeEntry.createMany({ data: toInsert })

      return {
        imported: toInsert.length,
        skippedDuplicates,
        createdClients,
        createdProjects,
        createdTags,
      }
    },
    { timeout: 120_000, maxWait: 10_000 },
  )

  return c.json(result)
})

export default app
