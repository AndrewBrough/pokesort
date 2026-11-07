import { Container, type Texture } from 'pixi.js'
import { SHELF_FRAMES } from '../../data/layout.ts'
import type { ShelfSnapshot } from '../../data/messages.ts'
import { ShelfView } from '../ShelfView/ShelfView.ts'

export class ShelfLayer extends Container {
  private readonly views = new Map<number, ShelfView>()
  private readonly textures: readonly Texture[]

  constructor(textures: readonly Texture[]) {
    super()
    this.textures = textures
  }

  sync(shelves: readonly ShelfSnapshot[], hintTypes: ReadonlySet<number>): void {
    const unlocked = new Set<number>()
    for (const shelf of shelves) {
      if (!shelf.unlocked) continue
      unlocked.add(shelf.index)
      const texture = this.textures[shelf.typeIndex] ?? this.textures[0]
      let view = this.views.get(shelf.index)
      if (!view) {
        const frame = SHELF_FRAMES.find((entry) => entry.index === shelf.index)
        if (!frame) continue
        view = new ShelfView(shelf.index, frame.x, frame.y, texture)
        this.views.set(shelf.index, view)
        this.addChild(view)
      }
      view.update(
        { typeIndex: shelf.typeIndex, filled: shelf.filled, hinted: hintTypes.has(shelf.typeIndex) },
        texture,
      )
    }
    for (const [index, view] of this.views) {
      if (unlocked.has(index)) continue
      view.destroy({ children: true })
      this.views.delete(index)
    }
  }

  shelfAt(x: number, y: number): number | null {
    for (const view of this.views.values()) {
      if (view.hit(x, y)) return view.index
    }
    return null
  }
}
