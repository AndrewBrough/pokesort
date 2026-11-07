import { BIN } from '../data/layout.ts'
import type { ClientMessage, WorldSnapshot } from '../data/messages.ts'
import { mountGameScreen } from '../components/GameScreen/GameScreen.ts'
import { connectSocket } from '../net/socket.ts'
import { createStage, type StageHandle } from './createStage.ts'

export async function mountGame(root: HTMLElement): Promise<void> {
  let snapshot: WorldSnapshot | null = null
  let vacuumArmed = false
  let holdMs = 0
  let pointerSeen = false
  let sinceCursor = 0
  let sentCursor = { x: Number.NaN, y: Number.NaN }
  let pointer = { x: BIN.x + BIN.w / 2, y: BIN.y + BIN.h / 2 }
  let stage: StageHandle | null = null
  const insideBin = (point: { x: number; y: number }) =>
    point.x >= BIN.x && point.x <= BIN.x + BIN.w && point.y >= BIN.y && point.y <= BIN.y + BIN.h

  const send = (message: ClientMessage) => connection.send(message)
  const screen = mountGameScreen(root, {
    onDropBatch: () => send({ type: 'dropBatch' }),
    onUpgrade: (upgrade) => send({ type: 'upgrade', upgrade }),
    onRestart: () => send({ type: 'restart' }),
    onDropBall: (ballId) => send({ type: 'drop', ballId }),
    onGrant: () => send({ type: 'grant' }),
  })

  const connection = connectSocket(
    (message) => {
      if (message.type === 'state') {
        snapshot = message.state
        stage?.sync(snapshot)
        screen.update(snapshot, true)
      }
    },
    (connected) => {
      if (!connected) screen.update(snapshot, false)
    },
  )

  stage = await createStage(screen.stage, (dtMs) => {
    const you = snapshot?.you
    const bagFull = !you || you.bag.length >= you.bagSize
    const pulling = vacuumArmed && !!you?.vacuum && snapshot?.status === 'playing' && !bagFull && you.bag.length > 0
    if (pulling) {
      holdMs += dtMs
      if (holdMs >= 50) {
        holdMs = 0
        sentCursor = { x: pointer.x, y: pointer.y }
        send({ type: 'vacuum', x: pointer.x, y: pointer.y })
      }
    } else if (pointerSeen) {
      sinceCursor += dtMs
      const moved = pointer.x !== sentCursor.x || pointer.y !== sentCursor.y
      if (moved && sinceCursor >= 50) {
        sinceCursor = 0
        sentCursor = { x: pointer.x, y: pointer.y }
        send({ type: 'cursor', x: pointer.x, y: pointer.y })
      }
    }
    stage?.showVacuum({
      active: pulling,
      rangeVisible: !!you?.vacuum && snapshot?.status === 'playing' && insideBin(pointer),
      cursorX: pointer.x,
      cursorY: pointer.y,
      types: new Set(you?.bag.map((ball) => ball.typeIndex) ?? []),
      radius: you?.vacuumReach ?? 0,
    })
    stage?.showSelf(pointerSeen ? pointer : null)
  })

  const resize = () => stage?.resize(screen.stage.clientWidth, screen.stage.clientHeight)
  resize()
  if (snapshot) stage.sync(snapshot)
  const observer = new ResizeObserver(resize)
  observer.observe(screen.stage)

  stage.canvas.addEventListener('pointerdown', (event) => {
    try {
      stage?.canvas.setPointerCapture(event.pointerId)
    } catch {
      // Untrusted or already-released pointers still need to resolve the click.
    }
    pointer = stage?.worldFromEvent(event) ?? pointer
    pointerSeen = true
    const ballId = stage?.ballAt(pointer.x, pointer.y)
    if (ballId) {
      send({ type: 'pickup', ballId })
      vacuumArmed = true
      holdMs = 0
      return
    }
    const shelfIndex = stage?.shelfAt(pointer.x, pointer.y)
    if (shelfIndex !== null && shelfIndex !== undefined) {
      send({ type: 'deposit', shelfIndex })
      vacuumArmed = false
      return
    }
    vacuumArmed = insideBin(pointer)
    holdMs = 0
  })
  stage.canvas.addEventListener('pointermove', (event) => {
    pointer = stage?.worldFromEvent(event) ?? pointer
    pointerSeen = true
  })
  const release = () => {
    vacuumArmed = false
  }
  stage.canvas.addEventListener('pointerup', release)
  stage.canvas.addEventListener('pointercancel', release)
  stage.canvas.addEventListener('contextmenu', (event) => event.preventDefault())
}
