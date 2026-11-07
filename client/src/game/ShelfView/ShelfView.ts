import { Container, Graphics, Sprite, Text, type Texture } from 'pixi.js'
import { ballByIndex } from '../../data/ball.ts'
import { SHELF_CAPACITY, SHELF_H, SHELF_W, slotCenter } from '../../data/layout.ts'

export type ShelfViewProps = {
  typeIndex: number
  filled: number
  hinted: boolean
}

export class ShelfView extends Container {
  readonly index: number
  private readonly namePlate: Text
  private readonly mark: Graphics
  private readonly slots: Sprite[]

  constructor(index: number, x: number, y: number, texture: Texture) {
    super()
    this.index = index
    this.position.set(x, y)
    const board = new Graphics()
    board.rect(0, 0, SHELF_W, SHELF_H).fill(0x3b2412)
    board.rect(2, 2, SHELF_W - 4, SHELF_H - 4).fill(0xc68642)
    board.rect(4, 16, SHELF_W - 8, SHELF_H - 22).fill(0x6b3a1c)
    board.rect(4, 3, SHELF_W - 8, 12).fill(0xf0d7a8)
    this.addChild(board)
    this.namePlate = new Text({
      text: '',
      style: { fontFamily: 'ui-monospace, monospace', fontSize: 10, fill: 0x2a160c },
      resolution: 2,
    })
    this.namePlate.anchor.set(0.5, 0)
    this.namePlate.position.set(SHELF_W / 2, 3)
    this.addChild(this.namePlate)
    this.mark = new Graphics()
    this.slots = Array.from({ length: SHELF_CAPACITY }, (_, slot) => {
      const sprite = new Sprite(texture)
      sprite.anchor.set(0.5)
      sprite.scale.set(0.5)
      sprite.roundPixels = true
      sprite.visible = false
      const center = slotCenter(slot)
      sprite.position.set(center.x, center.y)
      this.addChild(sprite)
      return sprite
    })
    this.addChild(this.mark)
  }

  update(props: ShelfViewProps, texture: Texture): void {
    const ball = ballByIndex(props.typeIndex)
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

  hit(x: number, y: number): boolean {
    return x >= this.x && y >= this.y && x < this.x + SHELF_W && y < this.y + SHELF_H
  }
}
