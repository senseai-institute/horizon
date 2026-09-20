/**
 * The senses a screen can reach. Sight is the whole UI. Sound: a soft tone at
 * the edges of a focus session and, optionally, a breath tone. Touch: a short
 * vibration on a nudge where the device supports it. Smell and taste are for
 * the room, not the screen — the architecture note says how. Intuition is
 * the nudge engine: patterns surfaced before you would have noticed them.
 */

export interface SenseSettings {
  sound: boolean
  breathTone: boolean
  haptics: boolean
}

let ctx: AudioContext | null = null
function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  ctx ??= new Ctor()
  return ctx
}

/** A quiet sine, tuned to a low A. Never a ping. */
export function chime(kind: 'start' | 'end' | 'nudge' = 'start') {
  const a = audio()
  if (!a) return
  if (a.state === 'suspended') void a.resume()
  const now = a.currentTime
  const freqs = kind === 'start' ? [220, 330] : kind === 'end' ? [330, 220] : [261.6]
  freqs.forEach((f, i) => {
    const o = a.createOscillator()
    const g = a.createGain()
    o.type = 'sine'
    o.frequency.value = f
    g.gain.setValueAtTime(0, now + i * 0.35)
    g.gain.linearRampToValueAtTime(0.06, now + i * 0.35 + 0.08)
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.35 + 1.4)
    o.connect(g).connect(a.destination)
    o.start(now + i * 0.35)
    o.stop(now + i * 0.35 + 1.5)
  })
}

let breath: { o: OscillatorNode; g: GainNode } | null = null

/** A held tone whose loudness follows the breath figure. Call with 0–1 each frame; call stop() to end it. */
export function breathTone(level: number) {
  const a = audio()
  if (!a) return
  if (!breath) {
    const o = a.createOscillator()
    const g = a.createGain()
    o.type = 'sine'
    o.frequency.value = 110
    g.gain.value = 0
    o.connect(g).connect(a.destination)
    o.start()
    breath = { o, g }
  }
  breath.g.gain.setTargetAtTime(0.015 + level * 0.03, a.currentTime, 0.1)
}

export function stopBreathTone() {
  if (!breath || !ctx) return
  breath.g.gain.setTargetAtTime(0, ctx.currentTime, 0.2)
  const b = breath
  breath = null
  setTimeout(() => b.o.stop(), 600)
}

export function haptic(pattern: number | number[] = 18) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern)
}
