import { HIT_MIN_SPEED, HIT_VOICES } from '../../data/balance.ts'
import { BIN } from '../../data/layout.ts'
import type { HitSnapshot } from '../../data/messages.ts'

const CLIPS = ['/sfx/01.tink1.wav', '/sfx/02.tink2.wav', '/sfx/03.tink3.wav', '/sfx/04.tink4.wav']
const LOUD_SPEED = 420

export type HitSoundsHandle = {
  unlock: () => void
  play: (hits: readonly HitSnapshot[]) => void
}

type Voice = {
  until: number
  stop: (() => void) | null
}

export function createHitSounds(): HitSoundsHandle {
  const context = new AudioContext()
  const buffers: AudioBuffer[] = []
  const voices: Voice[] = Array.from({ length: HIT_VOICES }, () => ({ until: 0, stop: null }))
  let loading: Promise<void> | null = null

  const load = (): Promise<void> => {
    if (buffers.length > 0) return Promise.resolve()
    if (loading) return loading
    loading = Promise.all(
      CLIPS.map(async (url) => {
        const response = await fetch(url)
        return context.decodeAudioData(await response.arrayBuffer())
      }),
    )
      .then((decoded) => {
        buffers.push(...decoded)
      })
      .catch(() => {
        loading = null
      })
    return loading
  }

  const playOne = (hit: HitSnapshot): void => {
    const buffer = buffers[Math.floor(Math.random() * buffers.length)]
    if (!buffer) return
    const now = context.currentTime
    let voice = voices.find((entry) => entry.until <= now)
    if (!voice) {
      voice = voices.reduce((oldest, entry) => (entry.until < oldest.until ? entry : oldest))
      voice.stop?.()
    }
    const source = context.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = 0.94 + Math.random() * 0.12
    const gain = context.createGain()
    const amount = Math.min(1, Math.max(0, (hit.speed - HIT_MIN_SPEED) / (LOUD_SPEED - HIT_MIN_SPEED)))
    gain.gain.value = 0.35 + amount * 0.65
    const panner = context.createStereoPanner()
    const mid = BIN.x + BIN.w / 2
    panner.pan.value = Math.min(0.7, Math.max(-0.7, ((hit.x - mid) / (BIN.w / 2)) * 0.7))
    source.connect(gain)
    gain.connect(panner)
    panner.connect(context.destination)
    source.start()
    voice.until = now + buffer.duration / source.playbackRate.value
    voice.stop = () => {
      try {
        source.stop()
      } catch {
        // This voice already finished.
      }
    }
  }

  void load()

  return {
    unlock() {
      if (context.state === 'suspended') void context.resume()
      void load()
    },
    play(hits) {
      if (context.state !== 'running' || buffers.length === 0) return
      for (const hit of hits) playOne(hit)
    },
  }
}
