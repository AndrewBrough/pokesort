import './BagPanel.css'
import { SHEET_COLUMNS, ballByIndex } from '../../data/ball.ts'
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
        sprite.style.setProperty('--ball-col', String(ball.typeIndex % SHEET_COLUMNS))
        sprite.style.setProperty('--ball-row', String(Math.floor(ball.typeIndex / SHEET_COLUMNS)))
        const name = document.createElement('span')
        name.className = 'bag-panel__name'
        name.textContent = type.shortName
        button.append(sprite, name)
        button.addEventListener('click', () => onDrop(ball.id))
        slots.append(button)
      }
    },
    destroy() {
      root.remove()
    },
  }
}
