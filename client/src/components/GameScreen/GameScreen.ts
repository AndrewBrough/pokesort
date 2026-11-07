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

export type GameScreenHandlers = {
  onDropBatch: () => void
  onUpgrade: (upgrade: UpgradeId) => void
  onRestart: () => void
  onDropBall: (ballId: string) => void
  onGrant: () => void
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

  const toolbar: ToolbarHandle = mountToolbar(toolbarSlot, handlers.onDropBatch)
  const upgrades: UpgradeBarHandle = mountUpgradeBar(
    upgradeSlot,
    handlers.onUpgrade,
    import.meta.env.DEV ? handlers.onGrant : null,
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
        onDropBatch: handlers.onDropBatch,
      })
      upgrades.update({
        bagCost: state?.you.bagCost ?? null,
        vacuumCost: state?.you.vacuumCost ?? null,
        vacuumOwned: state?.you.vacuum ?? false,
        vacuumSize: state?.you.vacuumSize ?? 0,
        vacuumStrength: state?.you.vacuumStrength ?? 0,
        vacuumSizeCost: state?.you.vacuumSizeCost ?? null,
        vacuumStrengthCost: state?.you.vacuumStrengthCost ?? null,
        shelfHintOwned: state?.you.shelfHint ?? false,
        shelfHintCost: state?.you.shelfHintCost ?? null,
        nextTierName: state?.nextTier?.name ?? null,
        nextTierCost: state?.nextTier?.cost ?? null,
        totalValue: state?.totalValue ?? 0,
        enabled: connected && state?.status === 'playing',
      })
      bag.update({
        balls: state?.you.bag ?? [],
        bagSize: state?.you.bagSize ?? STARTING_BAG,
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
