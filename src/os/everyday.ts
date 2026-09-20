import type { AttentionSettings, EverydayItem, Tracker } from './types'

/**
 * Everyday. The list of workflows a whole day is made of, and whether
 * Horizon is their home yet. This is the product roadmap, in the product:
 * identify each one, then knock them out one by one. Some are small and are
 * about the right experience — the cat's medicine on a piece of paper. Some
 * are large — a computer-vision product. All of them go through connections
 * (APIs, MCPs) so that nothing gets stuck inside someone else's application.
 */
export const seedEveryday: EverydayItem[] = [
  { id: 'ev-morning', area: 'Morning', title: 'Wake up, check Horizon', does: 'One page: since you were away, what is due, to-dos, today, the digest. Then start the day.', status: 'built', to: '/morning', needs: [] },
  { id: 'ev-todos', area: 'Morning', title: 'To-dos', does: 'Type it, tick it. No weight, no project needed. ⌘K "todo …" from anywhere.', status: 'built', to: '/morning', needs: [] },
  { id: 'ev-trackers', area: 'Home', title: 'Cat medicine', does: 'Names down the side, days across the top, a box per dose. Paper on the fridge, in the OS.', status: 'built', to: '/trackers', needs: [] },
  { id: 'ev-plants', area: 'Home', title: 'Plants, bins, filters', does: 'Weekly trackers with a weekday. Same paper, different rows.', status: 'built', to: '/trackers', needs: [] },
  { id: 'ev-groceries', area: 'Home', title: 'Groceries', does: 'A running list that becomes an order through a connection, never a shop’s app.', status: 'next', needs: ['cx-groceries'] },
  { id: 'ev-meals', area: 'Home', title: 'Meals for the week', does: 'A sheet the Planner fills on Sunday; groceries follow from it.', status: 'later', needs: ['cx-docs'] },
  { id: 'ev-research', area: 'Work', title: 'Research a question', does: 'Question → Answer workflow: a run, a doc with sources, a belief if it changed one.', status: 'built', to: '/initiatives', needs: ['cx-papers', 'cx-pdf', 'cx-model-local'] },
  { id: 'ev-product', area: 'Work', title: 'Build a product', does: 'Idea → Product: shape, first ten customers, cost, build, launch, monitor.', status: 'built', to: '/initiatives', needs: ['cx-git', 'cx-ci', 'cx-docs'] },
  { id: 'ev-invent', area: 'Work', title: 'Invent a thing (hawk vision)', does: 'Idea → Invention: translate, connect, gather, experiment, evaluate, protect.', status: 'built', to: '/initiatives?id=in-hawk', needs: ['cx-datasets', 'cx-train', 'cx-experiments', 'cx-ip'] },
  { id: 'ev-thesis', area: 'Work', title: 'Thesis to trade to monitor', does: 'Idea → Thesis → Trade → Monitor, with the Trader preparing and you approving.', status: 'built', to: '/initiatives', needs: ['cx-filings', 'cx-broker'] },
  { id: 'ev-docs', area: 'Work', title: 'Docs and sheets', does: 'Specs, notes, cost tables and records with the initiative, edited in place.', status: 'built', to: '/docs', needs: ['cx-docs'] },
  { id: 'ev-code', area: 'Work', title: 'Code, branches, CI', does: 'A piece opens a branch; CI reports to the inbox; the review is a run.', status: 'next', needs: ['cx-git', 'cx-ci'] },
  { id: 'ev-claude', area: 'Work', title: 'Coding agent sessions', does: 'Start a coding session on a piece from here; the diff comes back as a run to approve.', status: 'next', needs: ['cx-git', 'cx-model-cloud'] },
  { id: 'ev-walk', area: 'Body', title: 'Walk, mat, treadmill', does: 'Body blocks on the day; nudges from sitting time and heart rate.', status: 'built', to: '/flow', needs: ['cx-hr'] },
  { id: 'ev-sleep', area: 'Body', title: 'Sleep and waking', does: 'Last night in the Morning; the day plan bends to it.', status: 'later', needs: ['cx-hr'] },
  { id: 'ev-digest', area: 'Information', title: 'News, bounded', does: 'A digest of a fixed size, once a day, with an end. No feed to scroll.', status: 'built', to: '/morning', needs: ['cx-rss'] },
  { id: 'ev-newsletters', area: 'Information', title: 'Newsletters out of email', does: 'Newsletters leave the inbox and join the digest through the same connection.', status: 'next', needs: ['cx-email', 'cx-rss'] },
  { id: 'ev-reading', area: 'Information', title: 'Reading list', does: 'Anything saved becomes a download in the Stream, readable offline.', status: 'later', needs: ['cx-pdf'] },
  { id: 'ev-messages', area: 'People', title: 'Messages', does: 'Texts and chats scored like email, answered from the Desk, through the platforms’ own bridges.', status: 'next', needs: ['cx-messages'] },
  { id: 'ev-calendar', area: 'People', title: 'Calendar', does: 'Blocks written by workflows land on the real calendar; the real calendar lands on the day.', status: 'next', needs: ['cx-calendar'] },
  { id: 'ev-birthdays', area: 'People', title: 'Birthdays and check-ins', does: 'A tracker with people as rows and a month as the cadence.', status: 'later', needs: [] },
  { id: 'ev-transactions', area: 'Money', title: 'Transactions', does: 'Ledger reads the month; habits release money to goals.', status: 'built', to: '/life', needs: ['cx-bank'] },
  { id: 'ev-bills', area: 'Money', title: 'Bills and renewals', does: 'Due dates as trackers; the lease and the insurance as approvals.', status: 'next', needs: ['cx-bank', 'cx-email'] },
  { id: 'ev-taxes', area: 'Money', title: 'Taxes', does: 'A sheet the Ledger keeps all year; the accountant gets the export.', status: 'later', needs: ['cx-bank', 'cx-docs'] },
  { id: 'ev-email', area: 'Admin', title: 'Email', does: 'The inbox score; Desk drafts; nothing sends without you.', status: 'built', to: '/desk', needs: ['cx-email'] },
  { id: 'ev-appointments', area: 'Admin', title: 'Appointments and bookings', does: 'Vet, dentist, haircut — booked by an agent through a connection, confirmed by you.', status: 'later', needs: ['cx-calendar', 'cx-email'] },
]

export const EVERYDAY_AREAS: EverydayItem['area'][] = ['Morning', 'Work', 'Home', 'Body', 'Information', 'People', 'Money', 'Admin']

export const STATUS_LABEL: Record<EverydayItem['status'], string> = { built: 'Built', next: 'Next', later: 'Later' }

export const defaultAttention: AttentionSettings = { digestPerDay: 5, closeAt: '19:00', openAt: '06:00', noCounts: true }

const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** The last n day keys, oldest first, ending today. */
export function dayKeys(n: number, end = new Date()): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(d.getDate() - i)
    out.push(dateKey(d))
  }
  return out
}

export function weekdayOf(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function trackerDue(t: Tracker, key: string): boolean {
  const wd = weekdayOf(key)
  if (t.cadence === 'daily') return true
  if (t.cadence === 'weekdays') return wd >= 1 && wd <= 5
  return wd === (t.weekday ?? 0)
}

export function markKey(row: string, slot: string): string {
  return `${row}|${slot}`
}

/** How many boxes a tracker has on a day, and how many are ticked. */
export function trackerDayProgress(t: Tracker, key: string): { done: number; total: number } {
  const total = t.rows.length * t.slots.length
  const done = Object.keys(t.marks[key] ?? {}).length
  return { done, total }
}

/** Sample trackers: a few days of history so the paper looks lived in. */
export function seedTrackers(): Tracker[] {
  const keys = dayKeys(6)
  const cat: Tracker = {
    id: 'tr-cat', title: 'Cat medicine', note: 'Pixel: half a tablet in food. Mochi: drops, 0.5 ml. Both twice a day until the 30th.', rows: ['Pixel', 'Mochi'], slots: ['AM', 'PM'], cadence: 'daily', marks: {}, createdAt: ago(24 * 5),
  }
  keys.slice(0, -1).forEach((k, i) => {
    cat.marks[k] = {}
    for (const r of cat.rows) for (const s of cat.slots) if (!(i === 2 && r === 'Mochi' && s === 'PM')) cat.marks[k][markKey(r, s)] = `${k}T${s === 'AM' ? '07:40' : '19:20'}:00`
  })
  const today = keys.at(-1)!
  cat.marks[today] = { [markKey('Pixel', 'AM')]: `${today}T07:35:00` }
  const plants: Tracker = { id: 'tr-plants', title: 'Plants', note: 'Sunday. The fig gets a litre, the rest a splash.', rows: ['Fig', 'Monstera', 'Herbs'], slots: [''], cadence: 'weekly', weekday: 0, marks: {}, createdAt: ago(24 * 30) }
  const body: Tracker = { id: 'tr-body', title: 'Stretch and stand', note: 'Ten minutes on the mat. One box a day is enough.', rows: ['Mat'], slots: [''], cadence: 'weekdays', marks: {}, createdAt: ago(24 * 12) }
  keys.slice(0, -1).forEach((k, i) => { if (i % 3 !== 1 && trackerDue(body, k)) body.marks[k] = { [markKey('Mat', '')]: `${k}T08:10:00` } })
  return [cat, plants, body]
}
