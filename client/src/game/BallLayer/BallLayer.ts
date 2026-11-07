import { Container, Sprite, type Texture } from 'pixi.js'
import type { BinBallSnapshot } from '../../data/messages.ts'

type BallSprite = Sprite & { targetX: number; targetY: number }

export class BallLayer extends Container {
  private readonly sprites = new Map<string, BallSprite>()
  private readonly textures: readonly Texture[]

  constructor(textures: readonly Texture[]) {
    super()
    this.textures = textures
    this.sortableChildren = true
  }

  sync(balls: readonly BinBallSnapshot[]): void {
    const seen = new Set<string>()
    for (const ball of balls) {
      seen.add(ball.id)
      let sprite = this.sprites.get(ball.id)
      if (!sprite) {
        sprite = new Sprite(this.textures[ball.typeIndex] ?? this.textures[0]) as BallSprite
        sprite.anchor.set(0.5)
        sprite.roundPixels = true
        sprite.x = ball.x
        sprite.y = ball.y
        this.sprites.set(ball.id, sprite)
        this.addChild(sprite)
      }
      sprite.texture = this.textures[ball.typeIndex] ?? this.textures[0]
      sprite.targetX = ball.x
      sprite.targetY = ball.y
    }
    for (const [id, sprite] of this.sprites) {
      if (seen.has(id)) continue
      sprite.destroy()
      this.sprites.delete(id)
    }
  }

  step(dtMs: number): void {
    const blend = 1 - Math.exp(-14 * (dtMs / 1000))
    for (const sprite of this.sprites.values()) {
      const dx = sprite.targetX - sprite.x
      const dy = sprite.targetY - sprite.y
      if (dx * dx + dy * dy > 180 * 180) {
        sprite.x = sprite.targetX
        sprite.y = sprite.targetY
      } else {
        sprite.x += dx * blend
        sprite.y += dy * blend
      }
      sprite.zIndex = sprite.y
    }
  }

  ballAt(x: number, y: number): string | null {
    let best: string | null = null
    let bestDist = 22 * 22
    for (const [id, sprite] of this.sprites) {
      const dx = sprite.x - x
      const dy = sprite.y - y
      const dist = dx * dx + dy * dy
      if (dist <= bestDist) {
        best = id
        bestDist = dist
      }
    }
    return best
  }
}
