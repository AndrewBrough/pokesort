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

export type PlayerSnapshot = {
  bag: BagBallSnapshot[]
  bagSize: number
  vacuum: boolean
  bagCost: number | null
  vacuumCost: number | null
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
  bin: BinBallSnapshot[]
  you: PlayerSnapshot
}

export type ClientMessage =
  | { type: 'pickup'; ballId: string }
  | { type: 'vacuum'; x: number; y: number }
  | { type: 'deposit'; shelfIndex: number }
  | { type: 'drop'; ballId: string }
  | { type: 'dropBatch' }
  | { type: 'upgrade'; upgrade: 'bag' | 'vacuum' | 'tier' }
  | { type: 'grant' }
  | { type: 'restart' }

export type ServerMessage =
  | { type: 'welcome'; playerId: string }
  | { type: 'state'; state: WorldSnapshot }
