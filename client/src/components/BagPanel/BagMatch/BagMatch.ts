import './BagMatch.css'

const MATCH_KEY = 'pokesort.matchBag'

export function savedMatch(): boolean {
  try {
    return localStorage.getItem(MATCH_KEY) !== '0'
  } catch {
    return true
  }
}

function storeMatch(on: boolean): void {
  try {
    localStorage.setItem(MATCH_KEY, on ? '1' : '0')
  } catch {
    // Private mode can block storage. The toggle still works until reload.
  }
}

export type BagMatchProps = {
  visible: boolean
}

export type BagMatchHandle = {
  update: (props: BagMatchProps) => void
  destroy: () => void
}

export function mountBagMatch(parent: HTMLElement): BagMatchHandle {
  const root = document.createElement('button')
  root.type = 'button'
  root.className = 'bag-match'
  root.hidden = true
  let on = savedMatch()
  const show = (): void => {
    root.textContent = on ? 'Match on' : 'Match off'
    root.setAttribute('aria-pressed', on ? 'true' : 'false')
    root.setAttribute('aria-label', on ? 'Turn match bag off' : 'Turn match bag on')
  }
  show()
  root.addEventListener('click', () => {
    on = !on
    storeMatch(on)
    show()
  })
  parent.append(root)

  return {
    update(props) {
      root.hidden = !props.visible
    },
    destroy() {
      root.remove()
    },
  }
}
