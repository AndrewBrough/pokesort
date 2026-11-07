import { BALL_SIZE } from './ball.ts'

export const BIN_CAPACITY = 2000
export const OVERFLOW_LIMIT_MS = 2500
export const SIM_STEP_MS = 50
export const SNAPSHOT_EVERY_STEPS = 2
export const BALL_RADIUS = 15
export const VACUUM_RADIUS = 120
/** How fast a pulled ball slides toward the pointer, in pixels per second. */
export const VACUUM_PULL_SPEED = 360
/** Pointer must sit inside the 32×32 ball before it is picked up. */
export const VACUUM_CATCH_RADIUS = BALL_SIZE / 2
/** Drop a held aim if the client stops sending it. */
export const VACUUM_AIM_MS = 200
export const VACUUM_COST = 3500
/** Outlines shelves that match a ball in your bag. */
export const SHELF_HINT_COST = 2500

/** Every unlocked ball type drops this many balls each batch. */
export const DROP_RATE = 10
export const BATCH_INTERVAL_MS = 14_000

/** Price of the next tier is its ball value times this factor. */
export const TIER_COST_FACTOR = 6

/** Dev client only. Production servers ignore the grant message. */
export const DEV_GRANT = 1000000

export const STARTING_BAG = 3
export const MAX_BAG = 24
export const BAG_BASE_COST = 800

export function nextBagCost(bagSize: number): number | null {
  if (bagSize >= MAX_BAG) return null
  return BAG_BASE_COST * 2 ** (bagSize - 1)
}

export function tierUnlockCost(ballValue: number): number {
  return ballValue * TIER_COST_FACTOR
}
