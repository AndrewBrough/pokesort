import { VACUUM_LEVELS } from '../../data/balance.ts'
import { visibleUpgrades, type UpgradeDef } from '../../data/upgrades.ts'
import { formatValue } from '../../format.ts'
import type { UpgradeButtonProps } from '../UpgradeButton/UpgradeButton.ts'

export type UpgradeBarProps = {
  bagCost: number | null
  vacuumCost: number | null
  vacuumOwned: boolean
  vacuumSize: number
  vacuumStrength: number
  vacuumSizeCost: number | null
  vacuumStrengthCost: number | null
  shelfHintOwned: boolean
  shelfHintCost: number | null
  nextTierName: string | null
  nextTierCost: number | null
  totalValue: number
  enabled: boolean
}

export type UpgradeOffer = UpgradeButtonProps & {
  id: UpgradeDef['id']
}

function offer(upgrade: UpgradeDef, label: string, disabled: boolean): UpgradeOffer {
  const kind = upgrade.scope === 'team' ? 'Team Upgrade' : 'Individual Upgrade'
  return { id: upgrade.id, kind, label, disabled }
}

function priced(broke: boolean, total: number, cost: number | null, label: string, soldOut: string): { label: string; disabled: boolean } {
  if (cost === null) return { label: soldOut, disabled: true }
  return { label, disabled: broke || total < cost }
}

function describe(upgrade: UpgradeDef, props: UpgradeBarProps, broke: boolean): UpgradeOffer {
  if (upgrade.id === 'tier') {
    const tier = priced(
      broke,
      props.totalValue,
      props.nextTierCost,
      `Unlock ${props.nextTierName ?? 'ball'} ${formatValue(props.nextTierCost ?? 0)}`,
      'All balls unlocked',
    )
    return offer(upgrade, tier.label, props.nextTierName === null || tier.disabled)
  }
  if (upgrade.id === 'bag') {
    const bag = priced(broke, props.totalValue, props.bagCost, `Your bag slot ${formatValue(props.bagCost ?? 0)}`, 'Your bag is full')
    return offer(upgrade, bag.label, bag.disabled)
  }
  if (upgrade.id === 'vacuum') {
    const vacuum = priced(broke, props.totalValue, props.vacuumCost, `Vacuum ${formatValue(props.vacuumCost ?? 0)}`, 'Vacuum ready')
    return offer(upgrade, vacuum.label, vacuum.disabled)
  }
  if (upgrade.id === 'vacuumSize') {
    const size = priced(
      broke,
      props.totalValue,
      props.vacuumSizeCost,
      `Vacuum size ${props.vacuumSize}/${VACUUM_LEVELS} ${formatValue(props.vacuumSizeCost ?? 0)}`,
      `Vacuum size ${VACUUM_LEVELS}/${VACUUM_LEVELS}`,
    )
    return offer(upgrade, size.label, size.disabled)
  }
  if (upgrade.id === 'vacuumStrength') {
    const strength = priced(
      broke,
      props.totalValue,
      props.vacuumStrengthCost,
      `Vacuum strength ${props.vacuumStrength}/${VACUUM_LEVELS} ${formatValue(props.vacuumStrengthCost ?? 0)}`,
      `Vacuum strength ${VACUUM_LEVELS}/${VACUUM_LEVELS}`,
    )
    return offer(upgrade, strength.label, strength.disabled)
  }
  const hint = priced(
    broke,
    props.totalValue,
    props.shelfHintCost,
    `Mark shelves ${formatValue(props.shelfHintCost ?? 0)}`,
    'Shelves marked',
  )
  return offer(upgrade, hint.label, hint.disabled)
}

export function upgradeOffers(props: UpgradeBarProps): UpgradeOffer[] {
  const levels = {
    vacuum: props.vacuumOwned ? 1 : 0,
    vacuumSize: props.vacuumSize,
    vacuumStrength: props.vacuumStrength,
    hint: props.shelfHintOwned ? 1 : 0,
  }
  const broke = !props.enabled
  return visibleUpgrades(levels).map((upgrade) => describe(upgrade, props, broke))
}
