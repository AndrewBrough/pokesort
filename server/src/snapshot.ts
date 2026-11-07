import { ballByIndex, ballUnlockOrder } from '../../shared/data/ball.ts'
import {
  BATCH_INTERVAL_MS,
  BIN_CAPACITY,
  SHELF_HINT_COST,
  STARTING_BAG,
  VACUUM_COST,
  VACUUM_FILTER_COST,
  nextBagCost,
  nextVacuumSizeCost,
  nextVacuumStrengthCost,
  tierUnlockCost,
  vacuumRadius,
} from '../../shared/data/balance.ts'
import type { BinBallSnapshot, ToastSnapshot, WorldSnapshot } from '../../shared/data/messages.ts'
import type { Session } from './session.ts'
import { binCount } from './actions.ts'

function takeBinDelta(
  session: Session,
  sent: Map<string, SentBinBall>,
): { bin: BinBallSnapshot[]; binRemoved: string[] } {
  const bin: BinBallSnapshot[] = []
  const live = new Set<string>()
  for (const ball of session.balls.values()) {
    if (ball.where !== 'bin') continue
    live.add(ball.id)
    const x = Math.round(ball.x)
    const y = Math.round(ball.y)
    const previous = sent.get(ball.id)
    if (previous && previous.x === x && previous.y === y && previous.typeIndex === ball.typeIndex) continue
    sent.set(ball.id, { typeIndex: ball.typeIndex, x, y })
    bin.push({ id: ball.id, typeIndex: ball.typeIndex, x, y })
  }
  const binRemoved: string[] = []
  for (const id of sent.keys()) {
    if (live.has(id)) continue
    sent.delete(id)
    binRemoved.push(id)
  }
  return { bin, binRemoved }
}

function otherCursors(session: Session, playerId: string): { id: string; x: number; y: number }[] {
  const cursors = []
  for (const player of session.players.values()) {
    if (player.id === playerId || !player.cursor) continue
    cursors.push({ id: player.id, x: Math.round(player.cursor.x), y: Math.round(player.cursor.y) })
  }
  return cursors
}

function toastOf(session: Session, playerId: string): ToastSnapshot | null {
  const player = session.players.get(playerId)
  const personal = player?.toast ?? null
  const global = session.toast
  const chosen = personal && (!global || personal.id >= global.id) ? personal : global
  if (!chosen || chosen.ttl <= 0) return null
  return { id: chosen.id, text: chosen.text }
}

export type SentBinBall = {
  typeIndex: number
  x: number
  y: number
}

/** Records what this client already has so the next snapshot can send only changes. */
export function snapshotFor(
  session: Session,
  playerId: string,
  sentBin: Map<string, SentBinBall>,
): WorldSnapshot {
  const player = session.players.get(playerId)
  const nextIndex = ballUnlockOrder()[session.unlockedTypes.length]
  const nextBall = nextIndex === undefined ? null : ballByIndex(nextIndex)
  const { bin, binRemoved } = takeBinDelta(session, sentBin)
  return {
    totalValue: session.totalValue,
    sessionMs: session.sessionMs,
    playerCount: session.players.size,
    status: session.status,
    fullness: binCount(session) / BIN_CAPACITY,
    nextBatchMs: Math.max(0, BATCH_INTERVAL_MS - session.batchMs),
    overflowMs: session.overflowMs,
    toast: toastOf(session, playerId),
    nextTier: nextBall ? { name: nextBall.name, cost: tierUnlockCost(nextBall.value) } : null,
    shelves: session.shelves.map((shelf) => ({
      index: shelf.index,
      typeIndex: shelf.typeIndex,
      unlocked: shelf.unlocked,
      filled: shelf.slots.reduce((count, id) => count + (id ? 1 : 0), 0),
    })),
    bin,
    binRemoved,
    cursors: otherCursors(session, playerId),
    hits: session.hits.map((hit) => ({
      x: Math.round(hit.x),
      y: Math.round(hit.y),
      speed: Math.round(hit.speed),
    })),
    you: {
      bag: (player?.bag ?? []).flatMap((id) => {
        const ball = session.balls.get(id)
        return ball ? [{ id: ball.id, typeIndex: ball.typeIndex }] : []
      }),
      bagSize: player?.bagSize ?? STARTING_BAG,
      vacuum: player?.vacuum ?? false,
      vacuumSize: player?.vacuumSize ?? 0,
      vacuumStrength: player?.vacuumStrength ?? 0,
      vacuumFilter: player?.vacuumFilter ?? false,
      shelfHint: player?.shelfHint ?? false,
      bagCost: nextBagCost(player?.bagSize ?? STARTING_BAG),
      vacuumCost: player?.vacuum ? null : VACUUM_COST,
      vacuumSizeCost: player?.vacuum ? nextVacuumSizeCost(player.vacuumSize) : null,
      vacuumStrengthCost: player?.vacuum ? nextVacuumStrengthCost(player.vacuumStrength) : null,
      vacuumFilterCost: player?.vacuumFilter ? null : VACUUM_FILTER_COST,
      vacuumReach: vacuumRadius(player?.vacuumSize ?? 0),
      shelfHintCost: player?.shelfHint ? null : SHELF_HINT_COST,
    },
  }
}
