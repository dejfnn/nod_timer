/* TimeFlow service worker: offline shell + read-only API cache. */
const CACHE = 'timeflow-v1'
const PRECACHE = ['/', '/manifest.webmanifest', '/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  const sameOrigin = url.origin === self.location.origin

  // SPA navigations: network first, fall back to the cached shell.
  if (sameOrigin && req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put('/', copy))
          return res
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  // Hashed build assets and static files: stale-while-revalidate.
  if (sameOrigin) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req)
        const fetching = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone())
            return res
          })
          .catch(() => cached)
        return cached ?? fetching
      }),
    )
    return
  }

  // API reads (usually a different origin): network first, cached fallback so
  // the app still shows data offline. Mutations are not queued.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/public/')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put(req, copy))
          }
          return res
        })
        .catch(async () => {
          const cached = await caches.match(req)
          return (
            cached ??
            new Response(JSON.stringify({ error: 'You are offline.' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            })
          )
        }),
    )
  }
})
