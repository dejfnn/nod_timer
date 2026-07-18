import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { ZodError } from 'zod'

// Serialize BigInt (ms timestamps) as JS numbers in JSON responses.
;(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function (this: bigint) {
  return Number(this)
}

import authRoutes from './routes/auth'
import clientsRoutes from './routes/clients'
import projectsRoutes from './routes/projects'
import tagsRoutes from './routes/tags'
import entriesRoutes from './routes/timeEntries'
import runningRoutes from './routes/running'
import settingsRoutes from './routes/settings'
import dataRoutes from './routes/data'
import reportsRoutes from './routes/reports'
import publicReportsRoutes from './routes/publicReports'

const app = new Hono()

app.use('*', logger())

const corsOrigin = process.env.CORS_ORIGIN ?? '*'
const allowedOrigins = corsOrigin.split(',').map((s) => s.trim())
app.use(
  '*',
  cors({
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
)

app.get('/', (c) => c.json({ name: 'timeflow-backend', ok: true }))
app.get('/healthz', (c) => c.json({ ok: true }))

app.route('/auth', authRoutes)
app.route('/api/clients', clientsRoutes)
app.route('/api/projects', projectsRoutes)
app.route('/api/tags', tagsRoutes)
app.route('/api/entries', entriesRoutes)
app.route('/api/running', runningRoutes)
app.route('/api/settings', settingsRoutes)
app.route('/api/data', dataRoutes)
app.route('/api/reports', reportsRoutes)
app.route('/public/reports', publicReportsRoutes)

app.onError((err, c) => {
  if (err instanceof ZodError) {
    return c.json({ error: 'Validation failed', issues: err.issues }, 400)
  }
  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})

const port = Number(process.env.PORT ?? 8080)
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
  console.log(`TimeFlow backend listening on :${info.port}`)
})
