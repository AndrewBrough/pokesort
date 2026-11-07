import type { ClientMessage, ServerMessage } from '../data/messages.ts'

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
    const url = typeof configured === 'string' && configured.length > 0
      ? configured
      : `${protocol}://${location.host}/ws`
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
