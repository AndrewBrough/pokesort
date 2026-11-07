import './DevGrant.css'
import { DEV_GRANT } from '../../data/balance.ts'

export type DevGrantProps = {
  onGrant: () => void
}

export type DevGrantHandle = {
  destroy: () => void
}

export function mountDevGrant(parent: HTMLElement, onGrant: () => void): DevGrantHandle {
  const root = document.createElement('div')
  root.className = 'dev-grant'
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'dev-grant__button'
  button.textContent = `Add ${DEV_GRANT}`
  button.addEventListener('click', onGrant)
  root.append(button)
  parent.append(root)

  return {
    destroy() {
      root.remove()
    },
  }
}
