import { VACUUM_LEVELS } from './balance.ts'

export type UpgradeId = 'bag' | 'vacuum' | 'vacuumSize' | 'vacuumStrength' | 'vacuumFilter' | 'tier' | 'hint'

export type UpgradeScope = 'individual' | 'team'

export type UpgradeDef = {
  id: UpgradeId
  scope: UpgradeScope
  name: string
  /** Once this upgrade is owned, its button is replaced by these. */
  unlocks: readonly UpgradeId[]
  /** Null when the upgrade is not a fixed level track. */
  maxLevel: number | null
}

export const UPGRADES: readonly UpgradeDef[] = [
  { id: 'tier', scope: 'team', name: 'Unlock ball', unlocks: [], maxLevel: null },
  { id: 'bag', scope: 'individual', name: 'Bag slot', unlocks: [], maxLevel: null },
  {
    id: 'vacuum',
    scope: 'individual',
    name: 'Vacuum',
    unlocks: ['vacuumSize', 'vacuumStrength', 'vacuumFilter'],
    maxLevel: 1,
  },
  {
    id: 'vacuumSize',
    scope: 'individual',
    name: 'Vacuum size',
    unlocks: [],
    maxLevel: VACUUM_LEVELS,
  },
  {
    id: 'vacuumStrength',
    scope: 'individual',
    name: 'Vacuum strength',
    unlocks: [],
    maxLevel: VACUUM_LEVELS,
  },
  { id: 'vacuumFilter', scope: 'individual', name: 'Match bag', unlocks: [], maxLevel: 1 },
  { id: 'hint', scope: 'individual', name: 'Mark shelves', unlocks: [], maxLevel: 1 },
]

/** Levels used to decide which upgrade buttons are on screen. */
export type UpgradeLevels = {
  vacuum: number
  vacuumSize: number
  vacuumStrength: number
  vacuumFilter: number
  hint: number
}

export function upgradeLevel(id: UpgradeId, levels: UpgradeLevels): number {
  if (id === 'vacuum') return levels.vacuum
  if (id === 'vacuumSize') return levels.vacuumSize
  if (id === 'vacuumStrength') return levels.vacuumStrength
  if (id === 'vacuumFilter') return levels.vacuumFilter
  if (id === 'hint') return levels.hint
  return 0
}

/** Roots stay until they unlock something. Children appear in the parent's place. */
export function visibleUpgrades(levels: UpgradeLevels): readonly UpgradeDef[] {
  return UPGRADES.filter((upgrade) => {
    const parents = UPGRADES.filter((parent) => parent.unlocks.includes(upgrade.id))
    if (parents.length > 0) return parents.some((parent) => upgradeLevel(parent.id, levels) >= 1)
    if (upgrade.unlocks.length > 0 && upgradeLevel(upgrade.id, levels) >= 1) return false
    return true
  })
}
