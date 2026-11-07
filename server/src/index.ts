import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { WebSocketServer, type RawData, type WebSocket } from 'ws'
import { SIM_STEP_MS, SNAPSHOT_EVERY_STEPS, STARTING_BAG } from '../../shared/data/balance.ts'
import type { ClientMessage } from '../../shared/data/messages.ts'
import { applyAction, beginRun, rememberClient, returnBag, tick } from './actions.ts'
import { createSession, type ClientUpgrades, type Session } from './session.ts'
import { snapshotFor } from './snapshot.ts'

const PORT = Number(process.env.PORT ?? 8787)
const STATIC_ROOT = resolve(process.env.STATIC_DIR ?? join(import.meta.dirname, '../../client/dist'))

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

function send(socket: WebSocket, payload: unknown): void {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(payload))
}

function parseMessage(raw: RawData): ClientMessage | null {
  const text = raw.toString()
  if (text.length > 2000) return null
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return null
  }
  if (!value || typeof value !== 'object' || !('type' in value)) return null
  const type = (value as { type: unknown }).type
  if (
    type === 'dropBatch' ||
    type === 'restart' ||
    type === 'pickup' ||
    type === 'cursor' ||
    type === 'vacuum' ||
    type === 'deposit' ||
    type === 'drop' ||
    type === 'upgrade' ||
    type === 'grant'
  ) {
    return value as ClientMessage
  }
  return null
}

async function serveStatic(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('ok')
    return
  }
  const requested = url.pathname === '/' ? '/index.html' : url.pathname
  const filePath = resolve(STATIC_ROOT, normalize(`.${requested}`))
  if (!filePath.startsWith(STATIC_ROOT)) {
    res.writeHead(403).end()
    return
  }
  try {
    const info = await stat(filePath)
    if (!info.isFile()) throw new Error('not a file')
    res.writeHead(200, { 'content-type': MIME[extname(filePath)] ?? 'application/octet-stream' })
    createReadStream(filePath).pipe(res)
  } catch {
    if (extname(requested)) {
      res.writeHead(404).end()
      return
    }
    const indexPath = join(STATIC_ROOT, 'index.html')
    try {
      await stat(indexPath)
      res.writeHead(200, { 'content-type': MIME['.html'] })
      createReadStream(indexPath).pipe(res)
    } catch {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('PokeSort server is up. Build the client to serve the game from this port.')
    }
  }
}

function clientKeyFrom(request: IncomingMessage): string | null {
  const raw = new URL(request.url ?? '/', 'http://localhost').searchParams.get('client')
  if (!raw || !/^[0-9a-f-]{36}$/.test(raw)) return null
  return raw
}

function upgradesFor(session: Session, clientKey: string | null): ClientUpgrades | undefined {
  if (!clientKey) return undefined
  return session.clients.get(clientKey)
}

function broadcast(session: Session, sockets: Map<WebSocket, string>): void {
  for (const [socket, playerId] of sockets) {
    send(socket, { type: 'state', state: snapshotFor(session, playerId) })
  }
}

export function startServer(): void {
  const session = createSession()
  const sockets = new Map<WebSocket, string>()
  let timer: ReturnType<typeof setInterval> | null = null
  let steps = 0

  const stopLoop = () => {
    if (!timer) return
    clearInterval(timer)
    timer = null
    steps = 0
  }

  const ensureLoop = () => {
    if (timer || session.players.size === 0) return
    timer = setInterval(() => {
      tick(session, SIM_STEP_MS)
      steps += 1
      if (steps >= SNAPSHOT_EVERY_STEPS) {
        steps = 0
        broadcast(session, sockets)
      }
    }, SIM_STEP_MS)
  }

  const httpServer = createServer((req, res) => {
    void serveStatic(req, res)
  })

  const wss = new WebSocketServer({ server: httpServer, path: '/ws' })
  wss.on('connection', (socket, request) => {
    const clientKey = clientKeyFrom(request)
    const saved = upgradesFor(session, clientKey)
    const id = `p${session.nextPlayer++}`
    session.players.set(id, {
      id,
      clientKey,
      bag: [],
      bagSize: saved?.bagSize ?? STARTING_BAG,
      vacuum: saved?.vacuum ?? false,
      vacuumSize: saved?.vacuumSize ?? 0,
      vacuumStrength: saved?.vacuumStrength ?? 0,
      shelfHint: saved?.shelfHint ?? false,
      vacuumAim: null,
      cursor: null,
      toast: null,
    })
    if (!session.live) {
      session.live = true
      beginRun(session)
    }
    sockets.set(socket, id)
    send(socket, { type: 'welcome', playerId: id })
    send(socket, { type: 'state', state: snapshotFor(session, id) })
    ensureLoop()

    socket.on('message', (data) => {
      const message = parseMessage(data)
      if (!message) return
      applyAction(session, id, message)
      // Aims and cursors are folded into the 10 Hz snapshot. A full copy per packet
      // was most of the bandwidth while someone held the vacuum.
      if (message.type === 'cursor' || message.type === 'vacuum') return
      broadcast(session, sockets)
    })

    socket.on('close', () => {
      sockets.delete(socket)
      rememberClient(session, id)
      returnBag(session, id)
      session.players.delete(id)
      if (session.players.size === 0) stopLoop()
      else broadcast(session, sockets)
    })
  })

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`PokeSort listening on ${PORT}`)
  })
}

startServer()
