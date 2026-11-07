import { BALL_RADIUS, HIT_MIN_SPEED, VACUUM_CATCH_RADIUS } from '../../shared/data/balance.ts'
import { BIN } from '../../shared/data/layout.ts'
import type { HitSnapshot } from '../../shared/data/messages.ts'
import type { Ball } from './session.ts'

export type VacuumPull = {
  playerId: string
  x: number
  y: number
  /** Types already in the bag. Ignored unless `selective` is set. */
  types: ReadonlySet<number>
  /** Owned match-bag upgrade. Otherwise every ball in range is pulled. */
  selective: boolean
  radius: number
  speed: number
}

export type VacuumCatch = {
  id: string
  playerId: string
}

function pairKey(a: Ball, b: Ball): string {
  return a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`
}

function separate(a: Ball, b: Ball, rest: number, heard: Set<string>, hits: HitSnapshot[]): void {
  let dx = b.x - a.x
  let dy = b.y - a.y
  const distSq = dx * dx + dy * dy
  const min = rest
  if (distSq >= min * min) return
  if (distSq < 0.01) {
    const angle = Math.random() * Math.PI * 2
    a.x -= Math.cos(angle) * 0.6
    a.y -= Math.sin(angle) * 0.6
    b.x += Math.cos(angle) * 0.6
    b.y += Math.sin(angle) * 0.6
    return
  }
  const dist = Math.sqrt(distSq)
  const nx = dx / dist
  const ny = dy / dist
  const push = (min - dist) / 2
  a.x -= nx * push
  a.y -= ny * push
  b.x += nx * push
  b.y += ny * push
  const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
  if (rel < 0) {
    const impulse = rel * 0.45
    a.vx += nx * impulse
    a.vy += ny * impulse
    b.vx -= nx * impulse
    b.vy -= ny * impulse
    const speed = -rel
    const key = pairKey(a, b)
    if (speed >= HIT_MIN_SPEED && !heard.has(key)) {
      heard.add(key)
      hits.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, speed })
    }
  }
}

function nearestPull(ball: Ball, pulls: readonly VacuumPull[]): VacuumPull | null {
  let best: VacuumPull | null = null
  let bestDist = Number.POSITIVE_INFINITY
  for (const pull of pulls) {
    if (pull.selective && !pull.types.has(ball.typeIndex)) continue
    const dx = pull.x - ball.x
    const dy = pull.y - ball.y
    const dist = dx * dx + dy * dy
    if (dist > pull.radius * pull.radius || dist > bestDist) continue
    best = pull
    bestDist = dist
  }
  return best
}

function overlapsPointer(ball: Ball, pull: VacuumPull): boolean {
  return Math.abs(ball.x - pull.x) <= VACUUM_CATCH_RADIUS && Math.abs(ball.y - pull.y) <= VACUUM_CATCH_RADIUS
}

/** Returns spilled when a ball has stayed outside the bin during an overflow. */
export function stepBin(
  balls: Iterable<Ball>,
  fullness: number,
  leak: number,
  dt: number,
  pulls: readonly VacuumPull[] = [],
): { spilled: boolean; caught: VacuumCatch[]; hits: HitSnapshot[] } {
  const binBalls: Ball[] = []
  for (const ball of balls) {
    if (ball.where === 'bin') binBalls.push(ball)
  }
  const hold = fullness <= 1
  const tightness = hold ? 1 - 0.5 * Math.max(0, fullness) : 0.4
  const rest = BALL_RADIUS * 2 * tightness
  const left = BIN.x + BALL_RADIUS - leak
  const right = BIN.x + BIN.w - BALL_RADIUS + leak
  const top = BIN.y + BALL_RADIUS - leak
  const bottom = BIN.y + BIN.h - BALL_RADIUS + leak

  const pulled = new Set<Ball>()
  for (const ball of binBalls) {
    const drag = Math.exp(-1.4 * dt)
    ball.vx *= drag
    ball.vy *= drag
    const pull = nearestPull(ball, pulls)
    if (pull) pulled.add(ball)
    ball.x += ball.vx * dt
    ball.y += ball.vy * dt
  }

  const loose = binBalls.filter((ball) => !pulled.has(ball))
  const hits: HitSnapshot[] = []
  const heard = new Set<string>()
  for (let iter = 0; iter < 4; iter++) {
    for (let i = 0; i < loose.length; i++) {
      for (let j = i + 1; j < loose.length; j++) separate(loose[i], loose[j], rest, heard, hits)
    }
    for (const ball of loose) {
      if (ball.x < left) {
        ball.x = left
        ball.vx = Math.abs(ball.vx) * 0.35
      } else if (ball.x > right) {
        ball.x = right
        ball.vx = -Math.abs(ball.vx) * 0.35
      }
      if (ball.y < top) {
        ball.y = top
        ball.vy = Math.abs(ball.vy) * 0.35
      } else if (ball.y > bottom) {
        ball.y = bottom
        ball.vy = -Math.abs(ball.vy) * 0.35
      }
    }
  }

  const caught: VacuumCatch[] = []
  for (const ball of pulled) {
    const pull = nearestPull(ball, pulls)
    if (!pull) continue
    if (overlapsPointer(ball, pull)) {
      caught.push({ id: ball.id, playerId: pull.playerId })
      ball.vx = 0
      ball.vy = 0
      continue
    }
    const dx = pull.x - ball.x
    const dy = pull.y - ball.y
    const dist = Math.hypot(dx, dy)
    if (dist > 0.01) {
      const step = Math.min(pull.speed * dt, dist)
      ball.x += (dx / dist) * step
      ball.y += (dy / dist) * step
    }
  }

  if (hold) {
    for (const ball of binBalls) ball.outsideMs = 0
    return { spilled: false, caught, hits }
  }

  let spilled = false
  for (const ball of loose) {
    const outside = ball.x < BIN.x || ball.x > BIN.x + BIN.w || ball.y > BIN.y + BIN.h
    ball.outsideMs = outside ? ball.outsideMs + dt * 1000 : 0
    if (ball.outsideMs > 1200) spilled = true
  }
  return { spilled, caught, hits }
}
