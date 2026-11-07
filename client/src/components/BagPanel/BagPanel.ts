import './BagPanel.css'
import { BALL_SIZE, SHEET_COLUMNS, ballByIndex } from '../../data/ball.ts'
import type { BagBallSnapshot } from '../../data/messages.ts'

export type BagPanelProps = {
  balls: readonly BagBallSnapshot[]
  bagSize: number
  onDrop: (ballId: string) => void
}

export type BagPanelHandle = {
  update: (props: BagPanelProps) => void
  destroy: () => void
}

export function mountBagPanel(parent: HTMLElement, onDrop: (ballId: string) => void): BagPanelHandle {
  const root = document.createElement('section')
  root.className = 'bag-panel'
  const title = document.createElement('h2')
  title.className = 'bag-panel__title'
  title.textContent = 'Bag'
  const slots = document.createElement('div')
  slots.className = 'bag-panel__slots'
  root.append(title, slots)
  parent.append(root)

  return {
    update(props) {
      slots.replaceChildren()
      for (let index = 0; index < props.bagSize; index++) {
        const ball = props.balls[index]
        const button = document.createElement('button')
        button.type = 'button'
        button.className = 'bag-panel__slot'
        button.disabled = !ball
        if (!ball) {
          button.textContent = 'Empty'
          slots.append(button)
          continue
        }
        const type = ballByIndex(ball.typeIndex)
        button.title = `${type.name} · drop into bin`
        button.setAttribute('aria-label', `Drop ${type.name} into the bin`)
        const sprite = document.createElement('span')
        sprite.className = 'bag-panel__sprite'
        const column = ball.typeIndex % SHEET_COLUMNS
        const row = Math.floor(ball.typeIndex / SHEET_COLUMNS)
        sprite.style.backgroundPosition = `${-column * BALL_SIZE}px ${-row * BALL_SIZE}px`
        button.append(sprite)
        button.addEventListener('click', () => onDrop(ball.id))
        slots.append(button)
      }
    },
    destroy() {
      root.remove()
    },
  }
}
