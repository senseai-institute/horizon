import { addDays, addMonths, daysBetween, toDay, parseDay } from './calendar'
import { closestThemes, findTheme } from './themes'
import type { BetSpec, Command, Day, Direction, ParseResult, Theme } from './types'

/**
 * The command box. One line of plain words, any horizon:
 *
 *   short coffee, 18mo, $100          a thesis bet (the main grammar)
 *   long nuclear 2y 250 exit -40%     the same, without commas, with an auto-exit
 *   cancel netflix                    a subscription
 *   save for a road bike, $1400, by april 2027
 *   buy road bike                     a planned purchase, from what is set aside
 *   add $500 · rebalance · close coffee · ff 30
 *
 * This is the offline parser and the source of truth: the Claude parser on
 * the server only rewrites free text into this grammar, and the result still
 * comes through here. It never guesses a theme — an unknown thing comes back
 * with the three closest it knows.
 */

export interface ParseContext {
  themes: Theme[]
  today: Day
}

const DIRECTIONS: [RegExp, Direction][] = [
  [/^(bet against|short|down on|down|against|sell)\s+/i, 'down'],
  [/^(bet on|long|up on|up|buy into|back)\s+/i, 'up'],
]

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 }

const EXAMPLES = 'Try "short coffee, 18mo, $100", "cancel netflix", "save for a bike, $1200, by june" or "add $500".'

/** "$100", "250", "1k", "$1.5k", "1,000", "100 dollars". */
export function parseAmount(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/\s*(dollars|bucks|usd)$/, '')
  const m = s.match(/^\$?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(k)?$/)
  if (!m) return null
  const n = Number(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1)
  return Number.isFinite(n) ? n : null
}

function endOfMonth(year: number, month: number): Day {
  return toDay(new Date(Date.UTC(year, month + 1, 0)))
}

/** "6mo", "18 months", "2y", "90d", "6w", "2028", "jun 2027", "by june". Returns the deadline. */
export function parseHorizon(raw: string, today: Day): Day | null {
  const s = raw.trim().toLowerCase().replace(/^(for|by|until|till|in|over|within)\s+/, '').replace(/^the next\s+/, '')
  let m = s.match(/^(\d+(?:\.\d+)?)\s*(mo|mos|mth|mths|month|months|m)$/)
  if (m) {
    const n = Number(m[1])
    const whole = Math.floor(n)
    return addDays(addMonths(today, whole), Math.round((n - whole) * 30))
  }
  m = s.match(/^(\d+(?:\.\d+)?)\s*(y|yr|yrs|year|years)$/)
  if (m) {
    const months = Math.round(Number(m[1]) * 12)
    return addMonths(today, months)
  }
  if (/^(a|one) year$/.test(s)) return addMonths(today, 12)
  if (/^(a|one) month$/.test(s)) return addMonths(today, 1)
  m = s.match(/^(\d+)\s*(w|wk|wks|week|weeks)$/)
  if (m) return addDays(today, Number(m[1]) * 7)
  m = s.match(/^(\d+)\s*(d|day|days)$/)
  if (m) return addDays(today, Number(m[1]))
  m = s.match(/^(?:end of\s+)?(20\d\d)$/)
  if (m) return `${m[1]}-12-31`
  m = s.match(/^(?:end of\s+)?([a-z]{3,9})\.?\s+(20\d\d)$/)
  if (m && MONTHS[m[1].slice(0, m[1] === 'sept' ? 4 : 3)] !== undefined) return endOfMonth(Number(m[2]), MONTHS[m[1].slice(0, 3)])
  m = s.match(/^(?:end of\s+)?([a-z]{3,9})$/)
  if (m && MONTHS[m[1].slice(0, 3)] !== undefined && m[1].length >= 3) {
    const t = parseDay(today)
    const month = MONTHS[m[1].slice(0, 3)]
    const year = month > t.getUTCMonth() ? t.getUTCFullYear() : t.getUTCFullYear() + 1
    return endOfMonth(year, month)
  }
  m = s.match(/^q([1-4])\s+(20\d\d)$/)
  if (m) return endOfMonth(Number(m[2]), Number(m[1]) * 3 - 1)
  return null
}

/** "exit -40%", "stop at 30%", "auto-exit -50". Always a negative percent. */
function parseExit(raw: string): number | null {
  const m = raw.trim().toLowerCase().match(/^(?:auto[- ]?)?(?:exit|stop|stop loss|stop-loss)(?:\s+(?:at|if|when))?\s+(?:down\s+)?-?(\d+(?:\.\d+)?)\s*%?$/)
  return m ? -Math.abs(Number(m[1])) : null
}

interface Peeled {
  rest: string[]
  amount: number | null
  deadline: Day | null
  exit: number | null
  monthly: number | null
}

/**
 * Takes the parts it recognises — amount, horizon, auto-exit, a monthly
 * figure — out of the comma-separated segments (or, without commas, off the
 * ends of the words), and leaves the thing behind.
 */
function peel(text: string, today: Day): Peeled {
  const out: Peeled = { rest: [], amount: null, deadline: null, exit: null, monthly: null }
  const take = (seg: string): boolean => {
    const s = seg.trim()
    if (!s) return true
    const monthly = s.toLowerCase().match(/^(.+?)\s*(?:\/\s*mo|\/\s*month|a month|per month|monthly|a mo)$/)
    if (monthly && out.monthly === null) {
      const n = parseAmount(monthly[1])
      if (n !== null) return (out.monthly = n), true
    }
    const ex = parseExit(s)
    if (ex !== null && out.exit === null) return (out.exit = ex), true
    const dl = parseHorizon(s, today)
    if (dl !== null && out.deadline === null) return (out.deadline = dl), true
    const amt = parseAmount(s)
    if (amt !== null && out.amount === null && !/^20\d\d$/.test(s)) return (out.amount = amt), true
    return false
  }
  /* Whole segments first, so "s&p 500, 1y, $100" keeps its 500. */
  const leftovers = text.replace(/(\d),(\d{3})(?!\d)/g, '$1$2').split(/\s*[,;]\s*/).filter((seg) => !take(seg))
  for (const seg of leftovers) {
    /* No luck as a whole: peel recognisable words off the end, longest first. */
    const words = seg.trim().split(/\s+/)
    let end = words.length
    let progressed = true
    while (progressed && end > 1) {
      progressed = false
      for (const width of [4, 3, 2, 1]) {
        if (end - width < 1) continue
        if (take(words.slice(end - width, end).join(' '))) {
          end -= width
          progressed = true
          break
        }
      }
    }
    out.rest.push(words.slice(0, end).join(' '))
  }
  return out
}

const cleanThing = (s: string) =>
  s
    .trim()
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/\s+(going|goes|will go|to go)\s+(up|down)$/i, '')
    .replace(/\s+(price|prices)$/i, '')
    .trim()

function parseBet(text: string, direction: Direction, rest: string, ctx: ParseContext): ParseResult {
  const p = peel(rest, ctx.today)
  const thing = cleanThing(p.rest.filter(Boolean).join(' '))
  if (!thing) return { ok: false, reason: 'malformed', message: 'What are you betting on? Name a thing, like coffee or nuclear.' }
  if (p.amount === null) return { ok: false, reason: 'malformed', message: `How much on ${thing}? Add an amount, like $100.` }
  if (p.amount <= 0) return { ok: false, reason: 'malformed', message: 'The amount has to be more than $0.' }
  if (p.deadline === null) return { ok: false, reason: 'malformed', message: `By when? Add a horizon, like 18mo, 2y or 2028.` }
  const span = daysBetween(ctx.today, p.deadline)
  if (span < 7) return { ok: false, reason: 'malformed', message: 'That deadline is too close or already past. Give it at least a week.' }
  if (span > 366 * 10) return { ok: false, reason: 'malformed', message: 'Ten years is the longest horizon. Pick something shorter.' }
  const partial = { kind: 'bet' as const, sentence: text.trim(), direction, deadline: p.deadline, amount: Math.round(p.amount * 100) / 100, autoExitPct: p.exit }
  const theme = findTheme(ctx.themes, thing)
  if (!theme) {
    const suggestions = closestThemes(ctx.themes, thing)
    return {
      ok: false,
      reason: 'unknown-theme',
      thing,
      suggestions,
      partial,
      message: `I don't have "${thing}". Closest I have is ${suggestions.map((s) => s.label.toLowerCase()).join(', ')} — which?`,
    }
  }
  const spec: BetSpec = { ...partial, themeKey: theme.key }
  return { ok: true, command: spec }
}

export function parseCommand(input: string, ctx: ParseContext): ParseResult {
  const text = input.trim().replace(/\s+/g, ' ').replace(/[.!]+$/, '')
  if (!text) return { ok: false, reason: 'malformed', message: EXAMPLES }
  const lower = text.toLowerCase()

  let m = lower.match(/^(?:ff|fast[- ]?forward|skip)\s+(\d+)\s*(?:d|days?|market days?)?$/)
  if (m) {
    const days = Number(m[1])
    if (days < 1 || days > 400) return { ok: false, reason: 'malformed', message: 'Fast-forward between 1 and 400 market days.' }
    return { ok: true, command: { kind: 'forward', days } }
  }
  if (/^rebalance(\s+(the\s+)?core)?$/.test(lower)) return { ok: true, command: { kind: 'rebalance' } }

  m = lower.match(/^(?:add|deposit|top up|put in)(?:\s+money)?\s+(.+?)(?:\s+(?:from|to)\s+.+)?$/)
  if (m) {
    const amount = parseAmount(m[1])
    if (amount === null || amount <= 0) return { ok: false, reason: 'malformed', message: 'How much? Like "add $500".' }
    return { ok: true, command: { kind: 'deposit', amount } }
  }

  m = text.match(/^(?:cancel|stop paying for|unsubscribe from|unsubscribe)\s+(?:my\s+|the\s+)?(.+)$/i)
  if (m) return { ok: true, command: { kind: 'cancel', query: m[1].trim() } }

  m = text.match(/^(?:close|close out|exit|end)\s+(?:my\s+|the\s+)?(.+?)(?:\s+(?:bet|thesis))?$/i)
  if (m) return { ok: true, command: { kind: 'close', query: m[1].trim() } }

  m = text.match(/^(?:save for|saving for|save up for|plan|plan to buy|want|i want)\s+(.+)$/i)
  if (m) {
    const p = peel(m[1], ctx.today)
    const title = cleanThing(p.rest.filter(Boolean).join(' '))
    if (!title) return { ok: false, reason: 'malformed', message: 'Save for what? Like "save for a road bike, $1400, by april".' }
    if (p.amount === null || p.amount <= 0) return { ok: false, reason: 'malformed', message: `What does ${title} cost? Add a price, like $1400.` }
    const wantBy = p.deadline ?? addMonths(ctx.today, 6)
    if (daysBetween(ctx.today, wantBy) < 1) return { ok: false, reason: 'malformed', message: 'That date has already passed.' }
    const command: Command = { kind: 'plan', title: title.charAt(0).toUpperCase() + title.slice(1), price: p.amount, wantBy }
    if (p.monthly !== null) command.monthly = p.monthly
    return { ok: true, command }
  }

  for (const [re, direction] of DIRECTIONS) {
    const d = text.match(re)
    if (d) {
      const rest = text.slice(d[0].length)
      /* "buy road bike" is a purchase; "buy into copper, 2y, $100" is a bet. */
      if (/^(sell)\s/i.test(d[0]) && !/[,$\d]/.test(rest)) break
      return parseBet(text, direction, rest, ctx)
    }
  }

  m = text.match(/^(.+?)\s+(?:goes|going|will go|to go)\s+(up|down)\b[,\s]*(.*)$/i)
  if (m) return parseBet(text, m[2].toLowerCase() as Direction, `${m[1]}, ${m[3]}`, ctx)

  m = text.match(/^buy\s+(?:the\s+|my\s+|a\s+|an\s+)?(.+)$/i)
  if (m) return { ok: true, command: { kind: 'buy', query: m[1].trim() } }

  return { ok: false, reason: 'malformed', message: `I didn't follow that. ${EXAMPLES}` }
}

/** Rebuilds a bet sentence once a theme has been picked from the suggestions. */
export function withTheme(partial: Omit<BetSpec, 'themeKey'>, theme: Theme): BetSpec {
  return { ...partial, themeKey: theme.key }
}
