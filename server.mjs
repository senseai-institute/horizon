/**
 * Production static server. No dependencies, so nothing can go missing in a
 * pruned install. Serves the Vite build from dist/ on $PORT and falls back to
 * index.html for any path it does not recognise, which keeps deep links
 * working whatever router mode the app is using.
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'

const root = resolve(process.cwd(), 'dist')
const port = Number(process.env.PORT) || 3000
const host = '0.0.0.0'

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

createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  if (url.pathname === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' })
    res.end('ok')
    return
  }
  const safe = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '')
  const file = join(root, safe)
  if (file.startsWith(root) && existsSync(file) && statSync(file).isFile()) {
    send(res, file)
    return
  }
  send(res, join(root, 'index.html'))
}).listen(port, host, () => {
  console.log(`horizon listening on http://${host}:${port}`)
})
