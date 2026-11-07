import { Application, Container, Graphics } from 'pixi.js'
import { WORLD_H, WORLD_W } from '../data/layout.ts'
import type { WorldSnapshot } from '../data/messages.ts'
import { BallLayer } from './BallLayer/BallLayer.ts'
import { drawMart } from './drawMart.ts'
import { PlayerCursors, type LocalCursor } from './PlayerCursors/PlayerCursors.ts'
import { ShelfLayer } from './ShelfLayer/ShelfLayer.ts'
import { loadBallTextures } from './textures.ts'
import { UnloadPop, type UnloadPopLaunch } from './UnloadPop/UnloadPop.ts'
import { VacuumRange } from './VacuumRange/VacuumRange.ts'
import { VacuumStream } from './VacuumStream/VacuumStream.ts'

export type VacuumAimProps = {
  active: boolean
  rangeVisible: boolean
  cursorX: number
  cursorY: number
  types: ReadonlySet<number>
  /** When set, the stream only reaches types already in the bag. */
  selective: boolean
  radius: number
}

export type StageHandle = {
  canvas: HTMLCanvasElement
  resize: (width: number, height: number) => void
  sync: (state: WorldSnapshot) => void
  ballAt: (x: number, y: number) => string | null
  shelfAt: (x: number, y: number) => number | null
  flyTarget: (shelfIndex: number) => { x: number; y: number } | null
  popUnload: (props: UnloadPopLaunch) => void
  showUnload: (indexes: readonly number[]) => void
  showVacuum: (props: VacuumAimProps) => void
  showSelf: (point: LocalCursor | null) => void
  worldFromEvent: (event: PointerEvent) => { x: number; y: number }
  destroy: () => void
}

export async function createStage(
  parent: HTMLElement,
  onTick: (dtMs: number) => void,
): Promise<StageHandle> {
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const app = new Application()
  await app.init({
    antialias: false,
    background: '#23180f',
    resolution: coarse ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    preference: 'webgl',
    roundPixels: true,
  })
  app.canvas.style.touchAction = 'none'
  app.canvas.style.display = 'block'
  parent.appendChild(app.canvas)

  const world = new Container()
  const textures = await loadBallTextures()
  const mart = new Graphics()
  drawMart(mart, { x: 0, y: 0, width: WORLD_W, height: WORLD_H })
  const shelves = new ShelfLayer(textures)
  const balls = new BallLayer(textures)
  const range = new VacuumRange()
  const vacuum = new VacuumStream()
  const pops = new UnloadPop(textures)
  const cursors = new PlayerCursors()
  world.addChild(mart, shelves, range, balls, pops, vacuum, cursors)
  app.stage.addChild(world)
  app.ticker.add((ticker) => {
    balls.step(ticker.deltaMS)
    pops.step(ticker.deltaMS)
    shelves.setLag(pops.lag())
    onTick(ticker.deltaMS)
    vacuum.step(ticker.deltaMS)
    cursors.step(ticker.deltaMS)
  })

  const resize = (width: number, height: number) => {
    if (width < 1 || height < 1) return
    app.renderer.resize(width, height)
    const scale = Math.min(width / WORLD_W, height / WORLD_H)
    world.scale.set(scale)
    world.position.set((width - WORLD_W * scale) / 2, (height - WORLD_H * scale) / 2)
    drawMart(mart, {
      x: -world.position.x / scale,
      y: -world.position.y / scale,
      width: width / scale,
      height: height / scale,
    })
  }

  const worldFromEvent = (event: PointerEvent) => {
    const rect = app.canvas.getBoundingClientRect()
    const px = ((event.clientX - rect.left) / rect.width) * app.screen.width
    const py = ((event.clientY - rect.top) / rect.height) * app.screen.height
    return {
      x: (px - world.position.x) / world.scale.x,
      y: (py - world.position.y) / world.scale.y,
    }
  }

  return {
    canvas: app.canvas,
    resize,
    sync: (state) => {
      const hintTypes = state.you.shelfHint
        ? new Set(state.you.bag.map((ball) => ball.typeIndex))
        : new Set<number>()
      shelves.sync(state.shelves, hintTypes)
      balls.sync(state.bin, state.binRemoved)
      cursors.sync({ cursors: state.cursors })
    },
    ballAt: (x, y) => balls.ballAt(x, y),
    shelfAt: (x, y) => shelves.shelfAt(x, y),
    flyTarget: (shelfIndex) => shelves.flyTarget(shelfIndex),
    popUnload: (props) => pops.launch(props),
    showUnload: (indexes) => {
      const active = new Set<number>(indexes)
      for (const index of pops.shelves()) active.add(index)
      shelves.showActive(active)
    },
    showVacuum: (props) => {
      const targets = props.active
        ? balls.vacuumTargets(props.cursorX, props.cursorY, props.types, props.radius, props.selective)
        : []
      range.update({ visible: props.rangeVisible, x: props.cursorX, y: props.cursorY, radius: props.radius })
      vacuum.update({
        active: props.active,
        cursorX: props.cursorX,
        cursorY: props.cursorY,
        targets,
      })
    },
    showSelf: (point) => cursors.showSelf(point),
    worldFromEvent,
    destroy: () => {
      app.destroy(true)
    },
  }
}
