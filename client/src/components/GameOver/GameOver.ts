import './GameOver.css'

export type GameOverProps = {
  visible: boolean
  onRestart: () => void
}

export type GameOverHandle = {
  update: (props: GameOverProps) => void
  destroy: () => void
}

export function mountGameOver(parent: HTMLElement, onRestart: () => void): GameOverHandle {
  const root = document.createElement('section')
  root.className = 'game-over'
  root.dataset.visible = 'false'
  const title = document.createElement('h2')
  title.className = 'game-over__title'
  title.textContent = 'The bin overflowed'
  const copy = document.createElement('p')
  copy.className = 'game-over__copy'
  copy.textContent = 'The shipment buried the shop. Open a fresh bin to try again.'
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'game-over__restart'
  button.textContent = 'Open a new shop'
  button.addEventListener('click', onRestart)
  root.append(title, copy, button)
  parent.append(root)

  return {
    update(props) {
      root.dataset.visible = props.visible ? 'true' : 'false'
    },
    destroy() {
      root.remove()
    },
  }
}
