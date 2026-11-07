import { ballByIndex, ballUnlockOrder } from '../../shared/data/ball.ts'
import {
  BAG_COSTS,
  BATCH_INTERVAL_MS,
  BIN_CAPACITY,
  DROP_RATE,
  MAX_BAG,
  STARTING_BAG,
  OVERFLOW_LIMIT_MS,
  VACUUM_AIM_MS,
  VACUUM_COST,
  tierUnlockCost,
} from '../../shared/data/balance.ts'
import { BIN, SHELF_CAPACITY, SHELF_FRAMES, SHELF_INDEX_MAX } from '../../shared/data/layout.ts'
import type { ClientMessage } from '../../shared/data/messages.ts'
import { stepBin, type VacuumPull } from './physics.ts'
import type { Ball, Session, Shelf } from './session.ts'

function toast(session: Session, text: string, playerId: string | null): void {
  const next = { id: ++session.toastSeq, text, ttl: 2800 }
  if (playerId) {
    const player = session.players.get(playerId)
    if (player) player.toast = next
    return
  }
  session.toast = next
}

function playing(session: Session): boolean {
  return session.status === 'playing'
}

export function createShelves(): Shelf[] {
  return SHELF_FRAMES.map((frame) => ({
    index: frame.index,
    typeIndex: 0,
    unlocked: false,
    slots: Array.from({ length: SHELF_CAPACITY }, () => null),
  }))
}

function openShelf(session: Session, typeIndex: number): void {
  const shelf = session.shelves.find((entry) => !entry.unlocked)
  if (!shelf) return
  shelf.unlocked = true
  shelf.typeIndex = typeIndex
  shelf.slots = Array.from({ length: SHELF_CAPACITY }, () => null)
}

export function beginRun(session: Session): void {
  session.balls.clear()
  session.shelves = createShelves()
  session.totalValue = 0
  session.status = 'playing'
  session.sessionMs = 0
  session.batchMs = 0
  session.overflowMs = 0
  session.nextBall = 1
  session.toast = null
  session.toastSeq = 0
  for (const player of session.players.values()) {
    player.bag = []
    player.bagSize = STARTING_BAG
    player.vacuum = false
    player.vacuumAim = null
    player.toast = null
  }
  session.unlockedTypes = []
  const first = ballUnlockOrder()[0]
  if (first !== undefined) unlockTier(session, first)
  spawnDrop(session)
}

function tossFromCenter(ball: Ball): void {
  const angle = Math.random() * Math.PI * 2
  const speed = 220 + Math.random() * 160
  ball.x = BIN.x + BIN.w / 2 + Math.cos(angle) * 8
  ball.y = BIN.y + BIN.h / 2 + Math.sin(angle) * 8
  ball.vx = Math.cos(angle) * speed
  ball.vy = Math.sin(angle) * speed
  ball.outsideMs = 0
}

function spawnOne(session: Session, typeIndex: number): void {
  const id = String(session.nextBall++)
  const ball: Ball = {
    id,
    typeIndex,
    where: 'bin',
    playerId: null,
    shelfIndex: null,
    slot: null,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    outsideMs: 0,
  }
  tossFromCenter(ball)
  session.balls.set(id, ball)
}

/** Drops DROP_RATE balls of every unlocked type. */
export function spawnDrop(session: Session): void {
  for (const typeIndex of session.unlockedTypes) {
    for (let i = 0; i < DROP_RATE; i++) spawnOne(session, typeIndex)
  }
}

function unlockTier(session: Session, typeIndex: number): void {
  if (session.unlockedTypes.includes(typeIndex)) return
  session.unlockedTypes.push(typeIndex)
  openShelf(session, typeIndex)
}

export function binCount(session: Session): number {
  let count = 0
  for (const ball of session.balls.values()) if (ball.where === 'bin') count++
  return count
}

function placeOnShelf(session: Session, ball: Ball, shelf: Shelf, slot: number, playerId: string): void {
  const player = session.players.get(playerId)
  if (!player) return
  shelf.slots[slot] = ball.id
  ball.where = 'shelf'
  ball.playerId = null
  ball.shelfIndex = shelf.index
  ball.slot = slot
  ball.vx = 0
  ball.vy = 0
  player.bag = player.bag.filter((id) => id !== ball.id)
  session.totalValue += ballByIndex(ball.typeIndex).value
}

function cashOut(session: Session, shelf: Shelf): void {
  const value = ballByIndex(shelf.typeIndex).value
  const count = shelf.slots.length
  const bonus = 10 * value * count
  session.totalValue += bonus
  for (const id of shelf.slots) {
    if (id) session.balls.delete(id)
  }
  shelf.slots = shelf.slots.map(() => null)
  toast(session, `${ballByIndex(shelf.typeIndex).shortName} shelf sold +${bonus.toLocaleString('en-US')}`, null)
}

function decayToasts(session: Session, dt: number): void {
  if (session.toast) {
    session.toast.ttl -= dt
    if (session.toast.ttl <= 0) session.toast = null
  }
  for (const player of session.players.values()) {
    if (!player.toast) continue
    player.toast.ttl -= dt
    if (player.toast.ttl <= 0) player.toast = null
  }
}

export function tick(session: Session, dtMs: number): void {
  if (session.players.size === 0 || session.status !== 'playing') return
  session.sessionMs += dtMs
  session.batchMs += dtMs
  const count = binCount(session)
  const fullness = count / BIN_CAPACITY
  if (fullness > 1) session.overflowMs += dtMs
  else session.overflowMs = 0
  const leak = fullness <= 1 ? 0 : 8 + (session.overflowMs / OVERFLOW_LIMIT_MS) * 56
  const { spilled, caught } = stepBin(session.balls.values(), fullness, leak, dtMs / 1000, vacuumPulls(session))
  for (const hit of caught) {
    const ball = session.balls.get(hit.id)
    const owner = session.players.get(hit.playerId)
    if (!ball || !owner || owner.bag.length >= owner.bagSize) continue
    takeIntoBag(session, hit.playerId, ball)
  }
  if (spilled || session.overflowMs >= OVERFLOW_LIMIT_MS) {
    session.status = 'overflow'
    decayToasts(session, dtMs)
    return
  }
  if (session.batchMs >= BATCH_INTERVAL_MS) {
    session.batchMs = 0
    spawnDrop(session)
  }
  decayToasts(session, dtMs)
}

export function returnBag(session: Session, playerId: string): void {
  const player = session.players.get(playerId)
  if (!player) return
  for (const id of player.bag) {
    const ball = session.balls.get(id)
    if (!ball) continue
    ball.where = 'bin'
    ball.playerId = null
    tossFromCenter(ball)
  }
  player.bag = []
}

function vacuumPulls(session: Session): VacuumPull[] {
  const pulls: VacuumPull[] = []
  for (const player of session.players.values()) {
    const aim = player.vacuumAim
    if (!player.vacuum || !aim) continue
    if (session.sessionMs - aim.at > VACUUM_AIM_MS) {
      player.vacuumAim = null
      continue
    }
    if (player.bag.length === 0 || player.bag.length >= player.bagSize) continue
    const types = new Set<number>()
    for (const id of player.bag) {
      const typeIndex = session.balls.get(id)?.typeIndex
      if (typeIndex !== undefined) types.add(typeIndex)
    }
    if (types.size === 0) continue
    pulls.push({ playerId: player.id, x: aim.x, y: aim.y, types })
  }
  return pulls
}

function takeIntoBag(session: Session, playerId: string, ball: Ball): boolean {
  const player = session.players.get(playerId)
  if (!player || ball.where !== 'bin') return false
  if (player.bag.length >= player.bagSize) {
    toast(session, 'Bag is full', playerId)
    return false
  }
  ball.where = 'bag'
  ball.playerId = playerId
  ball.vx = 0
  ball.vy = 0
  player.bag.push(ball.id)
  return true
}

export function applyAction(session: Session, playerId: string, message: ClientMessage): void {
  const player = session.players.get(playerId)
  if (!player) return
  if (message.type === 'restart') {
    beginRun(session)
    toast(session, 'New shipment. Shelves restocked.', null)
    return
  }
  if (!playing(session)) return

  if (message.type === 'pickup') {
    const ball = session.balls.get(message.ballId)
    if (!ball) return
    takeIntoBag(session, playerId, ball)
    return
  }

  if (message.type === 'vacuum') {
    if (!player.vacuum || player.bag.length === 0 || player.bag.length >= player.bagSize) {
      player.vacuumAim = null
      return
    }
    player.vacuumAim = { x: message.x, y: message.y, at: session.sessionMs }
    return
  }

  if (message.type === 'drop') {
    if (!player.bag.includes(message.ballId)) return
    const ball = session.balls.get(message.ballId)
    if (!ball) return
    ball.where = 'bin'
    ball.playerId = null
    tossFromCenter(ball)
    player.bag = player.bag.filter((id) => id !== ball.id)
    return
  }

  if (message.type === 'dropBatch') {
    spawnDrop(session)
    session.batchMs = 0
    return
  }

  if (message.type === 'upgrade') {
    if (message.upgrade === 'bag') {
      const cost = BAG_COSTS[player.bagSize - 1]
      if (player.bagSize >= MAX_BAG || cost === undefined) return
      if (session.totalValue < cost) {
        toast(session, 'Not enough value for your bag slot', playerId)
        return
      }
      session.totalValue -= cost
      player.bagSize += 1
      toast(session, `Your bag holds ${player.bagSize}`, playerId)
      return
    }
    if (message.upgrade === 'tier') {
      const nextIndex = ballUnlockOrder()[session.unlockedTypes.length]
      if (nextIndex === undefined) return
      const next = ballByIndex(nextIndex)
      const cost = tierUnlockCost(next.value)
      if (session.totalValue < cost) {
        toast(session, `Not enough value to unlock ${next.shortName}`, playerId)
        return
      }
      session.totalValue -= cost
      unlockTier(session, nextIndex)
      toast(session, `${next.name} unlocked. ${DROP_RATE} drop each batch.`, null)
      return
    }
    if (message.upgrade !== 'vacuum' || player.vacuum) return
    if (session.totalValue < VACUUM_COST) {
      toast(session, 'Not enough value for the vacuum', playerId)
      return
    }
    session.totalValue -= VACUUM_COST
    player.vacuum = true
    toast(session, 'Vacuum online. Hold to pull matching balls.', playerId)
    return
  }

  if (message.type !== 'deposit') return
  if (!Number.isInteger(message.shelfIndex) || message.shelfIndex < 0 || message.shelfIndex > SHELF_INDEX_MAX) {
    return
  }
  const shelf = session.shelves[message.shelfIndex]
  if (!shelf?.unlocked) return
  const matching = player.bag.filter((id) => session.balls.get(id)?.typeIndex === shelf.typeIndex)
  if (matching.length === 0) {
    const held = player.bag[0] ? session.balls.get(player.bag[0]) : undefined
    const heldName = held ? ballByIndex(held.typeIndex).shortName : 'Empty bag'
    toast(session, `${shelfName(shelf)} shelf rejects ${heldName}`, playerId)
    return
  }
  for (const id of matching) {
    const ball = session.balls.get(id)
    if (!ball) continue
    let slot = shelf.slots.findIndex((entry) => entry === null)
    if (slot < 0) break
    placeOnShelf(session, ball, shelf, slot, playerId)
    if (shelf.slots.every((entry) => entry !== null)) cashOut(session, shelf)
  }
}

function shelfName(shelf: Shelf): string {
  return ballByIndex(shelf.typeIndex).shortName
}
