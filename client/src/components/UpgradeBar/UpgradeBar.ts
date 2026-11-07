import './UpgradeBar.css'
import { formatValue } from '../../format.ts'

export type UpgradeBarProps = {
  bagCost: number | null
  vacuumCost: number | null
  vacuumOwned: boolean
  nextTierName: string | null
  nextTierCost: number | null
  totalValue: number
  enabled: boolean
  onBag: () => void
  onVacuum: () => void
  onTier: () => void
}

export type UpgradeBarHandle = {
  update: (props: UpgradeBarProps) => void
  destroy: () => void
}

export function mountUpgradeBar(
  parent: HTMLElement,
  onBag: () => void,
  onVacuum: () => void,
  onTier: () => void,
): UpgradeBarHandle {
  const root = document.createElement('section')
  root.className = 'upgrade-bar'
  const tier = document.createElement('button')
  tier.type = 'button'
  tier.className = 'upgrade-bar__button'
  tier.addEventListener('click', onTier)
  const bag = document.createElement('button')
  bag.type = 'button'
  bag.className = 'upgrade-bar__button'
  bag.addEventListener('click', onBag)
  const vacuum = document.createElement('button')
  vacuum.type = 'button'
  vacuum.className = 'upgrade-bar__button'
  vacuum.addEventListener('click', onVacuum)
  root.append(tier, bag, vacuum)
  parent.append(root)

  return {
    update(props) {
      if (props.nextTierName === null || props.nextTierCost === null) {
        tier.textContent = 'All balls unlocked'
        tier.disabled = true
      } else {
        tier.textContent = `Unlock ${props.nextTierName} ${formatValue(props.nextTierCost)}`
        tier.disabled = !props.enabled || props.totalValue < props.nextTierCost
      }
      if (props.bagCost === null) {
        bag.textContent = 'Your bag is full'
        bag.disabled = true
      } else {
        bag.textContent = `Your bag slot ${formatValue(props.bagCost)}`
        bag.disabled = !props.enabled || props.totalValue < props.bagCost
      }
      if (props.vacuumOwned) {
        vacuum.textContent = 'Vacuum ready'
        vacuum.disabled = true
      } else {
        vacuum.textContent = `Vacuum ${formatValue(props.vacuumCost ?? 0)}`
        vacuum.disabled = !props.enabled || props.totalValue < (props.vacuumCost ?? Number.POSITIVE_INFINITY)
      }
    },
    destroy() {
      root.remove()
    },
  }
}
