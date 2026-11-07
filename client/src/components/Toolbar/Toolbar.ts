import './Toolbar.css'
import { formatClock, formatSeconds, formatValue } from '../../format.ts'

export type ToolbarProps = {
  connected: boolean
  totalValue: number
  sessionMs: number
  playerCount: number
  fullness: number
  overflowMs: number
  nextBatchMs: number
  canDrop: boolean
  onDropBatch: () => void
}

export type ToolbarMuteProps = {
  muted: boolean
  onMute: (muted: boolean) => void
}

export type ToolbarHandle = {
  update: (props: ToolbarProps) => void
  destroy: () => void
}

export function mountToolbar(
  parent: HTMLElement,
  onDropBatch: () => void,
  mute: ToolbarMuteProps,
): ToolbarHandle {
  const root = document.createElement('header')
  root.className = 'toolbar'
  const value = document.createElement('p')
  value.className = 'toolbar__value'
  const meter = document.createElement('div')
  meter.className = 'toolbar__meter'
  const fill = document.createElement('div')
  fill.className = 'toolbar__fill'
  const fullness = document.createElement('p')
  fullness.className = 'toolbar__fullness'
  meter.append(fill)
  const batch = document.createElement('p')
  batch.className = 'toolbar__batch'
  const drop = document.createElement('button')
  drop.type = 'button'
  drop.className = 'toolbar__drop'
  drop.textContent = 'Drop batch'
  drop.addEventListener('click', onDropBatch)
  const spacer = document.createElement('div')
  spacer.className = 'toolbar__spacer'
  const players = document.createElement('p')
  players.className = 'toolbar__players'
  const clock = document.createElement('p')
  clock.className = 'toolbar__clock'
  const muteButton = document.createElement('button')
  muteButton.type = 'button'
  muteButton.className = 'toolbar__mute'
  let muted = mute.muted
  const showMute = (): void => {
    muteButton.textContent = muted ? 'Unmute' : 'Mute'
    muteButton.setAttribute('aria-pressed', muted ? 'true' : 'false')
    muteButton.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound')
  }
  showMute()
  muteButton.addEventListener('click', () => {
    muted = !muted
    showMute()
    mute.onMute(muted)
  })
  root.append(value, meter, fullness, batch, drop, spacer, players, clock, muteButton)
  parent.append(root)

  return {
    update(props) {
      value.textContent = props.connected ? formatValue(props.totalValue) : 'Connecting…'
      const percent = Math.round(props.fullness * 100)
      fullness.textContent = props.overflowMs > 0 ? `Overflow ${formatSeconds(7000 - props.overflowMs)}` : `Bin ${percent}%`
      meter.dataset.state = props.fullness > 1 ? 'overflow' : props.fullness > 0.75 ? 'high' : 'ok'
      fill.style.width = `${Math.min(100, percent)}%`
      batch.textContent = `Next ${formatSeconds(props.nextBatchMs)}`
      drop.disabled = !props.connected || !props.canDrop
      players.textContent = props.playerCount === 1 ? '1 player' : `${props.playerCount} players`
      clock.textContent = formatClock(props.sessionMs)
    },
    destroy() {
      root.remove()
    },
  }
}
