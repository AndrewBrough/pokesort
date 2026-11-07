import { STARTING_BAG } from '../../data/balance.ts'
import type { WorldSnapshot } from '../../data/messages.ts'
import type { UpgradeBarProps } from '../UpgradeBar/upgradeOffers.ts'

export function screenUpgradeProps(state: WorldSnapshot | null, connected: boolean): UpgradeBarProps {
  return {
    bagSize: state?.you.bagSize ?? STARTING_BAG,
    bagCost: state?.you.bagCost ?? null,
    vacuumCost: state?.you.vacuumCost ?? null,
    vacuumOwned: state?.you.vacuum ?? false,
    vacuumSize: state?.you.vacuumSize ?? 0,
    vacuumStrength: state?.you.vacuumStrength ?? 0,
    vacuumSizeCost: state?.you.vacuumSizeCost ?? null,
    vacuumStrengthCost: state?.you.vacuumStrengthCost ?? null,
    vacuumFilterOwned: state?.you.vacuumFilter ?? false,
    vacuumFilterCost: state?.you.vacuumFilterCost ?? null,
    unloadSpeed: state?.you.unloadSpeed ?? 0,
    unloadCost: state?.you.unloadCost ?? null,
    shelfHintOwned: state?.you.shelfHint ?? false,
    shelfHintCost: state?.you.shelfHintCost ?? null,
    nextTierName: state?.nextTier?.name ?? null,
    nextTierCost: state?.nextTier?.cost ?? null,
    totalValue: state?.totalValue ?? 0,
    enabled: connected && state?.status === 'playing',
  }
}
