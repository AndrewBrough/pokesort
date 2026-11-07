import type { Graphics } from 'pixi.js'
import { BIN, WORLD_H, WORLD_W } from '../data/layout.ts'

export function drawMart(graphics: Graphics): void {
  const tile = 40
  for (let y = 0; y < WORLD_H; y += tile) {
    for (let x = 0; x < WORLD_W; x += tile) {
      const alt = (x / tile + y / tile) % 2 === 0
      graphics.rect(x, y, tile, tile).fill(alt ? 0xc4a36a : 0xb5925c)
    }
  }
  const rim = 10
  graphics.rect(BIN.x - rim, BIN.y - rim, BIN.w + rim * 2, BIN.h + rim * 2).fill(0x4a3424)
  graphics.rect(BIN.x, BIN.y, BIN.w, BIN.h).fill(0x2a2118)
}
