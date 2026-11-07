/** One cell of `pokeballs_emerald.png` (4×4, 32px). Names are best guesses from the pixels. */
export type BallType = {
  index: number
  name: string
  shortName: string
  value: number
  /** Shelf swatch. Edit alongside `name` when you rename a cell. */
  accent: number
}

export const BALL_SIZE = 32
export const SHEET_COLUMNS = 4
/** Painted pixels inside every 32px cell. The ball sits low in the cell. */
export const BALL_ART = { x: 6, y: 10, size: 20 } as const

export const BALL_TYPES: readonly BallType[] = [
  { index: 0, name: 'Poké Ball', shortName: 'Poké', value: 100, accent: 0xe06040 },
  { index: 1, name: 'Master Ball', shortName: 'Master', value: 5000, accent: 0x9030b0 },
  { index: 2, name: 'Friend Ball', shortName: 'Friend', value: 560, accent: 0x10c040 },
  { index: 3, name: 'Heavy Ball', shortName: 'Heavy', value: 600, accent: 0x2a2a2a },
  { index: 4, name: 'Great Ball', shortName: 'Great', value: 250, accent: 0x3040d0 },
  { index: 5, name: 'Love Ball', shortName: 'Love', value: 640, accent: 0xc020c0 },
  { index: 6, name: 'Safari Ball', shortName: 'Safari', value: 680, accent: 0xc05000 },
  { index: 7, name: 'Luxury Ball', shortName: 'Luxury', value: 720, accent: 0xf0a000 },
  { index: 8, name: 'Quick Ball', shortName: 'Quick', value: 760, accent: 0x3070e0 },
  { index: 9, name: 'Premier Ball', shortName: 'Premier', value: 800, accent: 0xf4f4f4 },
  { index: 10, name: 'Dream Ball', shortName: 'Dream', value: 840, accent: 0xe030e0 },
  { index: 11, name: 'Timer Ball', shortName: 'Timer', value: 880, accent: 0xe04040 },
  { index: 12, name: 'Dive Ball', shortName: 'Dive', value: 920, accent: 0x3040b0 },
  { index: 13, name: 'Net Ball', shortName: 'Net', value: 960, accent: 0x20c0d0 },
  { index: 14, name: 'Ultra Ball', shortName: 'Ultra', value: 500, accent: 0xf0b000 },
  { index: 15, name: 'Beast Ball', shortName: 'Beast', value: 1000, accent: 0x148090 },
]

export function ballByIndex(index: number): BallType {
  return BALL_TYPES[index] ?? BALL_TYPES[0]
}

/** Cheap balls first. Master Ball is last because it is worth 5000. */
export function ballUnlockOrder(): readonly number[] {
  return [...BALL_TYPES]
    .sort((a, b) => a.value - b.value || a.index - b.index)
    .map((ball) => ball.index)
}
