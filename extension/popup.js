/* TimeFlow toolbar popup: sign in once, then start/stop the running timer. */

const $ = (id) => document.getElementById(id)

const state = {
  apiUrl: '',
  token: '',
  running: null,
  tick: null,
  descTimeout: null,
}

const fmtDuration = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

async function api(path, options = {}) {
  const res = await fetch(state.apiUrl + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${state.token}`,
      ...(options.headers ?? {}),
    },
  })
  if (res.status === 401) {
    await chrome.storage.local.remove('token')
    state.token = ''
    showView('login')
    throw new Error('Session expired — sign in again.')
  }
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.json()
      if (body.error) message = body.error
    } catch {
      /* keep statusText */
    }
    throw new Error(message)
  }
  return res.json()
}

function showView(name) {
  $('login').classList.toggle('hidden', name !== 'login')
  $('timer').classList.toggle('hidden', name !== 'timer')
}

function showError(id, message) {
  const el = $(id)
  el.textContent = message ?? ''
  el.classList.toggle('hidden', !message)
}

function renderRunning() {
  const running = state.running
  $('startBtn').classList.toggle('hidden', Boolean(running))
  $('stopBtn').classList.toggle('hidden', !running)
  $('elapsed').classList.toggle('hidden', !running)
  clearInterval(state.tick)
  if (running) {
    $('description').value = running.description
    const update = () => {
      $('elapsed').textContent = fmtDuration(Date.now() - running.start)
    }
    update()
    state.tick = setInterval(update, 1000)
  } else {
    $('description').value = ''
  }
}

async function refresh() {
  try {
    state.running = await api('/api/running')
    showError('timerError', null)
  } catch (e) {
    showError('timerError', e.message)
  }
  renderRunning()
}

async function start() {
  try {
    state.running = await api('/api/running/start', {
      method: 'POST',
      body: JSON.stringify({ description: $('description').value.trim() }),
    })
    showError('timerError', null)
  } catch (e) {
    showError('timerError', e.message)
  }
  renderRunning()
}

async function stop() {
  try {
    await api('/api/running/stop', { method: 'POST', body: '{}' })
    state.running = null
    showError('timerError', null)
  } catch (e) {
    showError('timerError', e.message)
  }
  renderRunning()
}

async function login() {
  const apiUrl = $('apiUrl').value.trim().replace(/\/$/, '')
  const email = $('email').value.trim()
  const password = $('password').value
  if (!apiUrl || !email || !password) return
  try {
    const res = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error ?? 'Sign-in failed')
    }
    const data = await res.json()
    state.apiUrl = apiUrl
    state.token = data.token
    await chrome.storage.local.set({ apiUrl, token: data.token })
    showView('timer')
    await refresh()
  } catch (e) {
    showError('loginError', e.message)
  }
}

async function logout() {
  await chrome.storage.local.remove('token')
  state.token = ''
  showView('login')
}

$('loginBtn').addEventListener('click', () => void login())
$('password').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') void login()
})
$('startBtn').addEventListener('click', () => void start())
$('stopBtn').addEventListener('click', () => void stop())
$('logoutBtn').addEventListener('click', () => void logout())
$('description').addEventListener('input', () => {
  if (!state.running) return
  clearTimeout(state.descTimeout)
  state.descTimeout = setTimeout(() => {
    void api('/api/running', {
      method: 'PATCH',
      body: JSON.stringify({ description: $('description').value }),
    }).catch(() => {})
  }, 400)
})
$('description').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !state.running) void start()
})

chrome.storage.local.get(['apiUrl', 'token']).then((stored) => {
  state.apiUrl = stored.apiUrl ?? ''
  state.token = stored.token ?? ''
  if (stored.apiUrl) $('apiUrl').value = stored.apiUrl
  if (state.token) {
    showView('timer')
    void refresh()
  } else {
    showView('login')
  }
})
