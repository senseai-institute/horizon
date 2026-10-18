/**
 * Production server. Serves the Vite build from dist/ on $PORT and falls back
 * to index.html for any path it does not recognise, which keeps deep links
 * working whatever router mode the app is using.
 *
 * Three small extras, all optional, all from environment variables:
 *
 *   PASSCODE           locks the whole app behind one passcode and a cookie.
 *   BROKER, BANK       mock (default) | alpaca, plaid — which adapters Money uses.
 *                      Served on /api/status; the browser picks its adapters from it.
 *   ANTHROPIC_API_KEY  lets /api/parse ask Claude to rewrite a free-text money
 *                      command into the app's grammar. Without it the app parses
 *                      offline and /api/parse says so.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'

const root = resolve(process.cwd(), 'dist')
const port = Number(process.env.PORT) || 3000
const host = '0.0.0.0'
const PASSCODE = process.env.PASSCODE ?? ''
const BROKER = process.env.BROKER === 'alpaca' ? 'alpaca' : 'mock'
const BANK = process.env.BANK === 'plaid' ? 'plaid' : 'mock'
const MODEL = 'claude-opus-5-5'

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
}

if (!existsSync(join(root, 'index.html'))) {
  console.error(`No build found at ${root}. Run "npm run build" first.`)
  process.exit(1)
}

const send = (res, file, status = 200) => {
  const type = types[extname(file)] ?? 'application/octet-stream'
  const immutable = file.includes('/assets/')
  res.writeHead(status, {
    'content-type': type,
    'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  })
  createReadStream(file).pipe(res)
}

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

const readBody = (req, limit = 16_384) =>
  new Promise((ok, fail) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > limit) {
        fail(new Error('too large'))
        req.destroy()
      } else chunks.push(c)
    })
    req.on('end', () => ok(Buffer.concat(chunks).toString('utf8')))
    req.on('error', fail)
  })

/* ------------------------------------------------------------------ */
/* Passcode                                                             */
/* ------------------------------------------------------------------ */

const COOKIE = 'hz_session'
const token = PASSCODE ? createHmac('sha256', PASSCODE).update('horizon-session-v1').digest('hex') : ''
const failures = new Map()

function sameString(a, b) {
  const x = Buffer.from(String(a))
  const y = Buffer.from(String(b))
  return x.length === y.length && timingSafeEqual(x, y)
}

function signedIn(req) {
  if (!PASSCODE) return true
  const cookie = (req.headers.cookie ?? '').split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))
  return Boolean(cookie) && sameString(cookie.slice(COOKIE.length + 1), token)
}

const loginPage = (error = '') => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Horizon</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fbfaf7;color:#1f1e1b;font:16px/1.5 ui-sans-serif,system-ui,-apple-system,sans-serif}
form{display:flex;flex-direction:column;gap:12px;width:min(320px,calc(100vw - 32px))}
input,button{font:inherit;font-size:17px;padding:11px 13px;border-radius:6px}
input{border:1px solid #d2ccbc;background:#fff;letter-spacing:.1em}
button{border:0;background:#2c4a45;color:#fff;cursor:pointer}
p{margin:0;color:#9e5e4c;font-size:14px}
</style></head>
<body><form method="post" action="/login"><strong>Horizon</strong>
<input type="password" name="passcode" placeholder="Passcode" autocomplete="current-password" autofocus required>
<button type="submit">Open</button>${error ? `<p>${error}</p>` : ''}</form></body></html>`

async function login(req, res) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() ?? req.socket.remoteAddress ?? '?'
  const f = failures.get(ip) ?? { n: 0, until: 0 }
  if (f.until > Date.now()) {
    res.writeHead(429, { 'content-type': 'text/html; charset=utf-8' })
    res.end(loginPage('Too many tries. Wait a few minutes.'))
    return
  }
  const body = await readBody(req).catch(() => '')
  const given = new URLSearchParams(body).get('passcode') ?? ''
  if (!sameString(given, PASSCODE)) {
    f.n += 1
    if (f.n >= 8) Object.assign(f, { n: 0, until: Date.now() + 15 * 60_000 })
    failures.set(ip, f)
    res.writeHead(401, { 'content-type': 'text/html; charset=utf-8' })
    res.end(loginPage('That isn’t it.'))
    return
  }
  failures.delete(ip)
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''
  res.writeHead(303, { location: '/', 'set-cookie': `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 30}${secure}` })
  res.end()
}

/* ------------------------------------------------------------------ */
/* Claude parser                                                        */
/* ------------------------------------------------------------------ */

let client = null
async function anthropic() {
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (!client) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    client = new Anthropic()
  }
  return client
}

const SYSTEM = `You turn one line a person typed about their money into exactly one command in a fixed grammar, or into nothing.

The grammar (lower case, commas as shown):
- A bet on a theme: "<long|short> <theme>, <horizon>, $<amount>" with an optional " exit -<n>%". long = it goes up, short = it goes down. Horizon is like 6mo, 18mo, 2y, 2028, or "jun 2027".
- "cancel <subscription name>"
- "save for <thing>, $<price>, by <month year or horizon>"
- "buy <planned thing>"
- "add $<amount>"
- "rebalance"
- "close <theme of an open bet>"

Rules:
- Use only a theme from the list you are given, spelled exactly as listed. If the person's thing is not clearly one of them, keep their own words for the theme — the app will ask them which theme they meant. Never swap in a different theme because it seems close.
- Never invent an amount or a horizon they did not give. If a bet is missing one, leave it out; the app will ask.
- Subscription, purchase and bet names: use the names you are given when one is clearly meant.
- If the line is not a money command at all, return an empty string.`

const SCHEMA = {
  type: 'object',
  properties: {
    canonical: { type: 'string', description: 'The command in the grammar, or an empty string.' },
  },
  required: ['canonical'],
  additionalProperties: false,
}

async function parse(req, res) {
  const c = await anthropic()
  if (!c) return json(res, 501, { canonical: null, reason: 'ANTHROPIC_API_KEY is not set; the app parses offline.' })
  let input
  try {
    input = JSON.parse(await readBody(req))
  } catch {
    return json(res, 400, { canonical: null, reason: 'Bad request.' })
  }
  const text = String(input.text ?? '').slice(0, 300)
  if (!text.trim()) return json(res, 400, { canonical: null, reason: 'Nothing to parse.' })
  const list = (x) => (Array.isArray(x) ? x.slice(0, 120).map(String).join(', ') : '')
  try {
    const response = await c.beta.messages.create({
      model: MODEL,
      max_tokens: 1024,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Today: ${String(input.today ?? '')}\nThemes: ${list(input.themes)}\nSubscriptions: ${list(input.subscriptions)}\nPlanned purchases: ${list(input.purchases)}\nOpen bets: ${list(input.bets)}\n\nThey typed: ${text}`,
        },
      ],
    })
    if (response.stop_reason === 'refusal') return json(res, 200, { canonical: null, reason: 'declined' })
    const block = response.content.find((b) => b.type === 'text')
    const out = block ? JSON.parse(block.text) : { canonical: '' }
    return json(res, 200, { canonical: out.canonical?.trim() || null })
  } catch (e) {
    console.error('parse failed:', e?.status ?? '', e?.message ?? e)
    return json(res, 502, { canonical: null, reason: 'The model could not be reached; the app falls back to the offline parser.' })
  }
}

/* ------------------------------------------------------------------ */

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  if (url.pathname === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' })
    res.end('ok')
    return
  }
  if (PASSCODE && url.pathname === '/login' && req.method === 'POST') return login(req, res)
  if (!signedIn(req)) {
    if (url.pathname.startsWith('/api/')) return json(res, 401, { error: 'Sign in first.' })
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
    res.end(loginPage())
    return
  }
  if (url.pathname === '/api/status') {
    return json(res, 200, { broker: BROKER, bank: BANK, parser: process.env.ANTHROPIC_API_KEY ? 'claude' : 'regex', passcode: Boolean(PASSCODE) })
  }
  if (url.pathname === '/api/parse' && req.method === 'POST') return parse(req, res)
  const safe = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '')
  const file = join(root, safe)
  if (file.startsWith(root) && existsSync(file) && statSync(file).isFile()) {
    send(res, file)
    return
  }
  send(res, join(root, 'index.html'))
}).listen(port, host, () => {
  console.log(`horizon listening on http://${host}:${port} · broker ${BROKER} · bank ${BANK}${PASSCODE ? ' · passcode on' : ''}${process.env.ANTHROPIC_API_KEY ? ' · Claude parser on' : ''}`)
})
