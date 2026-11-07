import { Container, Sprite, Texture } from 'pixi.js'
import type { VacuumTarget } from '../BallLayer/BallLayer.ts'

export type VacuumStreamProps = {
  active: boolean
  cursorX: number
  cursorY: number
  targets: readonly VacuumTarget[]
}

type Pixel = {
  sprite: Sprite
}

const PIXELS_PER_BALL = 4
const SPEED = 280

function pixelTexture(): Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 4
  canvas.height = 4
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#fff6d2'
    ctx.fillRect(0, 0, 4, 4)
  }
  const texture = Texture.from(canvas)
  texture.source.scaleMode = 'nearest'
  return texture
}

export class VacuumStream extends Container {
  private readonly texture = pixelTexture()
  private readonly bits: Pixel[] = []
  private props: VacuumStreamProps = { active: false, cursorX: 0, cursorY: 0, targets: [] }

  update(props: VacuumStreamProps): void {
    this.props = props
  }

  step(dtMs: number): void {
    const { active, cursorX, cursorY, targets } = this.props
    if (!active || targets.length === 0) {
      for (const bit of this.bits) bit.sprite.visible = false
      return
    }
    const limit = targets.length * PIXELS_PER_BALL
    while (this.bits.length < limit) {
      const sprite = new Sprite(this.texture)
      sprite.anchor.set(0.5)
      sprite.roundPixels = true
      this.addChild(sprite)
      this.bits.push({ sprite })
      this.place(this.bits[this.bits.length - 1], targets[(this.bits.length - 1) % targets.length], Math.random())
    }
    const dt = dtMs / 1000
    for (let index = 0; index < this.bits.length; index++) {
      const bit = this.bits[index]
      bit.sprite.visible = index < limit
      if (!bit.sprite.visible) continue
      const dx = cursorX - bit.sprite.x
      const dy = cursorY - bit.sprite.y
      const dist = Math.hypot(dx, dy)
      if (dist < 4) {
        this.place(bit, targets[Math.floor(Math.random() * targets.length)], 0)
        continue
      }
      bit.sprite.x += (dx / dist) * SPEED * dt
      bit.sprite.y += (dy / dist) * SPEED * dt
    }
  }

  private place(bit: Pixel, target: VacuumTarget | undefined, along: number): void {
    const startX = target?.x ?? this.props.cursorX
    const startY = target?.y ?? this.props.cursorY
    bit.sprite.x = startX + (this.props.cursorX - startX) * along
    bit.sprite.y = startY + (this.props.cursorY - startY) * along
  }
}
