import './BagPanel.css'
import type { BagBallSnapshot } from '../../data/messages.ts'
import { ballByIndex } from '../../data/ball.ts'
import { mountBagCount } from './BagCount/BagCount.ts'

export type BagPanelProps = {
  balls: readonly BagBallSnapshot[]
  bagSize: number
  onDrop: (ballId: string) => void
}

export type BagPanelHandle = {
  update: (props: BagPanelProps) => void
  destroy: () => void
}

type BagStack = {
  typeIndex: number
  count: number
  ballId: string
}

function stacksOf(balls: readonly BagBallSnapshot[]): BagStack[] {
  const byType = new Map<number, BagStack>()
  for (const ball of balls) {
    const stack = byType.get(ball.typeIndex)
    if (stack) stack.count += 1
    else byType.set(ball.typeIndex, { typeIndex: ball.typeIndex, count: 1, ballId: ball.id })
  }
  return [...byType.values()].sort(
    (a, b) => ballByIndex(a.typeIndex).value - ballByIndex(b.typeIndex).value || a.typeIndex - b.typeIndex,
  )
}

export function mountBagPanel(parent: HTMLElement, onDrop: (ballId: string) => void): BagPanelHandle {
  const root = document.createElement('section')
  root.className = 'bag-panel'
  const title = document.createElement('h2')
  title.className = 'bag-panel__title'
  title.textContent = 'Bag 0/0'
  const counts = document.createElement('div')
  counts.className = 'bag-panel__counts'
  root.append(title, counts)
  parent.append(root)

  return {
    update(props) {
      title.textContent = `Bag ${props.balls.length}/${props.bagSize}`
      counts.replaceChildren()
      for (const stack of stacksOf(props.balls)) {
        mountBagCount(counts, {
          typeIndex: stack.typeIndex,
          count: stack.count,
          onDrop: () => onDrop(stack.ballId),
        })
      }
    },
    destroy() {
      root.remove()
    },
  }
}
