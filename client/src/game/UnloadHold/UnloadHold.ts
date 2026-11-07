export type UnloadHold = {
  down: (shelfIndex: number) => void
  move: (shelfIndex: number | null) => void
  up: () => void
  stop: () => void
  active: () => readonly number[]
  step: (dtMs: number, intervalMs: number, place: (shelfIndex: number) => boolean, miss: (shelfIndex: number) => void) => void
}

export function createUnloadHold(): UnloadHold {
  const shelves: number[] = []
  let holding = false
  let pending = 0
  let elapsed = 0
  let cursor = 0

  const add = (index: number) => {
    if (!shelves.includes(index)) shelves.push(index)
  }

  const clear = () => {
    shelves.length = 0
    cursor = 0
    elapsed = 0
    pending = 0
  }

  return {
    down(index) {
      if (!holding) pending += 1
      holding = true
      add(index)
    },
    move(index) {
      if (holding && index !== null) add(index)
    },
    up() {
      holding = false
    },
    stop() {
      holding = false
      clear()
    },
    active: () => shelves,
    step(dtMs, intervalMs, place, miss) {
      if (shelves.length === 0) return
      if (!holding && pending <= 0) {
        clear()
        return
      }
      elapsed += dtMs
      if (intervalMs > 0 && elapsed < intervalMs) return
      if (pending > 0) pending -= 1
      elapsed = intervalMs > 0 ? elapsed - intervalMs : 0
      let placed = false
      for (let n = 0; n < shelves.length; n++) {
        const shelf = shelves[cursor % shelves.length]
        cursor += 1
        if (!place(shelf)) continue
        placed = true
        break
      }
      if (!placed) miss(shelves[0] ?? 0)
      if (!holding && pending <= 0) clear()
    },
  }
}
