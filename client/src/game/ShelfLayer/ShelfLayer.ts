import { Container, type Texture } from 'pixi.js'
import { SHELF_CAPACITY, SHELF_FRAMES } from '../../data/layout.ts'
import type { ShelfSnapshot } from '../../data/messages.ts'
import { ShelfView } from '../ShelfView/ShelfView.ts'

function shownFilled(server: number, previous: number, lag: number): number {
  if (server < previous) return server
  if (lag === 0) return server
  return Math.min(server, Math.max(previous, server - lag))
}

export class ShelfLayer extends Container {
  private readonly views = new Map<number, ShelfView>()
  private readonly textures: readonly Texture[]
  private readonly visual = new Map<number, number>()
  private lag: ReadonlyMap<number, number> = new Map()
  private last: readonly ShelfSnapshot[] = []
  private hints = new Set<number>()
  private synced = false

  constructor(textures: readonly Texture[]) {
    super()
    this.textures = textures
  }

  sync(shelves: readonly ShelfSnapshot[], hintTypes: ReadonlySet<number>): void {
    this.last = shelves
    this.hints = new Set(hintTypes)
    this.synced = true
    this.paint()
  }

  setLag(lag: ReadonlyMap<number, number>): void {
    this.lag = lag
    if (this.synced) this.paint()
  }

  showActive(indexes: ReadonlySet<number>): void {
    for (const view of this.views.values()) view.setActive(indexes.has(view.index))
  }

  flyTarget(index: number): { x: number; y: number } | null {
    const view = this.views.get(index)
    if (!view) return null
    const slot = Math.min(SHELF_CAPACITY - 1, view.filled + (this.lag.get(index) ?? 0))
    return view.slotPoint(slot)
  }

  shelfAt(x: number, y: number): number | null {
    for (const view of this.views.values()) {
      if (view.hit(x, y)) return view.index
    }
    return null
  }

  private paint(): void {
    const unlocked = new Set<number>()
    for (const shelf of this.last) {
      if (!shelf.unlocked) continue
      unlocked.add(shelf.index)
      const texture = this.textures[shelf.typeIndex] ?? this.textures[0]
      if (!texture) continue
      let view = this.views.get(shelf.index)
      if (!view) {
        const frame = SHELF_FRAMES.find((entry) => entry.index === shelf.index)
        if (!frame) continue
        view = new ShelfView(shelf.index, frame.x, frame.y, texture)
        this.views.set(shelf.index, view)
        this.addChild(view)
      }
      const previous = this.visual.get(shelf.index) ?? shelf.filled
      const filled = shownFilled(shelf.filled, previous, this.lag.get(shelf.index) ?? 0)
      this.visual.set(shelf.index, filled)
      view.update({ typeIndex: shelf.typeIndex, filled, hinted: this.hints.has(shelf.typeIndex) }, texture)
    }
    for (const [index, view] of this.views) {
      if (unlocked.has(index)) continue
      view.destroy({ children: true })
      this.views.delete(index)
      this.visual.delete(index)
    }
  }
}
