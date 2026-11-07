export const WORLD_W = 1280
export const WORLD_H = 720

export const SHELF_W = 96
export const SHELF_H = 88
export const SLOT = 16
export const SHELF_COLUMNS = 5
export const SHELF_ROWS = 4
export const SHELF_CAPACITY = SHELF_COLUMNS * SHELF_ROWS

/** Shelves are addressed by index. The shop uses 0–17; the protocol allows 0–999. */
export const SHELF_INDEX_MAX = 999

/** Interior of the bin. The rim sits just inside the shelves, with room for the fill label. */
export const BIN = { x: 136, y: 118, w: 1008, h: 452 }

export type ShelfFrame = {
  index: number
  x: number
  y: number
}

const TOP_COUNT = 5
const SIDE_COUNT = 4
const BOTTOM_COUNT = 5
const COLUMN_GAP = 18
const SIDE_Y = [140, 260, 380, 500]

function buildFrames(): readonly ShelfFrame[] {
  const frames: ShelfFrame[] = []
  const add = (x: number, y: number) => {
    frames.push({ index: frames.length, x, y })
  }
  const rowWidth = TOP_COUNT * SHELF_W + (TOP_COUNT - 1) * COLUMN_GAP
  const rowX = (WORLD_W - rowWidth) / 2
  for (let i = 0; i < TOP_COUNT; i++) add(rowX + i * (SHELF_W + COLUMN_GAP), 12)
  for (let i = 0; i < SIDE_COUNT; i++) add(20, SIDE_Y[i])
  for (let i = 0; i < SIDE_COUNT; i++) add(WORLD_W - 20 - SHELF_W, SIDE_Y[i])
  const bottomY = WORLD_H - 12 - SHELF_H
  for (let i = 0; i < BOTTOM_COUNT; i++) add(rowX + i * (SHELF_W + COLUMN_GAP), bottomY)
  return frames
}

export const SHELF_FRAMES: readonly ShelfFrame[] = buildFrames()

/** Slot 0 is the bottom-left cell. Cells fill left to right, then upward. */
export function slotCenter(slot: number): { x: number; y: number } {
  const col = slot % SHELF_COLUMNS
  const fromBottom = Math.floor(slot / SHELF_COLUMNS)
  const row = SHELF_ROWS - 1 - fromBottom
  const padX = (SHELF_W - SHELF_COLUMNS * SLOT) / 2
  const labelH = 16
  const padY = labelH + (SHELF_H - labelH - SHELF_ROWS * SLOT) / 2
  return {
    x: padX + col * SLOT + SLOT / 2,
    y: padY + row * SLOT + SLOT / 2,
  }
}
