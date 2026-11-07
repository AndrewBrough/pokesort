import './UpgradeBar.css'
import { DEV_GRANT } from '../../data/balance.ts'
import { formatValue } from '../../format.ts'

export type UpgradeBarProps = {
  bagCost: number | null
  vacuumCost: number | null
  vacuumOwned: boolean
  shelfHintOwned: boolean
  shelfHintCost: number | null
  nextTierName: string | null
  nextTierCost: number | null
  totalValue: number
  enabled: boolean
  onBag: () => void
  onVacuum: () => void
  onTier: () => void
  onHint: () => void
}

export type UpgradeBarHandle = {
  update: (props: UpgradeBarProps) => void
  destroy: () => void
}

type UpgradeKind = 'Team Upgrade' | 'Individual Upgrade'

function addButton(parent: HTMLElement, kind: UpgradeKind, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'upgrade-bar__button'
  const kindLabel = document.createElement('span')
  kindLabel.className = 'upgrade-bar__kind'
  kindLabel.textContent = kind
  const label = document.createElement('span')
  label.className = 'upgrade-bar__label'
  button.append(kindLabel, label)
  button.addEventListener('click', onClick)
  parent.append(button)
  return button
}

function setLabel(button: HTMLButtonElement, text: string, disabled: boolean): void {
  const label = button.querySelector('.upgrade-bar__label')
  if (label) label.textContent = text
  button.disabled = disabled
}

export function mountUpgradeBar(
  parent: HTMLElement,
  onBag: () => void,
  onVacuum: () => void,
  onTier: () => void,
  onHint: () => void,
  onGrant: (() => void) | null,
): UpgradeBarHandle {
  const root = document.createElement('section')
  root.className = 'upgrade-bar'
  const tier = addButton(root, 'Team Upgrade', onTier)
  const bag = addButton(root, 'Individual Upgrade', onBag)
  const vacuum = addButton(root, 'Individual Upgrade', onVacuum)
  const hint = addButton(root, 'Individual Upgrade', onHint)
  if (onGrant) {
    const grant = addButton(root, 'Team Upgrade', onGrant)
    setLabel(grant, `Add ${DEV_GRANT}`, false)
  }
  parent.append(root)

  return {
    update(props) {
      const broke = !props.enabled
      if (props.nextTierName === null || props.nextTierCost === null) {
        setLabel(tier, 'All balls unlocked', true)
      } else {
        setLabel(tier, `Unlock ${props.nextTierName} ${formatValue(props.nextTierCost)}`, broke || props.totalValue < props.nextTierCost)
      }
      if (props.bagCost === null) {
        setLabel(bag, 'Your bag is full', true)
      } else {
        setLabel(bag, `Your bag slot ${formatValue(props.bagCost)}`, broke || props.totalValue < props.bagCost)
      }
      if (props.vacuumOwned) {
        setLabel(vacuum, 'Vacuum ready', true)
      } else {
        setLabel(vacuum, `Vacuum ${formatValue(props.vacuumCost ?? 0)}`, broke || props.totalValue < (props.vacuumCost ?? Number.POSITIVE_INFINITY))
      }
      if (props.shelfHintOwned) {
        setLabel(hint, 'Shelves marked', true)
      } else {
        setLabel(hint, `Mark shelves ${formatValue(props.shelfHintCost ?? 0)}`, broke || props.totalValue < (props.shelfHintCost ?? Number.POSITIVE_INFINITY))
      }
    },
    destroy() {
      root.remove()
    },
  }
}
