import { Hono } from 'hono'
import { prisma } from '../db'
import { authMiddleware, type AuthEnv } from '../auth'

/** Invites addressed to the signed-in user's email. */
const app = new Hono<AuthEnv>()
app.use('*', authMiddleware)

async function myEmail(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
  return user?.email ?? null
}

// GET /api/invites — pending invites for me
app.get('/', async (c) => {
  const email = await myEmail(c.get('userId'))
  if (!email) return c.json([])
  const invites = await prisma.workspaceInvite.findMany({
    where: { email },
    include: { workspace: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return c.json(
    invites.map((i) => ({ id: i.id, workspaceId: i.workspaceId, workspaceName: i.workspace.name })),
  )
})

// POST /api/invites/:id/accept — join the workspace
app.post('/:id/accept', async (c) => {
  const userId = c.get('userId')
  const email = await myEmail(userId)
  const invite = await prisma.workspaceInvite.findUnique({ where: { id: c.req.param('id') } })
  if (!invite || !email || invite.email.toLowerCase() !== email.toLowerCase()) {
    return c.json({ error: 'Not found' }, 404)
  }
  await prisma.$transaction([
    prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } },
      create: { workspaceId: invite.workspaceId, userId, role: 'member' },
      update: {},
    }),
    prisma.workspaceInvite.delete({ where: { id: invite.id } }),
  ])
  return c.json({ ok: true, workspaceId: invite.workspaceId })
})

// DELETE /api/invites/:id — decline
app.delete('/:id', async (c) => {
  const email = await myEmail(c.get('userId'))
  if (!email) return c.json({ error: 'Not found' }, 404)
  await prisma.workspaceInvite.deleteMany({
    where: { id: c.req.param('id'), email: { equals: email, mode: 'insensitive' } },
  })
  return c.json({ ok: true })
})

export default app
