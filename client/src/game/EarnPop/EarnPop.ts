import { Container, Text } from 'pixi.js'
import { formatValue } from '../../format.ts'
import { UNLOAD_POP_MS } from '../UnloadPop/UnloadPop.ts'

const POP_MS = UNLOAD_POP_MS * 3
const RISE = 12

type Pop = {
  text: Text
  x: number
  y: number
  age: number
}

export type EarnPopLaunch = {
  earned: number
  x: number
  y: number
}

export class EarnPop extends Container {
  private readonly pops: Pop[] = []

  launch(props: EarnPopLaunch): void {
    const text = new Text({
      text: `+${formatValue(props.earned)}`,
      style: {
        fontFamily: 'ui-monospace, monospace',
        fontSize: 22,
        fill: 0xffd56a,
        stroke: { color: 0x2a160c, width: 2 },
        align: 'center',
      },
      resolution: 2,
    })
    text.anchor.set(0.5)
    text.scale.set(0)
    text.position.set(props.x, props.y)
    this.addChild(text)
    this.pops.push({ text, x: props.x, y: props.y, age: 0 })
  }

  step(dtMs: number): void {
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const pop = this.pops[i]
      pop.age += dtMs
      const t = Math.min(1, pop.age / POP_MS)
      const swell = Math.sin(t * Math.PI)
      pop.text.position.set(pop.x, pop.y - swell * RISE)
      pop.text.scale.set(swell)
      if (t < 1) continue
      pop.text.destroy()
      this.pops.splice(i, 1)
    }
  }
}
