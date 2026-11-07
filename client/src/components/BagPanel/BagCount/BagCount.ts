import './BagCount.css'
import { BALL_ART, BALL_SIZE, SHEET_COLUMNS, ballByIndex } from '../../../data/ball.ts'

export type BagCountProps = {
  typeIndex: number
  count: number
  onDrop: () => void
}

export function mountBagCount(parent: HTMLElement, props: BagCountProps): void {
  const type = ballByIndex(props.typeIndex)
  const root = document.createElement('button')
  root.type = 'button'
  root.className = 'bag-count'
  root.title = `${type.name} · drop one into the bin`
  root.setAttribute('aria-label', `Drop one ${type.name}, ${props.count} in the bag`)
  const sprite = document.createElement('span')
  sprite.className = 'bag-count__sprite'
  sprite.setAttribute('aria-hidden', 'true')
  sprite.style.setProperty('--ball-col', String(props.typeIndex % SHEET_COLUMNS))
  sprite.style.setProperty('--ball-row', String(Math.floor(props.typeIndex / SHEET_COLUMNS)))
  sprite.style.setProperty('--art-x', String(BALL_ART.x))
  sprite.style.setProperty('--art-y', String(BALL_ART.y))
  sprite.style.setProperty('--art-size', String(BALL_ART.size))
  sprite.style.setProperty('--cell', String(BALL_SIZE))
  sprite.style.setProperty('--sheet', String(SHEET_COLUMNS))
  const count = document.createElement('span')
  count.className = 'bag-count__count'
  count.textContent = `x ${props.count}`
  root.append(sprite, count)
  root.addEventListener('click', props.onDrop)
  parent.append(root)
}
