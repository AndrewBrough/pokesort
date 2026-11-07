import { Container, Graphics } from 'pixi.js'
import type { CursorSnapshot } from '../../data/messages.ts'

export type PlayerCursorsProps = {
  cursors: readonly CursorSnapshot[]
}

export type LocalCursor = {
  x: number
  y: number
}

const DOT_RADIUS = 6
const BREATH_MS = 2400
const IDLE_MS = 1000
const FADE_MS = 400

type Dot = {
  gfx: Graphics
  x: number
  y: number
  targetX: number
  targetY: number
  stillMs: number
  phase: number
  mine: boolean
}

function phaseOf(id: string): number {
  let hash = 0
  for (const char of id) hash = (hash * 33 + char.charCodeAt(0)) % BREATH_MS
  return hash
}

export class PlayerCursors extends Container {
  private readonly dots = new Map<string, Dot>()
  private self: Dot | null = null
  private elapsed = 0

  sync(props: PlayerCursorsProps): void {
    const seen = new Set<string>()
    for (const cursor of props.cursors) {
      seen.add(cursor.id)
      const existing = this.dots.get(cursor.id)
      const dot = existing ?? this.spawn(cursor.x, cursor.y, cursor.id, false)
      if (!existing) this.dots.set(cursor.id, dot)
      if (dot.targetX !== cursor.x || dot.targetY !== cursor.y) {
        dot.stillMs = 0
        dot.targetX = cursor.x
        dot.targetY = cursor.y
      }
    }
    for (const [id, dot] of this.dots) {
      if (seen.has(id)) continue
      dot.gfx.destroy()
      this.dots.delete(id)
    }
  }

  showSelf(point: LocalCursor | null): void {
    if (!point) return
    if (!this.self) this.self = this.spawn(point.x, point.y, 'you', true)
    this.self.targetX = point.x
    this.self.targetY = point.y
    this.addChild(this.self.gfx)
  }

  step(dtMs: number): void {
    this.elapsed += dtMs
    const blend = 1 - Math.exp(-18 * (dtMs / 1000))
    const dots = this.self ? [...this.dots.values(), this.self] : [...this.dots.values()]
    for (const dot of dots) {
      dot.x += (dot.targetX - dot.x) * blend
      dot.y += (dot.targetY - dot.y) * blend
      if (!dot.mine) dot.stillMs += dtMs
      const breath = 0.5 + 0.5 * Math.sin((((this.elapsed + dot.phase) / BREATH_MS) * Math.PI) * 2)
      const idle = dot.mine ? 0 : Math.max(0, dot.stillMs - IDLE_MS)
      const fade = dot.mine ? 1 : Math.max(0, 1 - idle / FADE_MS)
      dot.gfx.visible = fade > 0.02
      dot.gfx.alpha = (0.32 + breath * 0.36) * fade
      dot.gfx.scale.set(0.82 + breath * 0.36)
      dot.gfx.position.set(Math.round(dot.x), Math.round(dot.y))
    }
  }

  private spawn(x: number, y: number, id: string, mine: boolean): Dot {
    const gfx = new Graphics()
    gfx.circle(0, 0, DOT_RADIUS).fill({ color: 0xffffff })
    gfx.position.set(Math.round(x), Math.round(y))
    this.addChild(gfx)
    return { gfx, x, y, targetX: x, targetY: y, stillMs: 0, phase: phaseOf(id), mine }
  }
}
