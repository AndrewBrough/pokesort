import { Container, Graphics } from 'pixi.js'

export type VacuumRangeProps = {
  visible: boolean
  x: number
  y: number
  radius: number
}

export class VacuumRange extends Container {
  private radius = -1
  private readonly ring = new Graphics()

  constructor() {
    super()
    this.addChild(this.ring)
    this.visible = false
  }

  update(props: VacuumRangeProps): void {
    this.visible = props.visible
    this.position.set(Math.round(props.x), Math.round(props.y))
    if (props.radius === this.radius) return
    this.radius = props.radius
    this.ring.clear()
    this.ring.circle(0, 0, props.radius).fill({ color: 0xfff6d2, alpha: 0.06 })
    this.ring.circle(0, 0, props.radius).stroke({ width: 2, color: 0xfff6d2, alpha: 0.35, pixelLine: true })
  }
}
