import type { ClientMessage, ServerMessage } from '../data/messages.ts'

const CLIENT_KEY = 'pokesort-client'

function clientId(): string {
  const existing = localStorage.getItem(CLIENT_KEY)
  if (existing && /^[0-9a-f-]{36}$/.test(existing)) return existing
  const next = crypto.randomUUID()
  localStorage.setItem(CLIENT_KEY, next)
  return next
}

export type SocketHandle = {
  send: (message: ClientMessage) => void
  close: () => void
}

export function connectSocket(
  onMessage: (message: ServerMessage) => void,
  onStatus: (connected: boolean) => void,
): SocketHandle {
  let socket: WebSocket | null = null
  let closed = false

  const open = () => {
    if (closed) return
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
    const configured = import.meta.env.VITE_WS_URL
    const url = new URL(
      typeof configured === 'string' && configured.length > 0 ? configured : `${protocol}://${location.host}/ws`,
    )
    url.searchParams.set('client', clientId())
    const next = new WebSocket(url)
    socket = next
    next.addEventListener('open', () => onStatus(true))
    next.addEventListener('message', (event) => {
      if (typeof event.data !== 'string') return
      try {
        onMessage(JSON.parse(event.data) as ServerMessage)
      } catch {
        return
      }
    })
    next.addEventListener('close', () => {
      if (socket !== next) return
      onStatus(false)
      window.setTimeout(open, 1000)
    })
  }

  open()
  return {
    send(message) {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
    },
    close() {
      closed = true
      socket?.close()
    },
  }
}
