import { BALL_ART } from './ball.ts'

export const BIN_CAPACITY = 2500
export const OVERFLOW_LIMIT_MS = 3000
export const SIM_STEP_MS = 50
export const SNAPSHOT_EVERY_STEPS = 2
export const BALL_RADIUS = BALL_ART.size / 2
/** Size and strength each stop here until more levels are added. */
export const VACUUM_LEVELS = 10
/** Level 0 is smaller than the original 120px vacuum. Level 10 passes it. */
export const VACUUM_RADIUS_BASE = 64
export const VACUUM_RADIUS_STEP = 8
/** Level 0 is slower than the original 360px/s pull. Level 10 passes it. */
export const VACUUM_PULL_BASE = 160
export const VACUUM_PULL_STEP = 28
/** Pointer must sit on the painted ball before it is picked up. */
export const VACUUM_CATCH_RADIUS = BALL_RADIUS
/** Drop a held aim if the client stops sending it. */
export const VACUUM_AIM_MS = 200
/** Ball-on-ball hits slower than this (px/s) stay silent. */
export const HIT_MIN_SPEED = 30
/** Loudest hits kept per snapshot, and the most clacks playing at once. */
export const HIT_VOICES = 7
export const VACUUM_COST = 3500
export const VACUUM_SIZE_BASE_COST = 1600
export const VACUUM_STRENGTH_BASE_COST = 1800
const VACUUM_STAT_COST_STEP = 0.5
/** Outlines shelves that match a ball in your bag. */
export const SHELF_HINT_COST = 2500

/** Every unlocked ball type drops this many balls each batch. */
export const DROP_RATE = 10
export const BATCH_INTERVAL_MS = 14_000
/** Share of the bin a batch is scattered across. */
export const DROP_SPREAD = 0.025
/** A batch finishes appearing within this long. */
export const DROP_WINDOW_MS = 1500

/** Price of the next tier is its ball value times this factor. */
export const TIER_COST_FACTOR = 6

/** Dev client only. Production servers ignore the grant message. */
export const DEV_GRANT = 1000000

export const STARTING_BAG = 3
export const MAX_BAG = 999
export const BAG_BASE_COST = 800
/** Each extra slot adds half the base price. */
export const BAG_COST_STEP = 0.5

export function nextBagCost(bagSize: number): number | null {
  if (bagSize >= MAX_BAG) return null
  return BAG_BASE_COST * (1 + BAG_COST_STEP * (bagSize - 1))
}

export function tierUnlockCost(ballValue: number): number {
  return ballValue * TIER_COST_FACTOR
}

function clampVacuumLevel(level: number): number {
  if (level < 0) return 0
  if (level > VACUUM_LEVELS) return VACUUM_LEVELS
  return level
}

export function vacuumRadius(level: number): number {
  return VACUUM_RADIUS_BASE + VACUUM_RADIUS_STEP * clampVacuumLevel(level)
}

export function vacuumPullSpeed(level: number): number {
  return VACUUM_PULL_BASE + VACUUM_PULL_STEP * clampVacuumLevel(level)
}

function vacuumStatCost(base: number, level: number): number | null {
  if (level >= VACUUM_LEVELS) return null
  return Math.round(base * (1 + VACUUM_STAT_COST_STEP * level))
}

export function nextVacuumSizeCost(level: number): number | null {
  return vacuumStatCost(VACUUM_SIZE_BASE_COST, level)
}

export function nextVacuumStrengthCost(level: number): number | null {
  return vacuumStatCost(VACUUM_STRENGTH_BASE_COST, level)
}
