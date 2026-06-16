// Dev-only visual smoke test: seeds demo data, walks all pages, saves screenshots.
import { chromium } from 'playwright'

const BASE = 'http://localhost:5180'
const OUT = 'scripts/shots'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`)
})

await page.goto(BASE, { waitUntil: 'networkidle' })

// seed demo data through the app's own IndexedDB
await page.evaluate(async () => {
  const open = indexedDB.open('timeflow')
  const dbi = await new Promise((res, rej) => {
    open.onsuccess = () => res(open.result)
    open.onerror = () => rej(open.error)
  })
  const uid = () => crypto.randomUUID()
  const now = Date.now()
  const day = 86_400_000
  const hour = 3_600_000
  const clients = [
    { id: 'c1', name: 'Klenota' },
    { id: 'c2', name: 'Acme Corp' },
  ]
  const projects = [
    { id: 'p1', name: 'SEO audit', color: '#ffb02e', clientId: 'c1', rate: 1200, archived: false },
    { id: 'p2', name: 'Web redesign', color: '#5c7cff', clientId: 'c1', rate: null, archived: false },
    { id: 'p3', name: 'Internal tools', color: '#1fd3c2', clientId: 'c2', rate: 900, archived: false },
  ]
  const tags = [
    { id: 't1', name: 'deep work' },
    { id: 't2', name: 'meeting' },
  ]
  const entries = []
  for (let d = 0; d < 12; d++) {
    const base = new Date(now - d * day)
    base.setHours(9, 0, 0, 0)
    let t = base.getTime()
    const count = 2 + (d % 3)
    for (let i = 0; i < count; i++) {
      const dur = (0.5 + ((d + i) % 4) * 0.75) * hour
      entries.push({
        id: uid(),
        description: ['Keyword clustering', 'Homepage layout', 'Sprint planning', 'Content brief', 'Bug triage'][(d + i) % 5],
        projectId: projects[(d + i) % 3].id,
        tagIds: i % 2 ? ['t2'] : ['t1'],
        billable: (d + i) % 2 === 0,
        start: t,
        stop: t + dur,
      })
      t += dur + 0.25 * hour
    }
  }
  const tx = dbi.transaction(['clients', 'projects', 'tags', 'timeEntries', 'running'], 'readwrite')
  for (const c of clients) tx.objectStore('clients').put(c)
  for (const p of projects) tx.objectStore('projects').put(p)
  for (const t of tags) tx.objectStore('tags').put(t)
  for (const e of entries) tx.objectStore('timeEntries').put(e)
  tx.objectStore('running').put({
    id: 'current',
    description: 'Designing the new reports page',
    projectId: 'p2',
    tagIds: ['t1'],
    billable: true,
    start: now - 47 * 60_000,
  })
  await new Promise((res) => (tx.oncomplete = res))
  dbi.close()
})

const pages = ['/', '/reports', '/calendar', '/projects', '/clients', '/tags', '/settings']
for (const path of pages) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  const name = path === '/' ? 'timer' : path.slice(1)
  await page.screenshot({ path: `${OUT}/${name}.png` })
}

await browser.close()
if (errors.length) {
  console.log('ERRORS:\n' + errors.join('\n'))
  process.exit(1)
}
console.log('OK — no console/page errors')
