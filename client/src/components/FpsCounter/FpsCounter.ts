import './FpsCounter.css'

export type FpsCounterProps = {
  dtMs: number
}

export type FpsCounterHandle = {
  sample: (props: FpsCounterProps) => void
  destroy: () => void
}

const WINDOW_MS = 500

export function mountFpsCounter(parent: HTMLElement): FpsCounterHandle {
  const root = document.createElement('p')
  root.className = 'fps-counter'
  root.textContent = '— FPS'
  parent.append(root)
  let elapsed = 0
  let frames = 0
  let shown = ''

  return {
    sample({ dtMs }) {
      elapsed += dtMs
      frames += 1
      if (elapsed < WINDOW_MS) return
      const text = `${Math.round((frames * 1000) / elapsed)} FPS`
      elapsed = 0
      frames = 0
      if (text === shown) return
      shown = text
      root.textContent = text
    },
    destroy() {
      root.remove()
    },
  }
}
