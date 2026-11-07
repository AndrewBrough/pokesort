import './UpgradeButton.css'

export type UpgradeButtonProps = {
  kind: string
  label: string
  disabled: boolean
}

export type UpgradeButtonHandle = {
  update: (props: UpgradeButtonProps) => void
  destroy: () => void
}

export function mountUpgradeButton(
  parent: HTMLElement,
  onClick: () => void,
  props: UpgradeButtonProps,
): UpgradeButtonHandle {
  const root = document.createElement('button')
  root.type = 'button'
  root.className = 'upgrade-button'
  const kind = document.createElement('span')
  kind.className = 'upgrade-button__kind'
  const label = document.createElement('span')
  label.className = 'upgrade-button__label'
  root.append(kind, label)
  root.addEventListener('click', onClick)
  parent.append(root)

  const update = (next: UpgradeButtonProps) => {
    kind.textContent = next.kind
    label.textContent = next.label
    root.disabled = next.disabled
  }
  update(props)

  return {
    update,
    destroy() {
      root.remove()
    },
  }
}
