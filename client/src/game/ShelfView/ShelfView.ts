import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js'
import { BALL_SIZE, ballByIndex } from '../../data/ball.ts'
import { SHELF_CAPACITY, SHELF_H, SHELF_LABEL_H, SHELF_W, SLOT, slotCenter } from '../../data/layout.ts'

const UNLOAD_SCALE = 1.1

export type ShelfViewProps = {
  typeIndex: number
  filled: number
  hinted: boolean
}

export class ShelfView extends Container {
  readonly index: number
  private readonly originX: number
  private readonly originY: number
  private readonly namePlate: Text
  private readonly mark: Graphics
  private readonly slots: Sprite[]
  private shown = 0

  constructor(index: number, x: number, y: number, texture: Texture) {
    super()
    this.index = index
    this.originX = x
    this.originY = y
    this.position.set(x, y)
    const board = new Graphics()
    board.rect(0, 0, SHELF_W, SHELF_H).fill(0x3b2412)
    board.rect(2, 2, SHELF_W - 4, SHELF_H - 4).fill(0xc68642)
    board.rect(4, SHELF_LABEL_H, SHELF_W - 8, SHELF_H - SHELF_LABEL_H - 4).fill(0x6b3a1c)
    board.rect(4, 3, SHELF_W - 8, SHELF_LABEL_H - 4).fill(0xf0d7a8)
    this.addChild(board)
    this.namePlate = new Text({
      text: '',
      style: { fontFamily: 'ui-monospace, monospace', fontSize: 8, fill: 0x2a160c },
      resolution: 2,
    })
    this.namePlate.anchor.set(0.5, 0)
    this.namePlate.position.set(SHELF_W / 2, 3)
    this.addChild(this.namePlate)
    this.mark = new Graphics()
    this.slots = Array.from({ length: SHELF_CAPACITY }, (_, slot) => {
      const sprite = new Sprite(texture)
      sprite.anchor.set(0.5)
      sprite.scale.set(SLOT / BALL_SIZE)
      sprite.roundPixels = true
      sprite.visible = false
      const center = slotCenter(slot)
      sprite.position.set(center.x, center.y)
      this.addChild(sprite)
      return sprite
    })
    this.addChild(this.mark)
  }

  get filled(): number {
    return this.shown
  }

  update(props: ShelfViewProps, texture: Texture): void {
    const ball = ballByIndex(props.typeIndex)
    this.shown = props.filled
    this.namePlate.text = `${ball.shortName} ${props.filled}/${SHELF_CAPACITY}`
    this.mark.clear()
    if (props.hinted) {
      this.mark.rect(1, 1, SHELF_W - 2, SHELF_H - 2).stroke({ width: 4, color: ball.accent })
    }
    for (let slot = 0; slot < this.slots.length; slot++) {
      const sprite = this.slots[slot]
      sprite.texture = texture
      sprite.visible = slot < props.filled
    }
  }

  setActive(active: boolean): void {
    const scale = active ? UNLOAD_SCALE : 1
    const growX = (SHELF_W * (scale - 1)) / 2
    const growY = (SHELF_H * (scale - 1)) / 2
    this.scale.set(scale)
    this.position.set(this.originX - growX, this.originY - growY)
  }

  slotPoint(slot: number): { x: number; y: number } {
    const local = slotCenter(slot)
    return { x: this.x + local.x * this.scale.x, y: this.y + local.y * this.scale.y }
  }

  hit(x: number, y: number): boolean {
    const width = SHELF_W * this.scale.x
    const height = SHELF_H * this.scale.y
    return x >= this.x && y >= this.y && x < this.x + width && y < this.y + height
  }
}
