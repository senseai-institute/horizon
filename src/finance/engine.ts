import type { Bank, Broker } from './adapters'
import { coreWeights } from './adapters'
import { addMonths, daysBetween, longDay, monthKey, nextMarketDay, shortDay } from './calendar'
import { CODE_TTL_MS, autoExitFor, betProblems, mintCode, qtyFromDollars, sleeveRoom, verifyCode } from './guardrails'
import { engineFor, series, step } from './prices'
import { findTheme } from './themes'
import {
  availableCash,
  betPnl,
  betValueAt,
  coreCost,
  coreValue,
  openBets,
  priceOn,
  realizedCum,
  round2,
  sleeveCost,
  sleeveValue,
  totalValue,
} from './valuation'
import type { Bet, BetSpec, CardLine, Command, Day, JournalNote, Ledger, Order, Proposal, Purchase, Snapshot, Subscription, Verdict } from './types'

/**
 * The engine: proposals, confirmation, and the daily tick. Every function
 * takes a ledger and returns a new one; nothing is changed in place from the
 * outside. Money only moves in `confirm`, and only through a Broker or Bank.
 */

let seq = 0
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`

const clone = (l: Ledger): Ledger => structuredClone(l)
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
const usd2 = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const signed = (n: number) => `${n >= 0 ? '+' : '−'}${usd2(Math.abs(n))}`
const pct = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}%`

const COMMODITY = new Set(['JO', 'CPER', 'GLD', 'SLV', 'USO', 'UNG', 'WEAT', 'IBIT', 'ETHA'])

/** "coffee price goes DOWN", "Japan goes UP". */
export function betHeadline(b: Pick<Bet, 'themeLabel' | 'symbol' | 'direction'>): string {
  const name = COMMODITY.has(b.symbol) ? `${b.themeLabel.toLowerCase()} price` : b.themeLabel
  return `${name} goes ${b.direction === 'up' ? 'UP' : 'DOWN'}`
}

/* ------------------------------------------------------------------ */
/* Prices                                                               */
/* ------------------------------------------------------------------ */

/** Gives a symbol a full price history if it has none, so it can be traded. */
export function ensureSymbol(draft: Ledger, symbol: string): void {
  if (draft.prices[symbol]?.length === draft.days.length) return
  draft.prices[symbol] = series(symbol, draft.days.length, engineFor(symbol, draft.settings.themes))
}

/* ------------------------------------------------------------------ */
/* Journal                                                              */
/* ------------------------------------------------------------------ */

function note(draft: Ledger, betId: string, text: string, source: JournalNote['source'], day: Day = draft.asOf, at = new Date().toISOString()): void {
  draft.journal.push({ id: uid('jn'), betId, date: day, at, note: text, source })
}

export function addJournal(l: Ledger, betId: string, text: string): Ledger {
  const draft = clone(l)
  note(draft, betId, text.trim(), 'user')
  return draft
}

/* ------------------------------------------------------------------ */
/* Opening and closing bets (no codes here — confirm() and seed only)   */
/* ------------------------------------------------------------------ */

export function verdictFor(pnl: number, dollarsIn: number): Verdict {
  const r = pnl / dollarsIn
  return r > 0.02 ? 'win' : r < -0.02 ? 'loss' : 'flat'
}

/** What the core's target mix returned between two days, in percent. */
export function coreReturnBetween(l: Ledger, from: Day, to: Day): number {
  let r = 0
  for (const t of l.settings.coreTargets) {
    if (!l.prices[t.symbol]) continue
    r += (t.weight / 100) * (priceOn(l, t.symbol, to) / priceOn(l, t.symbol, from) - 1)
  }
  return r * 100
}

export function openBetDirect(draft: Ledger, spec: BetSpec, opts: { day?: Day; price?: number; qty?: number; at?: string } = {}): Bet {
  const theme = findTheme(draft.settings.themes, spec.themeKey)
  if (!theme) throw new Error(`Unknown theme ${spec.themeKey}`)
  ensureSymbol(draft, theme.symbol)
  const day = opts.day ?? draft.asOf
  const price = opts.price ?? priceOn(draft, theme.symbol, day)
  const bet: Bet = {
    id: uid('bet'),
    sentence: spec.sentence,
    direction: spec.direction,
    themeKey: theme.key,
    themeLabel: theme.label,
    symbol: theme.symbol,
    dollarsIn: spec.amount,
    qty: opts.qty ?? qtyFromDollars(spec.amount, price),
    entryPrice: price,
    entryDate: day,
    deadline: spec.deadline,
    autoExitPct: autoExitFor(spec, draft.settings),
    borrowFeePct: spec.direction === 'down' ? draft.settings.borrowFeePct : 0,
    feesPaid: 0,
    status: 'open',
  }
  draft.bets.push(bet)
  draft.account.cash = round2(draft.account.cash - spec.amount)
  draft.transactions.push({ id: uid('tx'), date: day, kind: 'bet-open', label: `Bet: ${betHeadline(bet)}`, amount: -spec.amount })
  const exit = bet.autoExitPct === null ? 'no auto-exit' : `auto-exit if down ${usd((Math.abs(bet.autoExitPct) / 100) * bet.dollarsIn)}`
  note(draft, bet.id, `Opened: ${usd(bet.dollarsIn)} on ${betHeadline(bet)} through ${bet.symbol} at ${usd2(price)}. Deadline ${longDay(bet.deadline)}, ${exit}.`, 'system', day, opts.at)
  return bet
}

export function closeBetDirect(draft: Ledger, betId: string, reason: Bet['closeReason'], day: Day = draft.asOf, at?: string): Bet {
  const bet = draft.bets.find((b) => b.id === betId)
  if (!bet || bet.status !== 'open') throw new Error('That bet is not open.')
  const price = priceOn(draft, bet.symbol, day)
  const value = round2(betValueAt(bet, price))
  const pnl = round2(value - bet.dollarsIn - bet.feesPaid)
  bet.status = 'closed'
  bet.closeReason = reason
  bet.closePrice = price
  bet.closeDate = day
  bet.realizedPnl = pnl
  bet.verdict = verdictFor(pnl, bet.dollarsIn)
  bet.coreReturnPct = round2(coreReturnBetween(draft, bet.entryDate, day))
  draft.account.cash = round2(draft.account.cash + value)
  draft.transactions.push({ id: uid('tx'), date: day, kind: 'bet-close', label: `Closed: ${betHeadline(bet)}`, amount: value })
  const result = `${bet.verdict} — ${signed(pnl)} (${pct((pnl / bet.dollarsIn) * 100)}); core did ${pct(bet.coreReturnPct)} over the same days`
  const lead = reason === 'deadline' ? 'Closed at deadline' : reason === 'auto-exit' ? 'Auto-exit fired' : 'Closed by hand'
  note(draft, bet.id, `${lead}: ${result}.`, 'system', day, at)
  return bet
}

/* ------------------------------------------------------------------ */
/* The day                                                              */
/* ------------------------------------------------------------------ */

export function snapshotOf(l: Ledger, day: Day = l.asOf): Snapshot {
  const core = coreValue(l, day)
  const sleeve = sleeveValue(l, day)
  return {
    date: day,
    totalValue: round2(l.account.cash + core + sleeve),
    coreValue: round2(core),
    coreCost: round2(coreCost(l)),
    sleeveValue: round2(sleeve),
    sleeveCost: round2(sleeveCost(l)),
    realizedCum: round2(realizedCum(l)),
    cash: round2(l.account.cash),
  }
}

/**
 * Everything that happens on a market day once its prices exist: fees,
 * auto-exits, deadlines, subscriptions, the monthly transfer and
 * set-asides, and the snapshot. `draft` is changed in place.
 */
export function runDay(draft: Ledger, day: Day, prevDay: Day): void {
  draft.asOf = day
  const at = `${day}T21:00:00.000Z`

  for (const bet of openBets(draft)) {
    if (bet.direction === 'down' && bet.borrowFeePct > 0) {
      /* Unrounded: a cent a day rounds to nothing, a month of them does not. */
      const fee = (bet.dollarsIn * bet.borrowFeePct) / 100 / 252
      bet.feesPaid += fee
      draft.account.cash -= fee
    }
    const price = priceOn(draft, bet.symbol, day)
    const lossPct = ((betValueAt(bet, price) - bet.dollarsIn) / bet.dollarsIn) * 100
    if (bet.autoExitPct !== null && lossPct <= bet.autoExitPct) closeBetDirect(draft, bet.id, 'auto-exit', day, at)
    else if (bet.deadline <= day) closeBetDirect(draft, bet.id, 'deadline', day, at)
  }

  for (const sub of draft.subscriptions) {
    if (sub.status === 'cancelled' || sub.nextCharge > day) continue
    if (sub.status === 'cancelling') {
      sub.status = 'cancelled'
      sub.cancelledOn = sub.nextCharge
      continue
    }
    draft.account.cash = round2(draft.account.cash - sub.amount)
    draft.transactions.push({ id: uid('tx'), date: day, kind: 'subscription', label: sub.name, amount: -sub.amount })
    sub.nextCharge = addMonths(sub.nextCharge, sub.cadence === 'yearly' ? 12 : 1)
  }

  if (monthKey(day) !== monthKey(prevDay)) {
    if (draft.settings.monthlyDepositUsd > 0) {
      const amount = draft.settings.monthlyDepositUsd
      draft.account.cash = round2(draft.account.cash + amount)
      draft.deposits.push({ id: uid('dp'), amount, date: day, source: 'mock' })
      draft.transactions.push({ id: uid('tx'), date: day, kind: 'deposit', label: 'Monthly transfer in', amount })
    }
    for (const p of draft.purchases) {
      if (p.status !== 'planned' || p.monthly <= 0) continue
      const put = Math.max(0, Math.min(p.monthly, p.price - p.saved, availableCash(draft)))
      p.saved = round2(p.saved + put)
    }
  }

  const snap = snapshotOf(draft, day)
  const last = draft.snapshots[draft.snapshots.length - 1]
  if (last?.date === day) draft.snapshots[draft.snapshots.length - 1] = snap
  else draft.snapshots.push(snap)
  if (draft.snapshots.length > 1500) draft.snapshots.splice(0, draft.snapshots.length - 1500)
}

/** One market day forward: new closes for every symbol, then the day's rules. */
export function tick(l: Ledger): Ledger {
  const draft = clone(l)
  tickInPlace(draft)
  return draft
}

function tickInPlace(draft: Ledger): void {
  const prev = draft.asOf
  const day = nextMarketDay(prev)
  const index = draft.days.length
  draft.days.push(day)
  for (const symbol of Object.keys(draft.prices)) {
    const s = draft.prices[symbol]
    s.push(step(symbol, s[s.length - 1], index, engineFor(symbol, draft.settings.themes)))
  }
  runDay(draft, day, prev)
}

/** n market days forward. The demo's fast-forward. */
export function advance(l: Ledger, n: number): Ledger {
  const draft = clone(l)
  for (let i = 0; i < n; i++) tickInPlace(draft)
  return draft
}

/** Ticks up to today on the wall clock, if the ledger is behind it. */
export function catchUp(l: Ledger, today: Day): { ledger: Ledger; days: number } {
  let n = 0
  let d = l.asOf
  while (nextMarketDay(d) <= today && n < 400) {
    d = nextMarketDay(d)
    n++
  }
  return n ? { ledger: advance(l, n), days: n } : { ledger: l, days: 0 }
}

/* ------------------------------------------------------------------ */
/* Proposals                                                            */
/* ------------------------------------------------------------------ */

export type ProposeResult = { ok: true; ledger: Ledger; proposal: Proposal } | { ok: false; message: string }

function card(draft: Ledger, kind: Proposal['kind'], title: string, lines: CardLine[], payload: Proposal['payload'], nowMs: number, withCode = true): Proposal {
  const p: Proposal = {
    id: uid('pr'),
    kind,
    title,
    lines,
    code: withCode ? mintCode() : '',
    createdAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + CODE_TTL_MS).toISOString(),
    status: 'pending',
    orderIds: [],
    payload,
  }
  /* One live card at a time: a new one replaces any still pending. */
  for (const old of draft.proposals) if (old.status === 'pending') old.status = 'dismissed'
  draft.proposals.push(p)
  if (draft.proposals.length > 60) draft.proposals.splice(0, draft.proposals.length - 60)
  return p
}

function pendingOrder(draft: Ledger, p: Proposal, o: Omit<Order, 'id' | 'proposalId' | 'status' | 'code' | 'createdAt'>): void {
  const order: Order = { ...o, id: uid('ord'), proposalId: p.id, status: 'proposed', code: p.code, createdAt: p.createdAt }
  draft.orders.push(order)
  p.orderIds.push(order.id)
}

const matches = (q: string, ...names: (string | undefined)[]) => {
  const s = q.toLowerCase().trim()
  return names.some((n) => n && (n.toLowerCase().includes(s) || s.includes(n.toLowerCase())))
}

export function findBet(l: Ledger, q: string): Bet | undefined {
  return openBets(l).find((b) => matches(q, b.themeKey, b.themeLabel, b.symbol)) ?? openBets(l).find((b) => matches(q, b.sentence))
}

export function findSubscription(l: Ledger, q: string): Subscription | undefined {
  const live = l.subscriptions.filter((s) => s.status === 'active')
  return live.find((s) => s.name.toLowerCase() === q.toLowerCase()) ?? live.find((s) => matches(q, s.name)) ?? live.find((s) => matches(q, s.category))
}

export function findPurchase(l: Ledger, q: string): Purchase | undefined {
  const live = l.purchases.filter((p) => p.status === 'planned')
  return live.find((p) => matches(q, p.title)) ?? live.find((p) => q.toLowerCase().split(' ').some((w) => w.length > 2 && p.title.toLowerCase().includes(w)))
}

/** A plan's sensible monthly: what it takes to get there by the date. */
export function monthlyNeeded(price: number, saved: number, from: Day, wantBy: Day): number {
  const months = Math.max(1, Math.round(daysBetween(from, wantBy) / 30.4))
  return Math.ceil(Math.max(0, price - saved) / months)
}

/** The purchase most behind its schedule, for freed subscription money. */
export function neediestPurchase(l: Ledger): Purchase | undefined {
  return l.purchases
    /* Not a whim still cooling off: freed money goes to plans you've committed to. */
    .filter((p) => p.status === 'planned' && p.saved < p.price && !(p.coolOffUntil && p.coolOffUntil > l.asOf))
    .map((p) => ({ p, gap: monthlyNeeded(p.price, p.saved, l.asOf, p.wantBy) - p.monthly }))
    .sort((a, b) => b.gap - a.gap)[0]?.p
}

function cancelLines(l: Ledger, sub: Subscription, redirect: Subscription['redirectTo']): CardLine[] {
  const monthly = sub.cadence === 'yearly' ? sub.amount / 12 : sub.amount
  const to = redirect?.kind === 'purchase' ? l.purchases.find((p) => p.id === redirect.purchaseId) : undefined
  return [
    { label: 'Cancel', value: sub.name },
    { label: 'Saves', value: `${usd2(monthly)}/mo — ${usd(monthly * 12)} a year` },
    { label: 'Last used', value: sub.lastUsedDaysAgo === null ? 'unknown' : sub.lastUsedDaysAgo === 0 ? 'today' : `${sub.lastUsedDaysAgo} days ago` },
    { label: 'Access until', value: `${longDay(sub.nextCharge)} — the end of what you've paid for` },
    { label: 'Freed money goes to', value: to ? `${to.title} (+${usd2(monthly)} a month set aside)` : 'Cash' },
    { label: 'To finish it for real', value: `${sub.cancelHow}. Horizon adds a to-do and stops counting it.` },
  ]
}

/** Turns a parsed command into a card waiting for its code. */
export function propose(l: Ledger, cmd: Exclude<Command, { kind: 'forward' }>, nowMs: number): ProposeResult {
  const draft = clone(l)

  switch (cmd.kind) {
    case 'bet': {
      const theme = findTheme(draft.settings.themes, cmd.themeKey)
      if (!theme) return { ok: false, message: `No theme "${cmd.themeKey}" in the table.` }
      const problems = betProblems(draft, cmd)
      if (problems.length) return { ok: false, message: problems.join(' ') }
      ensureSymbol(draft, theme.symbol)
      const price = priceOn(draft, theme.symbol)
      const qty = qtyFromDollars(cmd.amount, price)
      const exit = autoExitFor(cmd, draft.settings)
      const head = betHeadline({ themeLabel: theme.label, symbol: theme.symbol, direction: cmd.direction })
      const lossAtExit = exit === null ? cmd.amount : (Math.abs(exit) / 100) * cmd.amount
      const room = sleeveRoom(draft).room - cmd.amount
      const lines: CardLine[] = [
        { label: 'Bet', value: head },
        { label: 'Money in', value: usd(cmd.amount) },
        { label: 'Deadline', value: longDay(cmd.deadline) },
        { label: 'Auto-exit', value: exit === null ? 'none — it runs to the deadline' : `closes if you've lost ${usd(lossAtExit)}` },
        {
          label: 'Worst case',
          value:
            exit === null
              ? `${usd(cmd.amount)} (if ${theme.label.toLowerCase()} went to zero)`
              : `~${usd(lossAtExit)} (can run a little over in a sharp ${cmd.direction === 'down' ? 'spike' : 'drop'})`,
        },
        { label: 'Fee', value: cmd.direction === 'down' ? `~${usd2((cmd.amount * draft.settings.borrowFeePct) / 100 / 12)}/mo` : 'none' },
        { label: 'Through', value: `${theme.symbol} at ${usd2(price)} — ${qty.toFixed(4)} units, worked out from the dollars` },
        { label: 'Sleeve room after', value: `${usd(Math.max(0, room))} of ${usd(sleeveRoom(draft).limit)}` },
      ]
      const p = card(draft, 'bet', `Bet: ${head}`, lines, { kind: 'bet', spec: { ...cmd, autoExitPct: exit }, symbol: theme.symbol, price, qty }, nowMs)
      pendingOrder(draft, p, { symbol: theme.symbol, side: cmd.direction === 'up' ? 'buy' : 'short', qty, price, dollars: cmd.amount, bucket: 'thesis' })
      return { ok: true, ledger: draft, proposal: p }
    }

    case 'close': {
      const bet = cmd.betId ? openBets(draft).find((b) => b.id === cmd.betId) : findBet(draft, cmd.query)
      if (!bet) return { ok: false, message: `No open bet matches "${cmd.query}".` }
      const price = priceOn(draft, bet.symbol)
      const value = betValueAt(bet, price)
      const pnl = betPnl(draft, bet)
      const lines: CardLine[] = [
        { label: 'Close', value: betHeadline(bet) },
        { label: 'Money in', value: `${usd(bet.dollarsIn)} on ${longDay(bet.entryDate)}` },
        { label: 'Worth now', value: usd2(value) },
        { label: 'Result', value: `${signed(pnl)} (${pct((pnl / bet.dollarsIn) * 100)}), fees included` },
        { label: 'Deadline was', value: `${longDay(bet.deadline)} — ${daysBetween(draft.asOf, bet.deadline)} days early` },
        { label: 'Money back', value: `${usd2(value)} to cash` },
      ]
      const p = card(draft, 'close', `Close: ${betHeadline(bet)}`, lines, { kind: 'close', betId: bet.id }, nowMs)
      pendingOrder(draft, p, { betId: bet.id, symbol: bet.symbol, side: bet.direction === 'up' ? 'sell' : 'cover', qty: bet.qty, price, dollars: value, bucket: 'thesis' })
      return { ok: true, ledger: draft, proposal: p }
    }

    case 'rebalance': {
      const plan = rebalancePlan(draft)
      if (!plan.orders.length) return { ok: false, message: 'The core is on target and there is no idle cash to put in.' }
      const lines: CardLine[] = plan.orders.map((o) => ({
        label: o.side === 'buy' ? 'Buy' : 'Sell',
        value: `${usd(o.dollars)} of ${o.symbol} (${o.qty.toFixed(4)} units at ${usd2(o.price)})`,
      }))
      if (plan.invest > 0) lines.push({ label: 'Idle cash put in', value: usd(plan.invest) })
      lines.push({ label: 'Core after', value: draft.settings.coreTargets.map((t) => `${t.symbol} ${t.weight}%`).join(' · ') })
      const p = card(draft, 'rebalance', 'Rebalance the core', lines, { kind: 'rebalance' }, nowMs)
      for (const o of plan.orders) pendingOrder(draft, p, { ...o, bucket: 'core' })
      return { ok: true, ledger: draft, proposal: p }
    }

    case 'deposit': {
      if (cmd.amount > 50_000) return { ok: false, message: 'Keep a single deposit under $50,000 in this build.' }
      const lines: CardLine[] = [
        { label: 'Add money', value: usd2(cmd.amount) },
        { label: 'From', value: 'Checking (mock bank)' },
        { label: 'Arrives', value: 'Now — simulated' },
        { label: 'Cash after', value: usd2(availableCash(draft) + cmd.amount) },
      ]
      const p = card(draft, 'deposit', `Add ${usd(cmd.amount)}`, lines, { kind: 'deposit', amount: cmd.amount }, nowMs)
      return { ok: true, ledger: draft, proposal: p }
    }

    case 'cancel': {
      const sub = findSubscription(draft, cmd.query)
      if (!sub) {
        const any = draft.subscriptions.find((s) => matches(cmd.query, s.name))
        return { ok: false, message: any ? `${any.name} is already ${any.status}.` : `No subscription matches "${cmd.query}". Subscriptions lists everything the bank has seen.` }
      }
      const target = neediestPurchase(draft)
      const redirect: Subscription['redirectTo'] = target ? { kind: 'purchase', purchaseId: target.id } : { kind: 'cash' }
      const p = card(draft, 'cancel', `Cancel ${sub.name}`, cancelLines(draft, sub, redirect), { kind: 'cancel', subscriptionId: sub.id, redirect }, nowMs)
      return { ok: true, ledger: draft, proposal: p }
    }

    case 'plan': {
      const monthly = cmd.monthly ?? monthlyNeeded(cmd.price, 0, draft.asOf, cmd.wantBy)
      const coolOff = cmd.price > draft.settings.coolOffAboveUsd ? addDaysSafe(draft.asOf, draft.settings.coolOffDays) : undefined
      const lines: CardLine[] = [
        { label: 'Save for', value: cmd.title },
        { label: 'Price', value: usd(cmd.price) },
        { label: 'Want it by', value: longDay(cmd.wantBy) },
        { label: 'Set aside each month', value: `${usd(monthly)}, on the 1st, out of cash` },
        { label: 'Cooling-off', value: coolOff ? `can't buy before ${longDay(coolOff)} (over ${usd(draft.settings.coolOffAboveUsd)})` : 'none — under the threshold' },
      ]
      const p = card(draft, 'plan', `Plan: ${cmd.title}`, lines, { kind: 'plan', title: cmd.title, price: cmd.price, wantBy: cmd.wantBy, monthly }, nowMs, false)
      return { ok: true, ledger: draft, proposal: p }
    }

    case 'buy': {
      const pur = findPurchase(draft, cmd.query)
      if (!pur) return { ok: false, message: `Nothing planned matches "${cmd.query}". Plan it first: "save for ${cmd.query}, $…, by …".` }
      if (pur.coolOffUntil && pur.coolOffUntil > draft.asOf)
        return { ok: false, message: `${pur.title} is cooling off until ${longDay(pur.coolOffUntil)}. If you still want it then, it's yours.` }
      const fromCash = Math.max(0, pur.price - pur.saved)
      if (fromCash > availableCash(draft) + 0.005) return { ok: false, message: `${pur.title} needs ${usd(fromCash)} beyond what's set aside, and only ${usd(availableCash(draft))} is available.` }
      const lines: CardLine[] = [
        { label: 'Buy', value: pur.title },
        { label: 'Price', value: usd2(pur.price) },
        { label: 'From set aside', value: usd2(Math.min(pur.saved, pur.price)) },
        { label: 'From cash', value: usd2(fromCash) },
        { label: 'Planned since', value: `${longDay(pur.createdOn)} — ${daysBetween(pur.createdOn, draft.asOf)} days` },
      ]
      const p = card(draft, 'buy', `Buy ${pur.title}`, lines, { kind: 'buy', purchaseId: pur.id }, nowMs)
      return { ok: true, ledger: draft, proposal: p }
    }
  }
}

function addDaysSafe(day: Day, n: number): Day {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Changes where a cancelled subscription's money goes, before confirming. */
export function setCancelRedirect(l: Ledger, proposalId: string, redirect: Subscription['redirectTo']): Ledger {
  const draft = clone(l)
  const p = draft.proposals.find((x) => x.id === proposalId)
  if (!p || p.payload.kind !== 'cancel' || p.status !== 'pending') return l
  const sub = draft.subscriptions.find((s) => s.id === (p.payload as { subscriptionId: string }).subscriptionId)
  if (!sub) return l
  p.payload = { ...p.payload, redirect }
  p.lines = cancelLines(draft, sub, redirect)
  return draft
}

export interface RebalancePlan {
  invest: number
  orders: { symbol: string; side: 'buy' | 'sell'; qty: number; price: number; dollars: number }[]
}

/**
 * Back to the target mix. Idle cash goes in only up to the core's share of
 * the account, and never the sleeve's unused room or anything set aside.
 */
export function rebalancePlan(l: Ledger): RebalancePlan {
  const total = totalValue(l)
  const current = coreValue(l)
  const idle = Math.max(0, availableCash(l) - sleeveRoom(l).room)
  const invest = Math.floor(Math.max(0, Math.min(idle, (l.settings.corePct / 100) * total - current)))
  const target = current + invest
  const orders: RebalancePlan['orders'] = []
  for (const w of coreWeights(l)) {
    const want = (w.target / 100) * target
    const diff = want - w.value
    if (Math.abs(diff) < Math.max(5, target * 0.005)) continue
    const price = priceOn(l, w.symbol)
    orders.push({ symbol: w.symbol, side: diff > 0 ? 'buy' : 'sell', qty: Math.floor((Math.abs(diff) / price) * 1e6) / 1e6, price, dollars: round2(Math.abs(diff)) })
  }
  /* Sells first, so the buys can use what they free. */
  orders.sort((a, b) => (a.side === b.side ? 0 : a.side === 'sell' ? -1 : 1))
  return { invest: orders.length ? invest : 0, orders }
}

/* ------------------------------------------------------------------ */
/* Confirmation — the only place money moves                            */
/* ------------------------------------------------------------------ */

export type ConfirmResult = { ok: true; ledger: Ledger; message: string; effects: ConfirmEffect[] } | { ok: false; ledger: Ledger; message: string }

/** Things outside the ledger the caller should do: a to-do, a journal line. */
export type ConfirmEffect = { kind: 'todo'; text: string } | { kind: 'note'; title: string; detail: string }

export async function confirm(l: Ledger, proposalId: string, typed: string, nowMs: number, broker: Broker, bank: Bank): Promise<ConfirmResult> {
  const draft = clone(l)
  const p = draft.proposals.find((x) => x.id === proposalId)
  if (!p) return { ok: false, ledger: l, message: 'That card is gone.' }
  if (p.code) {
    const check = verifyCode(p, typed, nowMs)
    if (!check.ok) {
      if (check.reason === 'expired' && p.status === 'pending') {
        p.status = 'expired'
        for (const o of draft.orders) if (p.orderIds.includes(o.id)) o.status = 'expired'
        return { ok: false, ledger: draft, message: check.message }
      }
      return { ok: false, ledger: l, message: check.message }
    }
  } else if (p.status !== 'pending') return { ok: false, ledger: l, message: 'That card has already been used.' }

  const at = new Date(nowMs).toISOString()
  const fill = (id: string, qty: number, price: number) => {
    const o = draft.orders.find((x) => x.id === id)
    if (o) Object.assign(o, { status: 'filled', qty, price, filledAt: at, filledDay: draft.asOf })
  }
  const effects: ConfirmEffect[] = []
  let message = ''

  try {
    switch (p.payload.kind) {
      case 'bet': {
        const { spec } = p.payload
        /* The guardrails again: two minutes is long enough for the world to move. */
        const problems = betProblems(draft, spec)
        if (problems.length) return { ok: false, ledger: l, message: problems.join(' ') }
        const res = await broker.placeOrder({ symbol: p.payload.symbol, side: spec.direction === 'up' ? 'buy' : 'short', dollars: spec.amount, bucket: 'thesis' })
        if (res.status !== 'filled') return { ok: false, ledger: l, message: res.reason ?? 'The broker did not fill it.' }
        const bet = openBetDirect(draft, spec, { price: res.price, qty: res.qty, at })
        fill(p.orderIds[0], res.qty, res.price)
        const o = draft.orders.find((x) => x.id === p.orderIds[0])
        if (o) o.betId = bet.id
        message = `Placed: ${usd(spec.amount)} on ${betHeadline(bet)}.`
        effects.push({ kind: 'note', title: `Thesis placed: ${betHeadline(bet)}`, detail: `"${spec.sentence}" — ${usd(spec.amount)} until ${longDay(spec.deadline)}.` })
        break
      }
      case 'close': {
        const { betId } = p.payload
        const bet = draft.bets.find((b) => b.id === betId)
        if (!bet || bet.status !== 'open') return { ok: false, ledger: l, message: 'That bet is already closed.' }
        const res = await broker.placeOrder({ symbol: bet.symbol, side: bet.direction === 'up' ? 'sell' : 'cover', qty: bet.qty, bucket: 'thesis' })
        if (res.status !== 'filled') return { ok: false, ledger: l, message: res.reason ?? 'The broker did not fill it.' }
        const closed = closeBetDirect(draft, betId, 'manual', draft.asOf, at)
        fill(p.orderIds[0], res.qty, res.price)
        message = `Closed: ${betHeadline(closed)}, ${signed(closed.realizedPnl ?? 0)}. Write down what you learned while it's fresh.`
        effects.push({ kind: 'note', title: `Thesis closed: ${betHeadline(closed)}`, detail: `${closed.verdict} — ${signed(closed.realizedPnl ?? 0)}.` })
        break
      }
      case 'rebalance': {
        for (const id of p.orderIds) {
          const o = draft.orders.find((x) => x.id === id)!
          const res = await broker.placeOrder({ symbol: o.symbol, side: o.side, qty: o.qty, bucket: 'core' })
          if (res.status !== 'filled') continue
          const dollars = round2(res.qty * res.price)
          let h = draft.holdings.find((x) => x.bucket === 'core' && x.symbol === o.symbol)
          if (!h) {
            h = { id: uid('h'), symbol: o.symbol, qty: 0, avgCost: res.price, bucket: 'core' }
            draft.holdings.push(h)
          }
          if (o.side === 'buy') {
            h.avgCost = (h.qty * h.avgCost + dollars) / (h.qty + res.qty)
            h.qty += res.qty
            draft.account.cash = round2(draft.account.cash - dollars)
            draft.transactions.push({ id: uid('tx'), date: draft.asOf, kind: 'core-buy', label: `Core: bought ${o.symbol}`, amount: -dollars })
          } else {
            h.qty = Math.max(0, h.qty - res.qty)
            draft.account.cash = round2(draft.account.cash + dollars)
            draft.transactions.push({ id: uid('tx'), date: draft.asOf, kind: 'core-sell', label: `Core: sold ${o.symbol}`, amount: dollars })
          }
          fill(id, res.qty, res.price)
        }
        message = 'Core rebalanced to target.'
        break
      }
      case 'deposit': {
        const res = await bank.deposit(p.payload.amount)
        if (res.status === 'failed') return { ok: false, ledger: l, message: 'The bank declined the transfer.' }
        draft.account.cash = round2(draft.account.cash + res.amount)
        draft.deposits.push({ id: uid('dp'), amount: res.amount, date: res.day, source: bank.name === 'plaid' ? 'plaid' : 'mock' })
        draft.transactions.push({ id: uid('tx'), date: res.day, kind: 'deposit', label: 'Added money', amount: res.amount })
        message = `${usd2(res.amount)} added.`
        break
      }
      case 'cancel': {
        const { subscriptionId, redirect } = p.payload
        const sub = draft.subscriptions.find((s) => s.id === subscriptionId)
        if (!sub || sub.status !== 'active') return { ok: false, ledger: l, message: 'That subscription is no longer active.' }
        sub.status = 'cancelling'
        sub.redirectTo = redirect
        const monthly = sub.cadence === 'yearly' ? sub.amount / 12 : sub.amount
        let where = 'cash'
        if (redirect?.kind === 'purchase') {
          const pur = draft.purchases.find((x) => x.id === redirect.purchaseId)
          if (pur) {
            pur.monthly = round2(pur.monthly + monthly)
            where = pur.title
          }
        }
        message = `${sub.name} stops after ${shortDay(sub.nextCharge)}. ${usd2(monthly)} a month now goes to ${where}.`
        effects.push({ kind: 'todo', text: `Cancel ${sub.name} for real — ${sub.cancelHow}` })
        effects.push({ kind: 'note', title: `Cancelled ${sub.name}`, detail: `${usd2(monthly)} a month, redirected to ${where}.` })
        break
      }
      case 'plan': {
        const { title, price, wantBy, monthly } = p.payload
        draft.purchases.push({
          id: uid('pu'),
          title,
          price,
          saved: 0,
          monthly,
          wantBy,
          createdOn: draft.asOf,
          coolOffUntil: price > draft.settings.coolOffAboveUsd ? addDaysSafe(draft.asOf, draft.settings.coolOffDays) : undefined,
          status: 'planned',
        })
        message = `Planned: ${title}, ${usd(monthly)} a month set aside.`
        break
      }
      case 'buy': {
        const pur = draft.purchases.find((x) => x.id === (p.payload as { purchaseId: string }).purchaseId)
        if (!pur || pur.status !== 'planned') return { ok: false, ledger: l, message: 'That purchase is not planned any more.' }
        const fromCash = Math.max(0, pur.price - pur.saved)
        if (fromCash > availableCash(draft) + 0.005) return { ok: false, ledger: l, message: 'Not enough cash available for it now.' }
        pur.status = 'bought'
        pur.boughtOn = draft.asOf
        draft.account.cash = round2(draft.account.cash - pur.price)
        draft.transactions.push({ id: uid('tx'), date: draft.asOf, kind: 'purchase', label: pur.title, amount: -pur.price })
        message = `Bought: ${pur.title}. Enjoy it.`
        effects.push({ kind: 'note', title: `Bought ${pur.title}`, detail: `${usd2(pur.price)}, planned since ${longDay(pur.createdOn)}.` })
        break
      }
    }
  } catch (e) {
    return { ok: false, ledger: l, message: (e as Error).message }
  }

  p.status = 'used'
  /* Keep today's snapshot honest. */
  const snap = snapshotOf(draft)
  const last = draft.snapshots[draft.snapshots.length - 1]
  if (last?.date === draft.asOf) draft.snapshots[draft.snapshots.length - 1] = snap
  else draft.snapshots.push(snap)
  return { ok: true, ledger: draft, message, effects }
}

export function dismiss(l: Ledger, proposalId: string): Ledger {
  const draft = clone(l)
  const p = draft.proposals.find((x) => x.id === proposalId)
  if (p && p.status === 'pending') {
    p.status = 'dismissed'
    for (const o of draft.orders) if (p.orderIds.includes(o.id)) o.status = 'cancelled'
  }
  return draft
}

/* ------------------------------------------------------------------ */
/* Scorecard                                                            */
/* ------------------------------------------------------------------ */

export interface PeriodScore {
  key: '1m' | '3m' | 'ytd' | 'all'
  label: string
  from: Day
  coreReturn: number
  sleeveReturn: number
  corePnl: number
  sleevePnl: number
}

export interface Scorecard {
  periods: PeriodScore[]
  wins: number
  losses: number
  flats: number
  best?: { bet: Bet; returnPct: number }
  worst?: { bet: Bet; returnPct: number }
  lessons: { bet: Bet; note: JournalNote | undefined }[]
}

export function betReturnPct(l: Ledger, b: Bet): number {
  return (betPnl(l, b) / b.dollarsIn) * 100
}

export function scorecard(l: Ledger): Scorecard {
  const snaps = l.snapshots
  const end = snaps[snaps.length - 1]
  const periods: PeriodScore[] = []
  const year = l.asOf.slice(0, 4)
  const starts: [PeriodScore['key'], string, number][] = [
    ['1m', '1 month', Math.max(0, snaps.length - 22)],
    ['3m', '3 months', Math.max(0, snaps.length - 64)],
    ['ytd', 'Year to date', Math.max(0, snaps.findIndex((s) => s.date.startsWith(year)) - 1)],
    ['all', 'Since the start', 0],
  ]
  if (end) {
    for (const [key, label, i] of starts) {
      const s = snaps[i]
      const window = snaps.slice(i)
      const corePnl = end.coreValue - end.coreCost - (s.coreValue - s.coreCost)
      const sleevePnl = end.sleeveValue - end.sleeveCost + end.realizedCum - (s.sleeveValue - s.sleeveCost + s.realizedCum)
      const avg = (f: (x: Snapshot) => number) => {
        const xs = window.map(f).filter((x) => x > 0)
        return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
      }
      const coreBase = avg((x) => x.coreCost)
      const sleeveBase = avg((x) => x.sleeveCost)
      periods.push({
        key,
        label,
        from: s.date,
        corePnl: round2(corePnl),
        sleevePnl: round2(sleevePnl),
        coreReturn: coreBase ? (corePnl / coreBase) * 100 : 0,
        sleeveReturn: sleeveBase ? (sleevePnl / sleeveBase) * 100 : 0,
      })
    }
  }
  const closed = l.bets.filter((b) => b.status === 'closed')
  const ranked = l.bets.map((bet) => ({ bet, returnPct: betReturnPct(l, bet) })).sort((a, b) => b.returnPct - a.returnPct)
  const lessons = closed
    .slice()
    .sort((a, b) => (b.closeDate ?? '').localeCompare(a.closeDate ?? ''))
    .map((bet) => {
      const notes = l.journal.filter((j) => j.betId === bet.id).sort((a, b) => a.at.localeCompare(b.at))
      return { bet, note: [...notes].reverse().find((n) => n.source === 'user') ?? notes[notes.length - 1] }
    })
  return {
    periods,
    wins: closed.filter((b) => b.verdict === 'win').length,
    losses: closed.filter((b) => b.verdict === 'loss').length,
    flats: closed.filter((b) => b.verdict === 'flat').length,
    best: ranked[0],
    worst: ranked.length > 1 ? ranked[ranked.length - 1] : undefined,
    lessons,
  }
}

/** Subscriptions worth a second look, and why. */
export function subscriptionFlags(l: Ledger): Record<string, string> {
  const out: Record<string, string> = {}
  const live = l.subscriptions.filter((s) => s.status === 'active')
  for (const s of live) {
    const reasons: string[] = []
    if (s.lastUsedDaysAgo !== null && s.lastUsedDaysAgo >= 30) reasons.push(`not used in ${s.lastUsedDaysAgo} days`)
    const same = live.filter((x) => x.id !== s.id && x.category === s.category)
    if (same.length) reasons.push(`overlaps ${same.map((x) => x.name).join(', ')}`)
    if (reasons.length) out[s.id] = reasons.join('; ')
  }
  return out
}
