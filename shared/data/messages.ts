import type { UpgradeId } from './upgrades.ts'

export type WorldStatus = 'playing' | 'overflow'

export type ShelfSnapshot = {
  index: number
  typeIndex: number
  unlocked: boolean
  filled: number
}

export type BinBallSnapshot = {
  id: string
  typeIndex: number
  x: number
  y: number
}

export type BagBallSnapshot = {
  id: string
  typeIndex: number
}

export type ToastSnapshot = {
  id: number
  text: string
}

export type CursorSnapshot = {
  id: string
  x: number
  y: number
}

export type HitSnapshot = {
  x: number
  y: number
  speed: number
}

export type PlayerSnapshot = {
  bag: BagBallSnapshot[]
  bagSize: number
  vacuum: boolean
  vacuumSize: number
  vacuumStrength: number
  /** When true, the vacuum only pulls types already in the bag. */
  vacuumFilter: boolean
  shelfHint: boolean
  bagCost: number | null
  vacuumCost: number | null
  vacuumSizeCost: number | null
  vacuumStrengthCost: number | null
  vacuumFilterCost: number | null
  /** Pull radius for the current size level, in world pixels. */
  vacuumReach: number
  shelfHintCost: number | null
}

export type NextTierSnapshot = {
  name: string
  cost: number
}

export type WorldSnapshot = {
  totalValue: number
  sessionMs: number
  playerCount: number
  status: WorldStatus
  fullness: number
  nextBatchMs: number
  overflowMs: number
  toast: ToastSnapshot | null
  nextTier: NextTierSnapshot | null
  shelves: ShelfSnapshot[]
  /** Balls that appeared or moved since this client's previous snapshot. */
  bin: BinBallSnapshot[]
  /** Bin balls this client should drop. Absent from `bin` does not mean removed. */
  binRemoved: string[]
  cursors: CursorSnapshot[]
  /** Loudest ball-on-ball hits since the previous snapshot. */
  hits: HitSnapshot[]
  you: PlayerSnapshot
}

export type ClientMessage =
  | { type: 'pickup'; ballId: string }
  | { type: 'cursor'; x: number; y: number }
  | { type: 'vacuum'; x: number; y: number; match: boolean }
  | { type: 'deposit'; shelfIndex: number }
  | { type: 'drop'; ballId: string }
  | { type: 'dropBatch' }
  | { type: 'upgrade'; upgrade: UpgradeId }
  | { type: 'grant' }
  | { type: 'restart' }

export type ServerMessage =
  | { type: 'welcome'; playerId: string }
  | { type: 'state'; state: WorldSnapshot }
