import './HowToPlay.css'
import { mountHowToStep } from './HowToStep/HowToStep.ts'

const STEPS = [
  {
    title: 'Pick up balls',
    detail: 'Click balls in the bin to bag them. With a vacuum, hold in the bin to pull them in.',
  },
  {
    title: 'Unload a shelf',
    detail: 'Click or hold a matching shelf. Balls leave one at a time, and a full shelf sells.',
  },
  {
    title: 'Upgrade the shop',
    detail: 'The team wallet buys a bigger bag, faster unloading, the vacuum, and new ball types.',
  },
  {
    title: 'Keep the bin clear',
    detail: 'Shipments keep dropping. If the bin stays overfull, the shop overflows.',
  },
] as const

export type HowToPlayHandle = {
  open: () => void
  destroy: () => void
}

export function mountHowToPlay(parent: HTMLElement): HowToPlayHandle {
  const root = document.createElement('div')
  root.className = 'how-to-play'
  root.dataset.open = 'false'
  root.setAttribute('aria-hidden', 'true')
  const panel = document.createElement('section')
  panel.className = 'how-to-play__panel'
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'true')
  panel.setAttribute('aria-labelledby', 'how-to-play-title')
  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'how-to-play__close'
  close.textContent = 'X'
  close.setAttribute('aria-label', 'Close how to play')
  const title = document.createElement('h2')
  title.className = 'how-to-play__title'
  title.id = 'how-to-play-title'
  title.textContent = 'How to play'
  const list = document.createElement('ol')
  list.className = 'how-to-play__steps'
  STEPS.forEach((step, index) => mountHowToStep(list, { index: index + 1, title: step.title, detail: step.detail }))
  panel.append(close, title, list)
  root.append(panel)
  parent.append(root)

  const setOpen = (open: boolean): void => {
    root.dataset.open = open ? 'true' : 'false'
    root.setAttribute('aria-hidden', open ? 'false' : 'true')
    if (open) close.focus()
  }
  close.addEventListener('click', () => setOpen(false))

  return {
    open: () => setOpen(true),
    destroy() {
      root.remove()
    },
  }
}
