import type { Day } from './types'

/**
 * The simulated calendar. Days are YYYY-MM-DD strings and arithmetic is done
 * in UTC so a day never shifts with the browser's time zone. Market days are
 * weekdays; holidays are ignored in the mock.
 */

export function toDay(d: Date): Day {
  return d.toISOString().slice(0, 10)
}

export function parseDay(day: Day): Date {
  return new Date(`${day}T00:00:00Z`)
}

/** Today on the wall clock, in local time, as a Day. */
export function todayLocal(now = new Date()): Day {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * The day sentences are read against: the wall clock, unless the simulator
 * has been fast-forwarded past it. "18mo" typed on a Sunday means eighteen
 * months from that Sunday, not from Friday's close.
 */
export function sentenceToday(asOf: Day, now = new Date()): Day {
  const wall = todayLocal(now)
  return wall > asOf ? wall : asOf
}

export function addDays(day: Day, n: number): Day {
  const d = parseDay(day)
  d.setUTCDate(d.getUTCDate() + n)
  return toDay(d)
}

/** Same day-of-month n months on, clamped to the month's end. */
export function addMonths(day: Day, n: number): Day {
  const d = parseDay(day)
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1))
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(d.getUTCDate(), last))
  return toDay(target)
}

export function isMarketDay(day: Day): boolean {
  const wd = parseDay(day).getUTCDay()
  return wd !== 0 && wd !== 6
}

export function nextMarketDay(day: Day): Day {
  let d = addDays(day, 1)
  while (!isMarketDay(d)) d = addDays(d, 1)
  return d
}

/** The market day on or before this one. */
export function marketDayOnOrBefore(day: Day): Day {
  let d = day
  while (!isMarketDay(d)) d = addDays(d, -1)
  return d
}

/** n market days ending at `end`, oldest first. */
export function marketDaysBack(end: Day, n: number): Day[] {
  const out: Day[] = []
  let d = marketDayOnOrBefore(end)
  while (out.length < n) {
    out.push(d)
    d = addDays(d, -1)
    while (!isMarketDay(d)) d = addDays(d, -1)
  }
  return out.reverse()
}

export function daysBetween(a: Day, b: Day): number {
  return Math.round((parseDay(b).getTime() - parseDay(a).getTime()) / 86_400_000)
}

export function monthKey(day: Day): string {
  return day.slice(0, 7)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Apr 18 2028" — the form the proposal card uses. */
export function longDay(day: Day): string {
  const d = parseDay(day)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} ${d.getUTCFullYear()}`
}

export function shortDay(day: Day): string {
  const d = parseDay(day)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`
}

export function monthName(i: number): string {
  return MONTHS[i]
}
