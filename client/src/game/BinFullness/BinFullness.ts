import { Text } from 'pixi.js'
import { BIN } from '../../data/layout.ts'

export type BinFullnessProps = {
  percent: number
  overflowing: boolean
}

export class BinFullness extends Text {
  constructor() {
    super({
      text: '0%',
      style: {
        fontFamily: 'ui-monospace, monospace',
        fontSize: 18,
        fill: 0xf6e7c1,
        fontWeight: '700',
      },
      resolution: 2,
    })
    this.anchor.set(0.5, 0)
    this.position.set(BIN.x + BIN.w / 2, BIN.y + BIN.h + 14)
  }

  update(props: BinFullnessProps): void {
    this.text = `${props.percent}%`
    this.style.fill = props.overflowing ? 0xffb4a8 : 0xf6e7c1
  }
}
