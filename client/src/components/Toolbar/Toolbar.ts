import './Toolbar.css'
import { BIN_CAPACITY } from '../../data/balance.ts'
import { formatClock, formatSeconds, formatValue } from '../../format.ts'
import { mountHowToPlay } from '../HowToPlay/HowToPlay.ts'
import { mountInfoButton } from '../InfoButton/InfoButton.ts'

export type ToolbarProps = {
  connected: boolean
  totalValue: number
  sessionMs: number
  playerCount: number
  fullness: number
  overflowMs: number
  nextBatchMs: number
  canDrop: boolean
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
  onDropBatch: (() => void) | null,
  onRestart: (() => void) | null,
  mute: ToolbarMuteProps,
): ToolbarHandle {
  const root = document.createElement('header')
  root.className = 'toolbar'
  const wallet = document.createElement('div')
  wallet.className = 'toolbar__wallet'
  const walletKind = document.createElement('p')
  walletKind.className = 'toolbar__wallet-kind'
  walletKind.textContent = 'Team Wallet'
  const value = document.createElement('p')
  value.className = 'toolbar__value'
  wallet.append(walletKind, value)
  const bin = document.createElement('div')
  bin.className = 'toolbar__bin'
  const fullness = document.createElement('p')
  fullness.className = 'toolbar__fullness'
  const meter = document.createElement('div')
  meter.className = 'toolbar__meter'
  const fill = document.createElement('div')
  fill.className = 'toolbar__fill'
  meter.append(fill)
  bin.append(fullness, meter)
  const batch = document.createElement('p')
  batch.className = 'toolbar__batch'
  const devButton = (label: string, onClick: () => void): HTMLButtonElement => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'toolbar__drop'
    button.textContent = label
    button.addEventListener('click', onClick)
    return button
  }
  const drop = onDropBatch ? devButton('Drop batch', onDropBatch) : null
  const reset = onRestart ? devButton('Reset', onRestart) : null
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
  const help = mountHowToPlay(parent)
  root.append(wallet, bin, batch, ...(drop ? [drop] : []), ...(reset ? [reset] : []), spacer, players, clock, muteButton)
  const info = mountInfoButton(root, { onClick: help.open })
  parent.append(root)

  return {
    update(props) {
      value.textContent = props.connected ? formatValue(props.totalValue) : 'Connecting…'
      const percent = Math.round(props.fullness * 100)
      const count = Math.round(props.fullness * BIN_CAPACITY)
      fullness.textContent = props.overflowMs > 0 ? `Overflow ${formatSeconds(7000 - props.overflowMs)}` : `Bin ${count} / ${BIN_CAPACITY}`
      bin.dataset.state = props.fullness > 1 ? 'overflow' : props.fullness > 0.75 ? 'high' : 'ok'
      fill.style.width = `${Math.min(100, percent)}%`
      batch.textContent = `Next Drop in ${formatSeconds(props.nextBatchMs)}`
      if (drop) drop.disabled = !props.connected || !props.canDrop
      if (reset) reset.disabled = !props.connected
      players.textContent = props.playerCount === 1 ? '1 player' : `${props.playerCount} players`
      clock.textContent = formatClock(props.sessionMs)
    },
    destroy() {
      info.destroy()
      help.destroy()
      root.remove()
    },
  }
}
