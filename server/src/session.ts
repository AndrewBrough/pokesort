import type { HitSnapshot } from '../../shared/data/messages.ts'

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
  /** Stable browser id, used to restore upgrades after a reload. */
  clientKey: string | null
  bag: string[]
  bagSize: number
  vacuum: boolean
  vacuumSize: number
  vacuumStrength: number
  shelfHint: boolean
  vacuumAim: { x: number; y: number; at: number } | null
  cursor: { x: number; y: number } | null
  toast: Toast | null
}

export type ClientUpgrades = {
  bagSize: number
  vacuum: boolean
  vacuumSize: number
  vacuumStrength: number
  shelfHint: boolean
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
  /** Upgrades kept for a browser until the next run. */
  clients: Map<string, ClientUpgrades>
  /** Loud ball-on-ball hits waiting for the next snapshot. */
  hits: HitSnapshot[]
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
    clients: new Map(),
    hits: [],
  }
}
