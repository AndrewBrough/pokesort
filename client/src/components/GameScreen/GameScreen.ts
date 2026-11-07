import './GameScreen.css'
import { STARTING_BAG } from '../../data/balance.ts'
import type { WorldSnapshot } from '../../data/messages.ts'
import type { UpgradeId } from '../../data/upgrades.ts'
import { mountBagPanel, type BagPanelHandle } from '../BagPanel/BagPanel.ts'
import { mountBuildStamp, type BuildStampHandle } from '../BuildStamp/BuildStamp.ts'
import { mountGameOver, type GameOverHandle } from '../GameOver/GameOver.ts'
import { mountNoticeBanner, type NoticeBannerHandle } from '../NoticeBanner/NoticeBanner.ts'
import { mountToolbar, type ToolbarHandle } from '../Toolbar/Toolbar.ts'
import { mountUpgradeBar, type UpgradeBarHandle } from '../UpgradeBar/UpgradeBar.ts'
import { screenUpgradeProps } from './screenUpgradeProps.ts'

export type GameScreenHandlers = {
  onDropBatch: () => void
  onUpgrade: (upgrade: UpgradeId) => void
  onRestart: () => void
  onDropBall: (ballId: string) => void
  onGrant: () => void
  onMax: () => void
  muted: boolean
  onMute: (muted: boolean) => void
}

export type GameScreenHandle = {
  stage: HTMLElement
  update: (state: WorldSnapshot | null, connected: boolean) => void
  destroy: () => void
}

export function mountGameScreen(parent: HTMLElement, handlers: GameScreenHandlers): GameScreenHandle {
  const root = document.createElement('div')
  root.className = 'game-screen'
  const toolbarSlot = document.createElement('div')
  toolbarSlot.className = 'game-screen__toolbar'
  const stage = document.createElement('div')
  stage.className = 'game-screen__stage'
  const noticeSlot = document.createElement('div')
  noticeSlot.className = 'game-screen__notice'
  const overSlot = document.createElement('div')
  overSlot.className = 'game-screen__over'
  stage.append(noticeSlot, overSlot)
  const dock = document.createElement('div')
  dock.className = 'game-screen__dock'
  const upgradeSlot = document.createElement('div')
  upgradeSlot.className = 'game-screen__upgrades'
  const bagSlot = document.createElement('div')
  bagSlot.className = 'game-screen__bag'
  dock.append(bagSlot, upgradeSlot)
  root.append(toolbarSlot, stage, dock)
  parent.append(root)

  const dev = import.meta.env.DEV
  const toolbar: ToolbarHandle = mountToolbar(
    toolbarSlot,
    dev ? handlers.onDropBatch : null,
    dev ? handlers.onRestart : null,
    { muted: handlers.muted, onMute: handlers.onMute },
  )
  const upgrades: UpgradeBarHandle = mountUpgradeBar(
    upgradeSlot,
    handlers.onUpgrade,
    dev ? handlers.onGrant : null,
    dev ? handlers.onMax : null,
  )
  const bag: BagPanelHandle = mountBagPanel(bagSlot, handlers.onDropBall)
  const notice: NoticeBannerHandle = mountNoticeBanner(noticeSlot)
  const gameOver: GameOverHandle = mountGameOver(overSlot, handlers.onRestart)
  const build: BuildStampHandle = mountBuildStamp(root, { commit: import.meta.env.VITE_COMMIT })

  return {
    stage,
    update(state, connected) {
      toolbar.update({
        connected,
        totalValue: state?.totalValue ?? 0,
        sessionMs: state?.sessionMs ?? 0,
        playerCount: state?.playerCount ?? 0,
        fullness: state?.fullness ?? 0,
        overflowMs: state?.overflowMs ?? 0,
        nextBatchMs: state?.nextBatchMs ?? 0,
        canDrop: connected && state?.status === 'playing',
      })
      upgrades.update(screenUpgradeProps(state, connected))
      bag.update({
        balls: state?.you.bag ?? [],
        bagSize: state?.you.bagSize ?? STARTING_BAG,
        matchOwned: state?.you.vacuumFilter ?? false,
        onDrop: handlers.onDropBall,
      })
      notice.update(state?.toast ? { token: String(state.toast.id), text: state.toast.text } : null)
      gameOver.update({ visible: state?.status === 'overflow', onRestart: handlers.onRestart })
    },
    destroy() {
      toolbar.destroy()
      upgrades.destroy()
      bag.destroy()
      notice.destroy()
      gameOver.destroy()
      build.destroy()
      root.remove()
    },
  }
}
