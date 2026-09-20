import type { HabitView } from '../lib/goals'
import type { BioSample, FlowLevel, FlowSession, InboxItem, JourneyPiece, Nudge, TimeBlock } from './types'

/**
 * The day plan. Deep work on the nearest pieces in the morning, the body
 * between blocks, admin after lunch when attention is cheaper, and one slot
 * a day that is not work at all. Generated, editable, forgettable.
 */

export const BLOCK_LABEL: Record<TimeBlock['kind'], string> = {
  deep: 'Deep work',
  admin: 'Admin',
  body: 'Body',
  routine: 'Routine',
  adventure: 'Adventure',
}

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const t = h * 60 + m + mins
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

export function planDay(pieces: JourneyPiece[], inboxScore: number, day = todayKey()): TimeBlock[] {
  const open = pieces
    .filter((p) => p.status === 'open' || p.status === 'doing')
    .sort((a, b) => (a.status === 'doing' ? -1 : 1) - (b.status === 'doing' ? -1 : 1) || b.weight - a.weight)
  const blocks: Omit<TimeBlock, 'id'>[] = []
  let t = '08:30'
  const push = (title: string, minutes: number, kind: TimeBlock['kind'], extra: Partial<TimeBlock> = {}) => {
    blocks.push({ day, start: t, minutes, title, kind, ...extra })
    t = addMinutes(t, minutes)
  }
  push('Breath, then a look at the Desk', 20, 'routine')
  if (open[0]) push(open[0].title, 90, 'deep', { pieceId: open[0].id })
  else push('Whatever is closest', 90, 'deep')
  push('Walk outside', 20, 'body')
  if (open[1]) push(open[1].title, 75, 'deep', { pieceId: open[1].id })
  else push('Stream: write down what came up', 45, 'deep')
  push('Lunch, away from the screen', 50, 'routine')
  push(inboxScore > 25 ? 'Bring the inbox down' : 'Inbox and approvals', inboxScore > 25 ? 60 : 40, 'admin')
  push('Yoga mat, or the treadmill', 30, 'body')
  if (open[2]) push(open[2].title, 60, 'deep', { pieceId: open[2].id })
  push('Something unplanned', 60, 'adventure')
  push('Review the runs, close the day', 20, 'admin')
  return blocks.map((b, i) => ({ ...b, id: `blk-${day}-${i}` }))
}

/**
 * Nudges. The OS knows how long you have sat, what your heart is doing, and
 * what is waiting. It says one thing at a time, quietly, and only when it
 * would change what you do next.
 */
export function computeNudges(input: {
  bio: BioSample[]
  flow: FlowLevel
  session: FlowSession | null
  deskSinceMs: number
  inbox: InboxItem[]
  blocks: TimeBlock[]
  now?: Date
}): Omit<Nudge, 'id' | 'dismissed'>[] {
  const now = input.now ?? new Date()
  const at = now.toISOString()
  const out: Omit<Nudge, 'id' | 'dismissed'>[] = []
  const sittingMin = (now.getTime() - input.deskSinceMs) / 60_000
  const last = input.bio.at(-1)
  const earlier = input.bio.at(-20)

  if (sittingMin > 55 && !(input.session && input.flow === 'deep'))
    out.push({ at, kind: 'body', text: `You have been at the desk ${Math.round(sittingMin)} minutes. Ten minutes outside and the next hour is better.`, action: { label: 'Log a walk', run: 'walk' } })

  if (input.flow === 'scattered' && last && earlier && last.hrv < earlier.hrv - 8)
    out.push({ at, kind: 'focus', text: 'Heart rate up, variability down over the last few minutes. Four slow breaths before the next thing.', action: { label: 'Breathe', run: 'breathe', to: '/flow' } })

  const score = input.inbox.filter((i) => !i.done).length
  if (now.getHours() >= 15 && score >= 6)
    out.push({ at, kind: 'life', text: `${score} things still open on the Desk. Clearing them before the day ends beats carrying them into tomorrow.`, action: { label: 'Open the Desk', to: '/desk' } })

  const adventure = input.blocks.find((b) => b.kind === 'adventure' && !b.done)
  if (adventure && now.getHours() >= 16)
    out.push({ at, kind: 'life', text: `There is an hour marked "${adventure.title}" today. Routine is what the OS is for; the unplanned hour is what you are for.` })

  if (!input.session && input.flow === 'flow' && sittingMin > 5)
    out.push({ at, kind: 'focus', text: 'You are already in flow. Name the piece and the OS will keep everything else away.', action: { label: 'Start a session', run: 'focus', to: '/flow' } })

  return out.slice(0, 2)
}

/** Habits that are over target this month, for the day widget's small print. */
export function habitsNeedingAttention(views: HabitView[]): string[] {
  return views.filter((v) => v.current && v.current.spentUsd > v.habit.targetMonthlyUsd).map((v) => v.habit.category)
}
