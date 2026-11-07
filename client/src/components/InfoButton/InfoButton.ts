import './InfoButton.css'

export type InfoButtonProps = {
  onClick: () => void
}

export type InfoButtonHandle = {
  destroy: () => void
}

export function mountInfoButton(parent: HTMLElement, props: InfoButtonProps): InfoButtonHandle {
  const root = document.createElement('button')
  root.type = 'button'
  root.className = 'info-button'
  root.textContent = 'i'
  root.setAttribute('aria-label', 'How to play')
  root.addEventListener('click', props.onClick)
  parent.append(root)

  return {
    destroy() {
      root.remove()
    },
  }
}
