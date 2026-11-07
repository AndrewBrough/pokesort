import './UpgradeBar.css'
import { DEV_GRANT } from '../../data/balance.ts'
import type { UpgradeId } from '../../data/upgrades.ts'
import { mountUpgradeButton, type UpgradeButtonHandle } from '../UpgradeButton/UpgradeButton.ts'
import { upgradeOffers, type UpgradeBarProps } from './upgradeOffers.ts'

export type { UpgradeBarProps } from './upgradeOffers.ts'

export type UpgradeBarHandle = {
  update: (props: UpgradeBarProps) => void
  destroy: () => void
}

export function mountUpgradeBar(
  parent: HTMLElement,
  onUpgrade: (upgrade: UpgradeId) => void,
  onGrant: (() => void) | null,
): UpgradeBarHandle {
  const root = document.createElement('section')
  root.className = 'upgrade-bar'
  parent.append(root)
  const buttons = new Map<UpgradeId, UpgradeButtonHandle>()
  let grant: UpgradeButtonHandle | null = null
  let shown = ''

  const rebuild = (props: UpgradeBarProps) => {
    for (const button of buttons.values()) button.destroy()
    buttons.clear()
    grant?.destroy()
    grant = null
    root.replaceChildren()
    const offers = upgradeOffers(props)
    for (const offer of offers) {
      buttons.set(offer.id, mountUpgradeButton(root, () => onUpgrade(offer.id), offer))
    }
    if (onGrant) {
      grant = mountUpgradeButton(root, onGrant, {
        kind: 'Team Upgrade',
        label: `Add ${DEV_GRANT}`,
        disabled: false,
      })
    }
    shown = offers.map((offer) => offer.id).join(',')
  }

  return {
    update(props) {
      const offers = upgradeOffers(props)
      const next = offers.map((offer) => offer.id).join(',')
      if (next !== shown) {
        rebuild(props)
        return
      }
      for (const offer of offers) buttons.get(offer.id)?.update(offer)
    },
    destroy() {
      for (const button of buttons.values()) button.destroy()
      grant?.destroy()
      root.remove()
    },
  }
}
