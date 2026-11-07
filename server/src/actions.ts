import { ballByIndex, ballUnlockOrder } from '../../shared/data/ball.ts'
import {
  nextBagCost,
  nextBagGain,
  BATCH_INTERVAL_MS,
  BIN_CAPACITY,
  DEV_GRANT,
  DROP_RATE,
  DROP_SPREAD,
  DROP_WINDOW_MS,
  HIT_VOICES,
  MAX_BAG,
  STARTING_BAG,
  OVERFLOW_LIMIT_MS,
  VACUUM_AIM_MS,
  SHELF_HINT_COST,
  VACUUM_COST,
  VACUUM_LEVELS,
  VACUUM_FILTER_COST,
  nextVacuumSizeCost,
  nextVacuumStrengthCost,
  tierUnlockCost,
  vacuumPullSpeed,
  vacuumRadius,
} from '../../shared/data/balance.ts'
import { BIN, SHELF_CAPACITY, SHELF_FRAMES, SHELF_INDEX_MAX } from '../../shared/data/layout.ts'
import type { ClientMessage, HitSnapshot } from '../../shared/data/messages.ts'
import { visibleUpgrades, type UpgradeId, type UpgradeLevels } from '../../shared/data/upgrades.ts'
import { stepBin, type VacuumPull } from './physics.ts'
import type { Ball, Player, Session, Shelf } from './session.ts'

function placeCursor(player: Player, x: number, y: number): void {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return
  if (Math.abs(x) > 10000 || Math.abs(y) > 10000) return
  player.cursor = { x, y }
}

function toast(session: Session, text: string, playerId: string | null): void {
  const next = { id: ++session.toastSeq, text, ttl: 2800 }
  if (playerId) {
    const player = session.players.get(playerId)
    if (player) player.toast = next
    return
  }
  session.toast = next
}

function rememberHits(session: Session, hits: readonly HitSnapshot[]): void {
  for (const hit of hits) {
    if (session.hits.length < HIT_VOICES) {
      session.hits.push(hit)
      continue
    }
    let quiet = 0
    for (let i = 1; i < session.hits.length; i++) {
      if (session.hits[i].speed < session.hits[quiet].speed) quiet = i
    }
    if (hit.speed > session.hits[quiet].speed) session.hits[quiet] = hit
  }
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
  session.clients.clear()
  for (const player of session.players.values()) {
    player.bag = []
    player.bagSize = STARTING_BAG
    player.vacuum = false
    player.vacuumSize = 0
    player.vacuumStrength = 0
    player.vacuumFilter = false
    player.shelfHint = false
    player.vacuumAim = null
    player.toast = null
  }
  session.unlockedTypes = []
  session.hits = []
  session.drops = []
  const first = ballUnlockOrder()[0]
  if (first !== undefined) unlockTier(session, first)
  spawnDrop(session)
}

function tossFromCenter(ball: Ball): void {
  const marginX = (BIN.w * (1 - DROP_SPREAD)) / 2
  const marginY = (BIN.h * (1 - DROP_SPREAD)) / 2
  ball.x = BIN.x + marginX + Math.random() * (BIN.w - marginX * 2)
  ball.y = BIN.y + marginY + Math.random() * (BIN.h - marginY * 2)
  const angle = Math.random() * Math.PI * 2
  const speed = 220 + Math.random() * 160
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

function releaseDrops(session: Session): void {
  if (session.drops.length === 0) return
  const now = session.sessionMs
  const waiting: Session['drops'] = []
  for (const drop of session.drops) {
    if (drop.at <= now) spawnOne(session, drop.typeIndex)
    else waiting.push(drop)
  }
  session.drops = waiting
}

/** Drops DROP_RATE balls of every unlocked type, scattered across the bin over DROP_WINDOW_MS. */
export function spawnDrop(session: Session): void {
  const order: number[] = []
  for (const typeIndex of session.unlockedTypes) {
    for (let i = 0; i < DROP_RATE; i++) order.push(typeIndex)
  }
  for (let i = order.length - 1; i > 0; i--) {
    const swap = Math.floor(Math.random() * (i + 1))
    const typeIndex = order[i]
    order[i] = order[swap]
    order[swap] = typeIndex
  }
  const start = session.sessionMs
  for (let i = 0; i < order.length; i++) {
    const at = order.length === 1 ? start : start + (i / (order.length - 1)) * DROP_WINDOW_MS
    if (at <= start) spawnOne(session, order[i])
    else session.drops.push({ typeIndex: order[i], at })
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
  releaseDrops(session)
  const count = binCount(session)
  const fullness = count / BIN_CAPACITY
  if (fullness > 1) session.overflowMs += dtMs
  else session.overflowMs = 0
  const leak = fullness <= 1 ? 0 : 8 + (session.overflowMs / OVERFLOW_LIMIT_MS) * 56
  const { spilled, caught, hits } = stepBin(
    session.balls.values(),
    fullness,
    leak,
    dtMs / 1000,
    vacuumPulls(session),
  )
  rememberHits(session, hits)
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

export function rememberClient(session: Session, playerId: string): void {
  const player = session.players.get(playerId)
  if (!player?.clientKey) return
  session.clients.set(player.clientKey, {
    bagSize: player.bagSize,
    vacuum: player.vacuum,
    vacuumSize: player.vacuumSize,
    vacuumStrength: player.vacuumStrength,
    vacuumFilter: player.vacuumFilter,
    shelfHint: player.shelfHint,
  })
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
    if (!canVacuum(player)) continue
    const selective = aim.match && player.bag.length > 0
    const types = new Set<number>()
    if (selective) {
      for (const id of player.bag) {
        const typeIndex = session.balls.get(id)?.typeIndex
        if (typeIndex !== undefined) types.add(typeIndex)
      }
      if (types.size === 0) continue
    }
    pulls.push({
      playerId: player.id,
      x: aim.x,
      y: aim.y,
      types,
      selective,
      radius: vacuumRadius(player.vacuumSize),
      speed: vacuumPullSpeed(player.vacuumStrength),
    })
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
  if (message.type === 'grant') {
    if (process.env.NODE_ENV === 'production') return
    session.totalValue += DEV_GRANT
    return
  }
  if (message.type === 'max') {
    if (process.env.NODE_ENV === 'production') return
    maxUpgrades(session, player)
    return
  }
  if (message.type === 'restart') {
    beginRun(session)
    toast(session, 'New shipment. Shelves restocked.', null)
    return
  }
  if (message.type === 'cursor') {
    placeCursor(player, message.x, message.y)
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
    placeCursor(player, message.x, message.y)
    if (!canVacuum(player)) {
      player.vacuumAim = null
      return
    }
    player.vacuumAim = {
      x: message.x,
      y: message.y,
      at: session.sessionMs,
      match: player.vacuumFilter && message.match === true,
    }
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
      const gain = nextBagGain(player.bagSize)
      const cost = nextBagCost(player.bagSize)
      if (gain === 0 || cost === null) return
      if (session.totalValue < cost) {
        toast(session, 'Not enough value for your bag slot', playerId)
        return
      }
      session.totalValue -= cost
      player.bagSize += gain
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
    if (message.upgrade === 'hint') {
      if (player.shelfHint) return
      if (session.totalValue < SHELF_HINT_COST) {
        toast(session, 'Not enough value to mark shelves', playerId)
        return
      }
      session.totalValue -= SHELF_HINT_COST
      player.shelfHint = true
      toast(session, 'Shelf marks on. Matching shelves light up.', playerId)
      return
    }
    if (message.upgrade === 'vacuumFilter') {
      buyVacuumFilter(session, player)
      return
    }
    if (message.upgrade === 'vacuumSize' || message.upgrade === 'vacuumStrength') {
      buyVacuumStat(session, player, message.upgrade)
      return
    }
    if (message.upgrade !== 'vacuum' || !upgradeOffered(player, 'vacuum')) return
    if (session.totalValue < VACUUM_COST) {
      toast(session, 'Not enough value for the vacuum', playerId)
      return
    }
    session.totalValue -= VACUUM_COST
    player.vacuum = true
    toast(session, 'Vacuum online. It pulls every ball.', playerId)
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

function levelsOf(player: Player): UpgradeLevels {
  return {
    vacuum: player.vacuum ? 1 : 0,
    vacuumSize: player.vacuumSize,
    vacuumStrength: player.vacuumStrength,
    vacuumFilter: player.vacuumFilter ? 1 : 0,
    hint: player.shelfHint ? 1 : 0,
  }
}

function upgradeOffered(player: Player, id: UpgradeId): boolean {
  return visibleUpgrades(levelsOf(player)).some((upgrade) => upgrade.id === id)
}

function maxUpgrades(session: Session, player: Player): void {
  player.bagSize = MAX_BAG
  player.vacuum = true
  player.vacuumSize = VACUUM_LEVELS
  player.vacuumStrength = VACUUM_LEVELS
  player.vacuumFilter = true
  player.shelfHint = true
  for (const typeIndex of ballUnlockOrder()) unlockTier(session, typeIndex)
  toast(session, 'Upgrades maxed.', player.id)
}

function canVacuum(player: Player): boolean {
  return player.vacuum && player.bag.length < player.bagSize
}

function buyVacuumFilter(session: Session, player: Player): void {
  if (!upgradeOffered(player, 'vacuumFilter') || player.vacuumFilter) return
  if (session.totalValue < VACUUM_FILTER_COST) {
    toast(session, 'Not enough value to match your bag', player.id)
    return
  }
  session.totalValue -= VACUUM_FILTER_COST
  player.vacuumFilter = true
  toast(session, 'Match bag is on. An empty bag still pulls any ball.', player.id)
}

function buyVacuumStat(session: Session, player: Player, upgrade: 'vacuumSize' | 'vacuumStrength'): void {
  if (!upgradeOffered(player, upgrade)) return
  const level = upgrade === 'vacuumSize' ? player.vacuumSize : player.vacuumStrength
  const cost = upgrade === 'vacuumSize' ? nextVacuumSizeCost(level) : nextVacuumStrengthCost(level)
  if (cost === null) return
  const name = upgrade === 'vacuumSize' ? 'Vacuum size' : 'Vacuum strength'
  if (session.totalValue < cost) {
    toast(session, `Not enough value for ${name.toLowerCase()}`, player.id)
    return
  }
  session.totalValue -= cost
  if (upgrade === 'vacuumSize') player.vacuumSize += 1
  else player.vacuumStrength += 1
  const next = upgrade === 'vacuumSize' ? player.vacuumSize : player.vacuumStrength
  toast(session, `${name} ${next}`, player.id)
}
