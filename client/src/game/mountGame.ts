import type { FpsCounterHandle } from '../components/FpsCounter/FpsCounter.ts'
import { mountGameScreen } from '../components/GameScreen/GameScreen.ts'
import { shelfSaleBonus, unloadInterval } from '../data/balance.ts'
import { ballByIndex } from '../data/ball.ts'
import { BIN, SHELF_CAPACITY } from '../data/layout.ts'
import type { ClientMessage, WorldSnapshot } from '../data/messages.ts'
import { connectSocket } from '../net/socket.ts'
import { createStage, type StageHandle } from './createStage.ts'
import { savedMatch } from '../components/BagPanel/BagMatch/BagMatch.ts'
import { createHitSounds } from './HitSounds/HitSounds.ts'
import { createUnloadHold } from './UnloadHold/UnloadHold.ts'

export async function mountGame(root: HTMLElement): Promise<void> {
  let snapshot: WorldSnapshot | null = null
  let vacuumArmed = false
  let holdMs = 0
  let pointerSeen = false
  let sinceCursor = 0
  let sentCursor = { x: Number.NaN, y: Number.NaN }
  let pointer = { x: BIN.x + BIN.w / 2, y: BIN.y + BIN.h / 2 }
  let stage: StageHandle | null = null
  const unload = createUnloadHold()
  const insideBin = (point: { x: number; y: number }) =>
    point.x >= BIN.x && point.x <= BIN.x + BIN.w && point.y >= BIN.y && point.y <= BIN.y + BIN.h

  const send = (message: ClientMessage) => connection.send(message)
  const hitSounds = createHitSounds()
  const screen = mountGameScreen(root, {
    onDropBatch: () => send({ type: 'dropBatch' }),
    onUpgrade: (upgrade) => send({ type: 'upgrade', upgrade }),
    onRestart: () => send({ type: 'restart' }),
    onDropBall: (ballId) => send({ type: 'drop', ballId }),
    onGrant: () => send({ type: 'grant' }),
    onMax: () => send({ type: 'max' }),
    muted: hitSounds.muted(),
    onMute: (muted) => hitSounds.setMuted(muted),
  })
  const fps: FpsCounterHandle | null = import.meta.env.DEV
    ? (await import('../components/FpsCounter/FpsCounter.ts')).mountFpsCounter(screen.stage)
    : null

  const connection = connectSocket(
    (message) => {
      if (message.type === 'state') {
        snapshot = message.state
        stage?.sync(snapshot)
        screen.update(snapshot, true)
        hitSounds.play(snapshot.hits)
      }
    },
    (connected) => {
      if (!connected) screen.update(snapshot, false)
    },
  )

  stage = await createStage(screen.stage, (dtMs) => {
    fps?.sample({ dtMs })
    const you = snapshot?.you
    const bagFull = !you || you.bag.length >= you.bagSize
    const selective = !!you?.vacuumFilter && savedMatch() && you.bag.length > 0
    const pulling = vacuumArmed && !!you?.vacuum && snapshot?.status === 'playing' && !bagFull
    if (pulling) {
      holdMs += dtMs
      if (holdMs >= 50) {
        holdMs = 0
        sentCursor = { x: pointer.x, y: pointer.y }
        send({ type: 'vacuum', x: pointer.x, y: pointer.y, match: savedMatch() })
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
      selective,
      radius: you?.vacuumReach ?? 0,
    })
    stage?.showSelf(pointerSeen ? pointer : null)
    if (snapshot?.status !== 'playing') {
      unload.stop()
      stage?.showUnload([])
      return
    }
    const place = (shelfIndex: number) => {
      const shelf = snapshot?.shelves.find((entry) => entry.index === shelfIndex)
      const matches =
        !!shelf && shelf.filled < SHELF_CAPACITY && !!you?.bag.some((ball) => ball.typeIndex === shelf.typeIndex)
      if (!matches || !shelf) return false
      const to = stage?.flyTarget(shelfIndex)
      if (to) {
        const value = ballByIndex(shelf.typeIndex).value
        const earned = value + (to.fillsShelf ? shelfSaleBonus(value, SHELF_CAPACITY) : 0)
        stage?.popUnload({ typeIndex: shelf.typeIndex, shelfIndex, from: pointer, to, earned })
      }
      send({ type: 'deposit', shelfIndex })
      return true
    }
    unload.step(dtMs, unloadInterval(you?.unloadSpeed ?? 0), place, (shelfIndex) => {
      send({ type: 'deposit', shelfIndex })
    })
    stage?.showUnload(unload.active())
  })
  const resize = () => stage?.resize(screen.stage.clientWidth, screen.stage.clientHeight)
  resize()
  if (snapshot) stage.sync(snapshot)
  const observer = new ResizeObserver(resize)
  observer.observe(screen.stage)

  stage.canvas.addEventListener('pointerdown', (event) => {
    hitSounds.unlock()
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
      unload.down(shelfIndex)
      vacuumArmed = false
      return
    }
    vacuumArmed = insideBin(pointer)
    holdMs = 0
  })
  stage.canvas.addEventListener('pointermove', (event) => {
    pointer = stage?.worldFromEvent(event) ?? pointer
    pointerSeen = true
    unload.move(stage?.shelfAt(pointer.x, pointer.y) ?? null)
  })
  const release = () => {
    vacuumArmed = false
    unload.up()
  }
  stage.canvas.addEventListener('pointerup', release)
  stage.canvas.addEventListener('pointercancel', release)
  stage.canvas.addEventListener('contextmenu', (event) => event.preventDefault())
}
