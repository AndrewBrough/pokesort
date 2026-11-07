import { ballByIndex, ballUnlockOrder } from '../../shared/data/ball.ts'
import {
  BATCH_INTERVAL_MS,
  BIN_CAPACITY,
  SHELF_HINT_COST,
  STARTING_BAG,
  VACUUM_COST,
  nextBagCost,
  nextVacuumSizeCost,
  nextVacuumStrengthCost,
  tierUnlockCost,
  vacuumRadius,
} from '../../shared/data/balance.ts'
import type { ToastSnapshot, WorldSnapshot } from '../../shared/data/messages.ts'
import type { Session } from './session.ts'
import { binCount } from './actions.ts'

function toastOf(session: Session, playerId: string): ToastSnapshot | null {
  const player = session.players.get(playerId)
  const personal = player?.toast ?? null
  const global = session.toast
  const chosen = personal && (!global || personal.id >= global.id) ? personal : global
  if (!chosen || chosen.ttl <= 0) return null
  return { id: chosen.id, text: chosen.text }
}

export function snapshotFor(session: Session, playerId: string): WorldSnapshot {
  const player = session.players.get(playerId)
  const nextIndex = ballUnlockOrder()[session.unlockedTypes.length]
  const nextBall = nextIndex === undefined ? null : ballByIndex(nextIndex)
  const bin = []
  for (const ball of session.balls.values()) {
    if (ball.where !== 'bin') continue
    bin.push({
      id: ball.id,
      typeIndex: ball.typeIndex,
      x: Math.round(ball.x),
      y: Math.round(ball.y),
    })
  }
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
    you: {
      bag: (player?.bag ?? []).flatMap((id) => {
        const ball = session.balls.get(id)
        return ball ? [{ id: ball.id, typeIndex: ball.typeIndex }] : []
      }),
      bagSize: player?.bagSize ?? STARTING_BAG,
      vacuum: player?.vacuum ?? false,
      vacuumSize: player?.vacuumSize ?? 0,
      vacuumStrength: player?.vacuumStrength ?? 0,
      shelfHint: player?.shelfHint ?? false,
      bagCost: nextBagCost(player?.bagSize ?? STARTING_BAG),
      vacuumCost: player?.vacuum ? null : VACUUM_COST,
      vacuumSizeCost: player?.vacuum ? nextVacuumSizeCost(player.vacuumSize) : null,
      vacuumStrengthCost: player?.vacuum ? nextVacuumStrengthCost(player.vacuumStrength) : null,
      vacuumReach: vacuumRadius(player?.vacuumSize ?? 0),
      shelfHintCost: player?.shelfHint ? null : SHELF_HINT_COST,
    },
  }
}
