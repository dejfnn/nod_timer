import { Hono } from 'hono'
import { z } from 'zod'
import { prisma } from '../db'
import { authMiddleware, type AuthEnv } from '../auth'

const app = new Hono<AuthEnv>()
app.use('*', authMiddleware)

const NameInput = z.object({ name: z.string().min(1).max(100) })

/** Ensure the current user owns the given workspace; returns null otherwise. */
async function requireOwner(workspaceId: string, userId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  })
  return member?.role === 'owner' ? member : null
}

// GET /api/workspaces — the user's workspaces with role and member count
app.get('/', async (c) => {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: c.get('userId') },
    include: { workspace: { include: { _count: { select: { members: true } } } } },
    orderBy: { createdAt: 'asc' },
  })
  return c.json(
    memberships.map((m) => ({
      id: m.workspaceId,
      name: m.workspace.name,
      role: m.role,
      memberCount: m.workspace._count.members,
    })),
  )
})

app.post('/', async (c) => {
  const { name } = NameInput.parse(await c.req.json())
  const workspace = await prisma.workspace.create({
    data: { name, members: { create: { userId: c.get('userId'), role: 'owner' } } },
  })
  return c.json({ id: workspace.id, name: workspace.name, role: 'owner', memberCount: 1 }, 201)
})

app.patch('/:id', async (c) => {
  const id = c.req.param('id')
  if (!(await requireOwner(id, c.get('userId')))) return c.json({ error: 'Forbidden' }, 403)
  const { name } = NameInput.parse(await c.req.json())
  await prisma.workspace.update({ where: { id }, data: { name } })
  return c.json({ ok: true })
})

// GET /api/workspaces/:id/members
app.get('/:id/members', async (c) => {
  const id = c.req.param('id')
  const self = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: id, userId: c.get('userId') } },
  })
  if (!self) return c.json({ error: 'Forbidden' }, 403)
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId: id },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return c.json(members.map((m) => ({ userId: m.userId, email: m.user.email, role: m.role })))
})

// DELETE /api/workspaces/:id/members/:userId — owner removes a member, or a
// member leaves (removing yourself). The last owner cannot leave.
app.delete('/:id/members/:userId', async (c) => {
  const workspaceId = c.req.param('id')
  const targetId = c.req.param('userId')
  const selfId = c.get('userId')

  if (workspaceId === targetId) {
    return c.json({ error: 'Cannot remove the personal workspace owner' }, 400)
  }
  if (targetId !== selfId && !(await requireOwner(workspaceId, selfId))) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  const target = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: targetId } },
  })
  if (!target) return c.json({ error: 'Not found' }, 404)
  if (target.role === 'owner') {
    const owners = await prisma.workspaceMember.count({ where: { workspaceId, role: 'owner' } })
    if (owners <= 1) return c.json({ error: 'The last owner cannot be removed' }, 400)
  }
  await prisma.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId, userId: targetId } },
  })
  return c.json({ ok: true })
})

// POST /api/workspaces/:id/invites — invite a user by email (owner only)
app.post('/:id/invites', async (c) => {
  const workspaceId = c.req.param('id')
  if (!(await requireOwner(workspaceId, c.get('userId')))) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  const { email } = z.object({ email: z.string().email() }).parse(await c.req.json())
  const user = await prisma.user.findUnique({ where: { email } })
  if (user) {
    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
    })
    if (existing) return c.json({ error: 'Already a member' }, 409)
  }
  const invite = await prisma.workspaceInvite.upsert({
    where: { workspaceId_email: { workspaceId, email } },
    create: { workspaceId, email },
    update: {},
  })
  return c.json(invite, 201)
})

// GET /api/workspaces/:id/invites — pending invites of a workspace (owner only)
app.get('/:id/invites', async (c) => {
  const workspaceId = c.req.param('id')
  if (!(await requireOwner(workspaceId, c.get('userId')))) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  return c.json(await prisma.workspaceInvite.findMany({ where: { workspaceId } }))
})

// DELETE /api/workspaces/:id/invites/:inviteId — revoke (owner only)
app.delete('/:id/invites/:inviteId', async (c) => {
  const workspaceId = c.req.param('id')
  if (!(await requireOwner(workspaceId, c.get('userId')))) {
    return c.json({ error: 'Forbidden' }, 403)
  }
  await prisma.workspaceInvite.deleteMany({
    where: { id: c.req.param('inviteId'), workspaceId },
  })
  return c.json({ ok: true })
})

export default app
