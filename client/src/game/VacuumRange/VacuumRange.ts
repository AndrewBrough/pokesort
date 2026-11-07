import { Container, Graphics } from 'pixi.js'
import { VACUUM_RADIUS } from '../../data/balance.ts'

export type VacuumRangeProps = {
  visible: boolean
  x: number
  y: number
}

export class VacuumRange extends Container {
  constructor() {
    super()
    const ring = new Graphics()
    ring.circle(0, 0, VACUUM_RADIUS).fill({ color: 0xfff6d2, alpha: 0.06 })
    ring.circle(0, 0, VACUUM_RADIUS).stroke({ width: 2, color: 0xfff6d2, alpha: 0.35, pixelLine: true })
    this.addChild(ring)
    this.visible = false
  }

  update(props: VacuumRangeProps): void {
    this.visible = props.visible
    this.position.set(Math.round(props.x), Math.round(props.y))
  }
}
