import { Assets, Rectangle, Texture } from 'pixi.js'
import { BALL_ART, BALL_SIZE, BALL_TYPES, SHEET_COLUMNS } from '../data/ball.ts'

export async function loadBallTextures(): Promise<Texture[]> {
  const sheet = await Assets.load<Texture>('/pokeballs_emerald.png')
  sheet.source.scaleMode = 'nearest'
  return BALL_TYPES.map((_, index) => {
    const col = index % SHEET_COLUMNS
    const row = Math.floor(index / SHEET_COLUMNS)
    return new Texture({
      source: sheet.source,
      frame: new Rectangle(
        col * BALL_SIZE + BALL_ART.x,
        row * BALL_SIZE + BALL_ART.y,
        BALL_ART.size,
        BALL_ART.size,
      ),
    })
  })
}
