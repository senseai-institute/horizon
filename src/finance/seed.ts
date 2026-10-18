import { addDays, addMonths, marketDayOnOrBefore, marketDaysBack } from './calendar'
import { closeBetDirect, openBetDirect, runDay, uid } from './engine'
import { qtyFromDollars } from './guardrails'
import { engineFor, series } from './prices'
import { seedCoreTargets, seedThemes } from './themes'
import type { BetSpec, Day, Ledger, Purchase, Settings, Subscription } from './types'
import { priceOn, round2 } from './valuation'

/**
 * A year of fabricated history, so the app looks lived-in on day one: $10,000
 * in, $8,000 into the core a year ago, six theses opened over the months (two
 * already closed, one by its deadline and one by hand), subscriptions the
 * bank has spotted, and a few things being saved for.
 *
 * It is made by running the real engine over the year, day by day, so every
 * snapshot, fee and verdict is what the rules produce — not typed in.
 */

export const defaultSettings = (): Settings => ({
  sleevePct: 20,
  corePct: 80,
  perBetCap: 500,
  defaultAutoExitPct: -100,
  borrowFeePct: 6,
  coolOffAboveUsd: 200,
  coolOffDays: 30,
  monthlyDepositUsd: 600,
  monthlyEmail: false,
  coreTargets: seedCoreTargets.map((t) => ({ ...t })),
  themes: seedThemes.map((t) => ({ ...t, aliases: [...t.aliases] })),
})

interface ScriptedBet {
  /** Market days before today it was opened. */
  ago: number
  sentence: string
  direction: BetSpec['direction']
  themeKey: string
  months: number
  amount: number
  autoExitPct?: number
  /** Closed by hand this many market days before today. */
  closedAgo?: number
  notes: { ago: number; text: string }[]
}

const SCRIPT: ScriptedBet[] = [
  {
    ago: 236,
    sentence: 'long gold, 8mo, $300',
    direction: 'up',
    themeKey: 'gold',
    months: 8,
    amount: 300,
    notes: [
      { ago: 230, text: 'Central banks keep buying and real rates look like they have peaked. Gold is the boring way to say "I don’t trust the next two years".' },
      { ago: 150, text: 'Up nicely. Tempted to add — not doing it. The point is to see whether the first sentence was right, not to chase it.' },
      { ago: 64, text: 'Lesson: the thesis was simple and the horizon matched it. I did nothing for eight months and that was the right amount of doing.' },
    ],
  },
  {
    ago: 215,
    sentence: 'long clean energy, 1y, $200',
    direction: 'up',
    themeKey: 'clean energy',
    months: 12,
    amount: 200,
    closedAgo: 99,
    notes: [
      { ago: 213, text: 'Subsidies are locked in for a decade and wind and solar are the cheapest new power. This only goes one way.' },
      { ago: 160, text: 'Down a fifth. Rates went up and every project is financed with debt. I did not think about the cost of money at all.' },
      { ago: 99, text: 'Lesson: "only goes one way" was the warning. I bet on a policy staying put and ignored interest rates. Next time, write down what would make me wrong before I put money in.' },
    ],
  },
  {
    ago: 190,
    sentence: 'long nuclear, 2y, $250',
    direction: 'up',
    themeKey: 'nuclear',
    months: 24,
    amount: 250,
    notes: [
      { ago: 188, text: 'Data centres need firm power; utilities are signing 20-year contracts for reactor output. Uranium supply is years behind.' },
      { ago: 70, text: 'Two more restart announcements. Still the slowest-moving bet I have, which is the point.' },
    ],
  },
  {
    ago: 148,
    sentence: 'short coffee, 18mo, $150',
    direction: 'down',
    themeKey: 'coffee',
    months: 18,
    amount: 150,
    notes: [
      { ago: 146, text: 'Brazil’s crop recovers and the price spike was weather, not demand. Mean reversion over 18 months.' },
      { ago: 40, text: 'Moving my way, slowly. The fee is small but it is there every day — worth remembering for shorts.' },
    ],
  },
  {
    ago: 86,
    sentence: 'long copper, 2028, $200',
    direction: 'up',
    themeKey: 'copper',
    months: 26,
    amount: 200,
    notes: [{ ago: 85, text: 'Grids, EVs and data centres all need copper and no big new mine opens before 2030.' }],
  },
  {
    ago: 42,
    sentence: 'short office real estate, 1y, $100',
    direction: 'down',
    themeKey: 'office real estate',
    months: 12,
    amount: 100,
    notes: [{ ago: 41, text: 'Leases signed before 2020 keep rolling off. Hybrid work is the new normal, and refinancing walls are coming.' }],
  },
]

const SUBS: (Omit<Subscription, 'id' | 'nextCharge' | 'status' | 'detectedFrom'> & { chargedAgo: number })[] = [
  { name: 'Netflix', category: 'Streaming', amount: 15.49, cadence: 'monthly', lastUsedDaysAgo: 3, cancelHow: 'netflix.com/cancelplan', chargedAgo: 15 },
  { name: 'Disney+', category: 'Streaming', amount: 13.99, cadence: 'monthly', lastUsedDaysAgo: 52, cancelHow: 'disneyplus.com → Account → Subscription → Cancel', chargedAgo: 8 },
  { name: 'Spotify', category: 'Music', amount: 11.99, cadence: 'monthly', lastUsedDaysAgo: 0, cancelHow: 'spotify.com/account → Manage plan → Cancel', chargedAgo: 22 },
  { name: 'iCloud+ 200 GB', category: 'Storage', amount: 2.99, cadence: 'monthly', lastUsedDaysAgo: 0, cancelHow: 'Settings → your name → iCloud → Manage storage → Change plan', chargedAgo: 3 },
  { name: 'New York Times', category: 'News', amount: 25, cadence: 'monthly', lastUsedDaysAgo: 9, cancelHow: 'nytimes.com/account → Cancel subscription (or chat)', chargedAgo: 19 },
  { name: 'CityFit gym', category: 'Fitness', amount: 49, cadence: 'monthly', lastUsedDaysAgo: 41, cancelHow: 'In person at the front desk, or a signed letter — check the 30-day notice', chargedAgo: 12 },
  { name: 'Peloton App', category: 'Fitness', amount: 12.99, cadence: 'monthly', lastUsedDaysAgo: 118, cancelHow: 'onepeloton.com → Subscriptions → Cancel', chargedAgo: 5 },
  { name: 'Adobe Creative Cloud', category: 'Software', amount: 59.99, cadence: 'monthly', lastUsedDaysAgo: 67, cancelHow: 'account.adobe.com/plans → Cancel (watch the early-exit fee on annual plans)', chargedAgo: 26 },
  { name: 'Audible', category: 'Books', amount: 14.95, cadence: 'monthly', lastUsedDaysAgo: 88, cancelHow: 'audible.com/account → Cancel membership (spend your credits first)', chargedAgo: 10 },
  { name: 'Duolingo Super', category: 'Learning', amount: 83.99, cadence: 'yearly', lastUsedDaysAgo: 1, cancelHow: 'App Store → Subscriptions → Duolingo', chargedAgo: -47 },
]

export function seedLedger(todayWall: Day): Ledger {
  const today = marketDayOnOrBefore(todayWall)
  const days = marketDaysBack(today, 400)
  const settings = defaultSettings()
  const themeSymbols = SCRIPT.map((s) => seedThemes.find((t) => t.key === s.themeKey)!.symbol)
  const symbols = [...settings.coreTargets.map((t) => t.symbol), ...themeSymbols]
  const prices: Record<string, number[]> = {}
  for (const s of symbols) prices[s] = series(s, days.length, engineFor(s, settings.themes))

  const startIndex = days.length - 262
  const l: Ledger = {
    version: 1,
    asOf: days[startIndex],
    days,
    prices,
    account: { cash: 0 },
    settings: { ...settings, monthlyDepositUsd: 0 },
    holdings: [],
    bets: [],
    journal: [],
    orders: [],
    deposits: [],
    snapshots: [],
    subscriptions: [],
    purchases: [],
    transactions: [],
    proposals: [],
  }

  /* A year ago: $10,000 in, $8,000 into the core at the target mix. */
  const start = days[startIndex]
  l.account.cash = 10_000
  l.deposits.push({ id: uid('dp'), amount: 10_000, date: start, source: 'mock' })
  l.transactions.push({ id: uid('tx'), date: start, kind: 'deposit', label: 'Opening deposit', amount: 10_000 })
  for (const t of settings.coreTargets) {
    const dollars = (8_000 * t.weight) / 100
    const price = priceOn(l, t.symbol, start)
    l.holdings.push({ id: uid('h'), symbol: t.symbol, qty: qtyFromDollars(dollars, price), avgCost: price, bucket: 'core' })
    l.account.cash = round2(l.account.cash - dollars)
    l.transactions.push({ id: uid('tx'), date: start, kind: 'core-buy', label: `Core: bought ${t.symbol}`, amount: -dollars })
  }
  runDay(l, start, start)

  const agoOf = (i: number) => days.length - 1 - i
  const opened = new Map<ScriptedBet, string>()
  const subsStart = days.length - 1 - 24

  for (let i = startIndex + 1; i < days.length; i++) {
    const day = days[i]
    const ago = agoOf(i)
    l.asOf = day
    for (const s of SCRIPT) {
      if (s.ago === ago) {
        const deadline = addMonths(day, s.months)
        const bet = openBetDirect(l, { kind: 'bet', sentence: s.sentence, direction: s.direction, themeKey: s.themeKey, deadline, amount: s.amount, autoExitPct: s.autoExitPct ?? null }, { day, at: `${day}T14:30:00.000Z` })
        opened.set(s, bet.id)
      }
      const id = opened.get(s)
      if (id && s.closedAgo === ago) closeBetDirect(l, id, 'manual', day, `${day}T15:10:00.000Z`)
      if (id) for (const n of s.notes) if (n.ago === ago) l.journal.push({ id: uid('jn'), betId: id, date: day, at: `${day}T20:${String(10 + (n.text.length % 40)).padStart(2, '0')}:00.000Z`, note: n.text, source: 'user' })
    }
    /* The bank started reporting about a month ago. */
    if (i === subsStart) {
      for (const s of SUBS) {
        const { chargedAgo, ...rest } = s
        l.subscriptions.push({ ...rest, id: uid('sub'), nextCharge: addDays(todayWall, -chargedAgo), status: 'active', detectedFrom: 'bank' })
      }
    }
    runDay(l, day, days[i - 1])
  }

  /* Things being saved for. */
  const planned = (title: string, price: number, saved: number, monthly: number, wantMonths: number, createdDaysAgo: number, note?: string): Purchase => {
    const createdOn = addDays(today, -createdDaysAgo)
    return {
      id: uid('pu'),
      title,
      price,
      saved,
      monthly,
      wantBy: addMonths(today, wantMonths),
      createdOn,
      coolOffUntil: price > settings.coolOffAboveUsd ? addDays(createdOn, settings.coolOffDays) : undefined,
      status: 'planned',
      note,
    }
  }
  l.purchases.push(
    planned('Road bike', 1400, 240, 120, 6, 52, 'For the commute. Second-hand is fine if it fits.'),
    planned('Weekend in Lisbon', 900, 150, 100, 8, 70),
    planned('Laptop', 2200, 0, 150, 11, 20, 'When the current one stops holding a charge, not before.'),
    planned('Noise-cancelling headphones', 349, 0, 0, 2, 6, 'Wanted it on a whim. The cooling-off will tell.'),
  )

  l.settings.monthlyDepositUsd = settings.monthlyDepositUsd
  return l
}
