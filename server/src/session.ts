export type BallWhere = 'bin' | 'bag' | 'shelf'

export type Ball = {
  id: string
  typeIndex: number
  where: BallWhere
  playerId: string | null
  shelfIndex: number | null
  slot: number | null
  x: number
  y: number
  vx: number
  vy: number
  outsideMs: number
}

export type Shelf = {
  index: number
  typeIndex: number
  unlocked: boolean
  slots: (string | null)[]
}

export type Toast = {
  id: number
  text: string
  ttl: number
}

export type Player = {
  id: string
  bag: string[]
  bagSize: number
  vacuum: boolean
  vacuumAt: number
  toast: Toast | null
}

export type Session = {
  balls: Map<string, Ball>
  shelves: Shelf[]
  players: Map<string, Player>
  totalValue: number
  status: 'playing' | 'overflow'
  sessionMs: number
  batchMs: number
  overflowMs: number
  nextBall: number
  nextPlayer: number
  toastSeq: number
  toast: Toast | null
  /** Ball types currently dropping, cheapest first. */
  unlockedTypes: number[]
  /** False until the first player joins, so the process stays idle. */
  live: boolean
}

export function createSession(): Session {
  return {
    balls: new Map(),
    shelves: [],
    players: new Map(),
    totalValue: 0,
    status: 'playing',
    sessionMs: 0,
    batchMs: 0,
    overflowMs: 0,
    nextBall: 1,
    nextPlayer: 1,
    toastSeq: 0,
    toast: null,
    unlockedTypes: [],
    live: false,
  }
}
