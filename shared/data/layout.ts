export const WORLD_W = 1280
export const WORLD_H = 720

export const SLOT = 12
export const SHELF_COLUMNS = 5
export const SHELF_ROWS = 4
export const SHELF_CAPACITY = SHELF_COLUMNS * SHELF_ROWS
export const SHELF_LABEL_H = 14
export const SHELF_W = 84
export const SHELF_H = SHELF_LABEL_H + SHELF_ROWS * SLOT + 8

/** Shelves are addressed by index. The shop uses 0–17; the protocol allows 0–999. */
export const SHELF_INDEX_MAX = 999

const SIDE_COUNT = 9
const MARGIN = 12
const GAP = 8
const RIM = 10
const SHELF_BIN_GAP = 8
const LABEL_ROOM = 28

const columnHeight = SIDE_COUNT * SHELF_H + (SIDE_COUNT - 1) * GAP
const shelfBottom = MARGIN + columnHeight
const binX = MARGIN + SHELF_W + SHELF_BIN_GAP + RIM
const binRight = WORLD_W - MARGIN - SHELF_W - SHELF_BIN_GAP - RIM
const binY = MARGIN + RIM
const binBottom = shelfBottom - LABEL_ROOM

/** Interior of the bin. Side shelves flank it; the fill label sits under the rim. */
export const BIN = { x: binX, y: binY, w: binRight - binX, h: binBottom - binY }

export type ShelfFrame = {
  index: number
  x: number
  y: number
}

function buildFrames(): readonly ShelfFrame[] {
  const frames: ShelfFrame[] = []
  const step = SHELF_H + GAP
  const leftX = MARGIN
  const rightX = WORLD_W - MARGIN - SHELF_W
  for (let row = 0; row < SIDE_COUNT; row++) {
    const y = MARGIN + row * step
    frames.push({ index: frames.length, x: leftX, y })
    frames.push({ index: frames.length, x: rightX, y })
  }
  return frames
}

export const SHELF_FRAMES: readonly ShelfFrame[] = buildFrames()

/** Slot 0 is the bottom-left cell. Cells fill left to right, then upward. */
export function slotCenter(slot: number): { x: number; y: number } {
  const col = slot % SHELF_COLUMNS
  const fromBottom = Math.floor(slot / SHELF_COLUMNS)
  const row = SHELF_ROWS - 1 - fromBottom
  const padX = (SHELF_W - SHELF_COLUMNS * SLOT) / 2
  const padY = SHELF_LABEL_H + (SHELF_H - SHELF_LABEL_H - SHELF_ROWS * SLOT) / 2
  return {
    x: padX + col * SLOT + SLOT / 2,
    y: padY + row * SLOT + SLOT / 2,
  }
}
