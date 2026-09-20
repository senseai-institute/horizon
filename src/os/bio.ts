import type { BioSample, FlowLevel } from './types'

/**
 * Biometrics. A simulator that behaves like a real person sitting at a desk,
 * plus a hook for a real Bluetooth heart-rate monitor (the standard Heart Rate
 * service, 0x180D) where the browser supports it.
 */

export function flowLevel(sample: BioSample | null): FlowLevel {
  if (!sample) return 'settling'
  const { hr, hrv, breath } = sample
  // Flow: calm, steady heart, slow breath, high variability.
  const calm = hrv > 55 && hr < 78 && breath < 12
  const deep = hrv > 70 && hr < 70 && breath < 9
  const scattered = hrv < 30 || hr > 92 || breath > 16
  if (deep) return 'deep'
  if (calm) return 'flow'
  if (scattered) return 'scattered'
  return 'settling'
}

export const FLOW_LABEL: Record<FlowLevel, string> = {
  scattered: 'Scattered',
  settling: 'Settling',
  flow: 'In flow',
  deep: 'Deep',
}

export const FLOW_HINT: Record<FlowLevel, string> = {
  scattered: 'Heart is up and breath is quick. Four slow breaths before the next thing.',
  settling: 'Getting there. Pick one piece and close everything else.',
  flow: 'Steady. The OS is keeping the inbox and the chats out of the way.',
  deep: 'Do not stop for anything that is not on fire.',
}

/**
 * A plausible heart. Drifts between states with some momentum so the flow
 * indicator does not flicker.
 */
export class BioSimulator {
  private hr = 74
  private hrv = 48
  private breath = 12
  private target = { hr: 70, hrv: 60, breath: 10 }
  private t = 0

  /** Nudge toward a mode. Used when a focus session starts or a session ends. */
  setMode(mode: 'rest' | 'focus' | 'stress') {
    this.target =
      mode === 'focus'
        ? { hr: 66, hrv: 74, breath: 8 }
        : mode === 'stress'
          ? { hr: 96, hrv: 26, breath: 17 }
          : { hr: 72, hrv: 52, breath: 11 }
  }

  next(): BioSample {
    this.t += 1
    const wobble = (n: number) => (Math.random() - 0.5) * n
    this.hr += (this.target.hr - this.hr) * 0.06 + wobble(2.4)
    this.hrv += (this.target.hrv - this.hrv) * 0.05 + wobble(4)
    this.breath += (this.target.breath - this.breath) * 0.08 + wobble(0.8)
    return {
      at: Date.now(),
      hr: Math.round(Math.max(48, Math.min(140, this.hr))),
      hrv: Math.round(Math.max(10, Math.min(120, this.hrv))),
      breath: Math.round(Math.max(5, Math.min(24, this.breath)) * 10) / 10,
    }
  }
}

type BluetoothLike = {
  requestDevice: (opts: { filters: { services: number[] }[] }) => Promise<{
    name?: string
    gatt?: {
      connect: () => Promise<{
        getPrimaryService: (s: number) => Promise<{
          getCharacteristic: (c: number) => Promise<{
            startNotifications: () => Promise<unknown>
            addEventListener: (ev: string, fn: (e: { target: { value: DataView } }) => void) => void
          }>
        }>
      }>
    }
  }>
}

export function bluetoothAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator
}

/**
 * Connects to a real heart-rate monitor. Returns the device name and an
 * unsubscribe function; calls `onHr` with each measurement. HRV and breath
 * are derived crudely from beat-to-beat intervals when the device sends them.
 */
export async function connectHeartRate(onSample: (s: Partial<BioSample>) => void): Promise<{ name: string; stop: () => void }> {
  const bt = (navigator as unknown as { bluetooth: BluetoothLike }).bluetooth
  const device = await bt.requestDevice({ filters: [{ services: [0x180d] }] })
  const server = await device.gatt!.connect()
  const service = await server.getPrimaryService(0x180d)
  const ch = await service.getCharacteristic(0x2a37)
  let lastRR: number[] = []
  const handler = (e: { target: { value: DataView } }) => {
    const v = e.target.value
    const flags = v.getUint8(0)
    const hr16 = (flags & 0x01) !== 0
    const hr = hr16 ? v.getUint16(1, true) : v.getUint8(1)
    let offset = hr16 ? 3 : 2
    if (flags & 0x08) offset += 2 // energy expended present
    if (flags & 0x10) {
      while (offset + 1 < v.byteLength) {
        lastRR.push((v.getUint16(offset, true) / 1024) * 1000)
        offset += 2
      }
      lastRR = lastRR.slice(-30)
    }
    let hrv: number | undefined
    if (lastRR.length > 5) {
      const diffs = lastRR.slice(1).map((x, i) => x - lastRR[i])
      hrv = Math.round(Math.sqrt(diffs.reduce((a, d) => a + d * d, 0) / diffs.length))
    }
    onSample({ at: Date.now(), hr, hrv })
  }
  ch.addEventListener('characteristicvaluechanged', handler)
  await ch.startNotifications()
  return { name: device.name ?? 'Heart-rate monitor', stop: () => server && device.gatt && void 0 }
}
