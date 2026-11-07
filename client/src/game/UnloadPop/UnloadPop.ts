import { Container, Sprite, type Texture } from 'pixi.js'

const FLIGHT_MS = 280
const POP = 1.6

type Flight = {
  sprite: Sprite
  shelfIndex: number
  fromX: number
  fromY: number
  toX: number
  toY: number
  age: number
}

export type UnloadPopLaunch = {
  typeIndex: number
  shelfIndex: number
  from: { x: number; y: number }
  to: { x: number; y: number }
}

export class UnloadPop extends Container {
  private readonly flights: Flight[] = []
  private readonly textures: readonly Texture[]

  constructor(textures: readonly Texture[]) {
    super()
    this.textures = textures
  }

  launch(props: UnloadPopLaunch): void {
    const texture = this.textures[props.typeIndex] ?? this.textures[0]
    if (!texture) return
    const sprite = new Sprite(texture)
    sprite.anchor.set(0.5)
    sprite.scale.set(0)
    sprite.position.set(props.from.x, props.from.y)
    sprite.roundPixels = true
    this.addChild(sprite)
    this.flights.push({
      sprite,
      shelfIndex: props.shelfIndex,
      fromX: props.from.x,
      fromY: props.from.y,
      toX: props.to.x,
      toY: props.to.y,
      age: 0,
    })
  }

  step(dtMs: number): void {
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const flight = this.flights[i]
      flight.age += dtMs
      const t = Math.min(1, flight.age / FLIGHT_MS)
      flight.sprite.position.set(
        flight.fromX + (flight.toX - flight.fromX) * t,
        flight.fromY + (flight.toY - flight.fromY) * t,
      )
      flight.sprite.scale.set(Math.sin(t * Math.PI) * POP)
      if (t < 1) continue
      flight.sprite.destroy()
      this.flights.splice(i, 1)
    }
  }

  lag(): ReadonlyMap<number, number> {
    const counts = new Map<number, number>()
    for (const flight of this.flights) counts.set(flight.shelfIndex, (counts.get(flight.shelfIndex) ?? 0) + 1)
    return counts
  }

  shelves(): readonly number[] {
    return this.flights.map((flight) => flight.shelfIndex)
  }
}
