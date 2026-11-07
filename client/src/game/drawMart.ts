import type { Graphics } from 'pixi.js'
import { BIN } from '../data/layout.ts'

export type MartView = {
  x: number
  y: number
  width: number
  height: number
}

const TILE = 40

export function drawMart(graphics: Graphics, view: MartView): void {
  graphics.clear()
  const x0 = Math.floor(view.x / TILE) * TILE
  const y0 = Math.floor(view.y / TILE) * TILE
  const x1 = view.x + view.width + TILE
  const y1 = view.y + view.height + TILE
  for (let y = y0; y < y1; y += TILE) {
    for (let x = x0; x < x1; x += TILE) {
      const alt = (Math.floor(x / TILE) + Math.floor(y / TILE)) % 2 === 0
      graphics.rect(x, y, TILE, TILE).fill(alt ? 0xc4a36a : 0xb5925c)
    }
  }
  const rim = 10
  graphics.rect(BIN.x - rim, BIN.y - rim, BIN.w + rim * 2, BIN.h + rim * 2).fill(0x4a3424)
  graphics.rect(BIN.x, BIN.y, BIN.w, BIN.h).fill(0x2a2118)
}
