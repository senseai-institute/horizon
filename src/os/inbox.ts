import type { InboxItem } from './types'

/**
 * The inbox score. A composite of how important the sender is, whether the
 * item is flagged urgent, and how long it has sat there. You bring it down by
 * doing the work — replying, approving, archiving — not by reading.
 *
 * Score per open item = importance (1–3) × urgency (1 or 2.5) × age factor
 * (1 → 2 over four days). Summed. Anything under 10 is quiet.
 */
export function itemScore(item: InboxItem, now = Date.now()): number {
  if (item.done) return 0
  const ageDays = Math.max(0, (now - Date.parse(item.at)) / 86_400_000)
  const age = 1 + Math.min(1, ageDays / 4)
  const urgency = item.urgent ? 2.5 : 1
  const kindWeight = item.kind === 'approval' ? 1.4 : item.kind === 'system' ? 0.6 : 1
  return item.from.importance * urgency * age * kindWeight
}

export function inboxScore(items: InboxItem[], now = Date.now()): number {
  return Math.round(items.reduce((a, i) => a + itemScore(i, now), 0))
}

export function scoreWord(score: number): string {
  if (score < 10) return 'Quiet'
  if (score < 25) return 'Manageable'
  if (score < 50) return 'Busy'
  return 'Loud'
}

const ago = (days: number, hours = 0) => new Date(Date.now() - days * 86_400_000 - hours * 3_600_000).toISOString()

export const seedInbox: InboxItem[] = [
  {
    id: 'ib-1',
    kind: 'approval',
    from: { name: 'Trader', agentId: 'ag-trader', importance: 2 },
    subject: 'Order prepared: trim Eaton by $4,100',
    body: 'Grid Deficit is 2.8 points over target. Eaton is the largest position and the most over its cap. Selling $4,100 brings the sleeve to 18.3% and frees cash the house deposit needs. Nothing sends without you.',
    urgent: false,
    at: ago(0, 3),
    read: false,
    done: false,
    runId: 'run-trim-etn',
    scope: 'personal',
  },
  {
    id: 'ib-2',
    kind: 'email',
    from: { name: 'Priya Natarajan (landlord)', importance: 3 },
    subject: 'Lease renewal — need an answer by the 30th',
    body: 'Hi — as discussed, the lease ends 30 April. I need to know by the end of this month whether you intend to renew or vacate so I can plan. Happy to talk through options.',
    urgent: true,
    at: ago(2),
    read: true,
    done: false,
    goalId: 'g-house',
    scope: 'personal',
  },
  {
    id: 'ib-3',
    kind: 'report',
    from: { name: 'Ledger', agentId: 'ag-ledger', importance: 1 },
    subject: 'August transactions: three things worth knowing',
    body: '1. Cannabis spend $145, first month under target. 2. Two subscriptions renewed that were marked for cancellation — $31 total. 3. Delivery came in at $265, slightly over target, entirely on weekends.',
    urgent: false,
    at: ago(4),
    read: true,
    done: false,
    scope: 'personal',
  },
  {
    id: 'ib-4',
    kind: 'email',
    from: { name: 'Mara Oyelaran (Sila Services)', importance: 2 },
    subject: 'Re: tool library — can we co-locate at the depot?',
    body: 'We have space at the back of the Eastside depot that sits empty evenings and weekends. If your tool library wants it, we would take a small share of memberships rather than rent. Let me know if you want to see it.',
    urgent: false,
    at: ago(1, 6),
    read: false,
    done: false,
    goalId: 'g-toollib',
    scope: 'company',
  },
  {
    id: 'ib-5',
    kind: 'message',
    from: { name: 'Planner', agentId: 'ag-planner', importance: 1 },
    subject: 'Roadmap for the tool library is ready to review',
    body: 'Six lines, $27,900 total, twenty-seven weeks. It is $3,900 over the current target. Open the chat and I will walk through it, or approve it from the queue.',
    urgent: false,
    at: ago(0, 9),
    read: false,
    done: false,
    goalId: 'g-toollib',
    runId: 'run-roadmap-toollib',
    scope: 'personal',
  },
  {
    id: 'ib-6',
    kind: 'email',
    from: { name: 'Accountant', importance: 2 },
    subject: 'Q3 estimated tax — figures attached',
    body: 'Estimated payment due 15 October. Figures attached. Nothing to do unless the numbers look wrong.',
    urgent: false,
    at: ago(5),
    read: true,
    done: false,
    scope: 'company',
  },
  {
    id: 'ib-7',
    kind: 'system',
    from: { name: 'Horizon', agentId: 'ag-horizon', importance: 1 },
    subject: 'Heart-rate monitor not connected',
    body: 'Flow tracking is running on the simulator. Connect a Bluetooth heart-rate monitor from the Flow screen to use real data.',
    urgent: false,
    at: ago(0, 1),
    read: false,
    done: false,
    scope: 'personal',
  },
  {
    id: 'ib-8',
    kind: 'email',
    from: { name: 'Newsletter', importance: 1 },
    subject: 'This week in grid infrastructure',
    body: 'Transformer lead times, a new interconnection queue report, and a piece on co-location dockets.',
    urgent: false,
    at: ago(3),
    read: false,
    done: false,
    scope: 'company',
  },
]
