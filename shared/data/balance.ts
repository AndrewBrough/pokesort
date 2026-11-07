export const BIN_CAPACITY = 3200
export const OVERFLOW_LIMIT_MS = 7000
export const SIM_STEP_MS = 50
export const SNAPSHOT_EVERY_STEPS = 2
export const BALL_RADIUS = 15
export const VACUUM_RADIUS = 120
export const VACUUM_COOLDOWN_MS = 130
export const VACUUM_COST = 3500

/** Every unlocked ball type drops this many balls each batch. */
export const DROP_RATE = 10
export const BATCH_INTERVAL_MS = 14_000

/** Price of the next tier is its ball value times this factor. */
export const TIER_COST_FACTOR = 6

export const STARTING_BAG = 3
export const MAX_BAG = 6
export const BAG_COSTS = [800, 2000, 4500, 9000, 16000] as const

export function nextBagCost(bagSize: number): number | null {
  if (bagSize >= MAX_BAG) return null
  return BAG_COSTS[bagSize - 1] ?? null
}

export function tierUnlockCost(ballValue: number): number {
  return ballValue * TIER_COST_FACTOR
}
