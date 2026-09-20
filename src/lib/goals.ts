import type { Goal, GraphNode, Habit, HabitMonth, Horizon, ValueDef, ValueWeight } from './types'

/* ------------------------------------------------------------------ */
/* Horizons                                                            */
/* ------------------------------------------------------------------ */

export const HORIZONS: Horizon[] = ['now', 'soon', 'later', 'someday']

export const HORIZON_LABEL: Record<Horizon, string> = {
  now: 'Now',
  soon: 'Soon',
  later: 'Later',
  someday: 'Someday',
}

export const HORIZON_HINT: Record<Horizon, string> = {
  now: 'This month, this quarter.',
  soon: 'Within the year.',
  later: 'One to five years out.',
  someday: 'Further than that.',
}

/* ------------------------------------------------------------------ */
/* Months                                                              */
/* ------------------------------------------------------------------ */

export function monthKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(key: string, style: 'short' | 'long' = 'short'): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: style, year: style === 'long' ? 'numeric' : undefined })
}

export function monthsBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso)
  const b = new Date(toIso)
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
}

/* ------------------------------------------------------------------ */
/* Goal projections                                                    */
/* ------------------------------------------------------------------ */

export interface GoalProjection {
  goal: Goal
  /** Earmarked cash plus the value of any linked sleeves. */
  fundedUsd: number
  /** Of which, released by habits. */
  fromHabitsUsd: number
  remainingUsd: number
  /** 0–1. */
  progress: number
  /** Months until the goal is funded at the current monthly rate, or null if it never is. */
  monthsToFund: number | null
  /** Months until the target date, or null if there is none. */
  monthsToDate: number | null
  /** Where the goal will stand on its date at the current rate, 0–1. Null without a date. */
  projectedOnDate: number | null
  /** Shortfall on the date at the current rate. 0 when on track. */
  shortfallUsd: number
  /** Monthly contribution needed to land on the date. */
  neededMonthlyUsd: number | null
  onTrack: boolean
}

export function projectGoal(
  goal: Goal,
  sleeveValue: (sleeveId: string) => number,
  habitReleasedToGoal: number,
  now: Date = new Date(),
): GoalProjection {
  const linked = goal.linkedSleeveIds.reduce((a, id) => a + sleeveValue(id), 0)
  const fundedUsd = goal.earmarkedUsd + linked
  const remainingUsd = Math.max(0, goal.targetUsd - fundedUsd)
  const progress = goal.targetUsd > 0 ? Math.min(1, fundedUsd / goal.targetUsd) : 1
  const monthsToFund =
    remainingUsd === 0 ? 0 : goal.monthlyUsd > 0 ? Math.ceil(remainingUsd / goal.monthlyUsd) : null
  const monthsToDate = goal.targetDate ? Math.max(0, monthsBetween(now.toISOString(), goal.targetDate)) : null
  const projectedUsd = monthsToDate !== null ? fundedUsd + goal.monthlyUsd * monthsToDate : null
  const projectedOnDate = projectedUsd !== null && goal.targetUsd > 0 ? Math.min(1, projectedUsd / goal.targetUsd) : null
  const shortfallUsd = projectedUsd !== null ? Math.max(0, goal.targetUsd - projectedUsd) : 0
  const neededMonthlyUsd =
    monthsToDate !== null && monthsToDate > 0 ? Math.max(0, Math.ceil(remainingUsd / monthsToDate)) : null
  const onTrack = goal.status === 'reached' || remainingUsd === 0 || (monthsToDate === null ? monthsToFund !== null : shortfallUsd === 0)
  return {
    goal,
    fundedUsd,
    fromHabitsUsd: habitReleasedToGoal,
    remainingUsd,
    progress,
    monthsToFund,
    monthsToDate,
    projectedOnDate,
    shortfallUsd,
    neededMonthlyUsd,
    onTrack,
  }
}

/* ------------------------------------------------------------------ */
/* Habits                                                              */
/* ------------------------------------------------------------------ */

export interface HabitMonthView extends HabitMonth {
  /** Money that did not get spent, relative to the old baseline. */
  releasedUsd: number
  underTarget: boolean
  isCurrent: boolean
}

export interface HabitView {
  habit: Habit
  months: HabitMonthView[]
  current: HabitMonthView | null
  releasedUsd: number
  /** Consecutive completed months at or under target, most recent first. */
  streak: number
  /** Average of the last three completed months. */
  recentAverageUsd: number | null
  /** 0–1, how far from baseline to target the recent average has travelled. */
  progress: number
}

/**
 * The reward is not points. It is the money you did not spend moving, visibly,
 * toward something you said you wanted. Release is measured against the old
 * baseline so that every improvement counts, not only the months that hit the
 * target.
 */
export function viewHabit(habit: Habit, now: Date = new Date()): HabitView {
  const currentKey = monthKey(now)
  const sorted = [...habit.months].sort((a, b) => a.month.localeCompare(b.month))
  const months: HabitMonthView[] = sorted.map((m) => ({
    ...m,
    releasedUsd: Math.max(0, habit.baselineMonthlyUsd - m.spentUsd),
    underTarget: m.spentUsd <= habit.targetMonthlyUsd,
    isCurrent: m.month === currentKey,
  }))
  const completed = months.filter((m) => !m.isCurrent)
  let streak = 0
  for (let i = completed.length - 1; i >= 0; i--) {
    if (completed[i].underTarget) streak++
    else break
  }
  const recent = completed.slice(-3)
  const recentAverageUsd = recent.length ? recent.reduce((a, m) => a + m.spentUsd, 0) / recent.length : null
  const span = habit.baselineMonthlyUsd - habit.targetMonthlyUsd
  const progress =
    recentAverageUsd === null || span <= 0
      ? 0
      : Math.max(0, Math.min(1, (habit.baselineMonthlyUsd - recentAverageUsd) / span))
  return {
    habit,
    months,
    current: months.find((m) => m.isCurrent) ?? null,
    releasedUsd: completed.reduce((a, m) => a + m.releasedUsd, 0),
    streak,
    recentAverageUsd,
    progress,
  }
}

/* ------------------------------------------------------------------ */
/* Values alignment                                                    */
/* ------------------------------------------------------------------ */

export interface AlignmentView {
  /** −100 … +100, or null when nothing the reader cares about is scored. */
  score: number | null
  /** Values the company advances, weighted by how much the reader cares. */
  advances: { value: ValueDef; score: number; reason: string; weight: ValueWeight }[]
  /** Values the company works against. */
  conflicts: { value: ValueDef; score: number; reason: string; weight: ValueWeight }[]
  /** Clearly works against a core value: scored −2 on something weighted 2. */
  hardConflict: boolean
  /** Mildly at odds with a core value: scored −1 on something weighted 2. */
  softConflict: boolean
}

export function alignCompany(
  node: GraphNode,
  weights: Record<string, ValueWeight>,
  values: ValueDef[],
): AlignmentView {
  const byId = new Map(values.map((v) => [v.id, v]))
  const stances = node.values ?? []
  let num = 0
  let den = 0
  const advances: AlignmentView['advances'] = []
  const conflicts: AlignmentView['conflicts'] = []
  let hardConflict = false
  let softConflict = false
  for (const s of stances) {
    const w = weights[s.valueId] ?? 0
    const value = byId.get(s.valueId)
    if (!value || w === 0) continue
    num += s.score * w
    den += 2 * w
    const row = { value, score: s.score, reason: s.reason, weight: w }
    if (s.score > 0) advances.push(row)
    if (s.score < 0) conflicts.push(row)
    if (w === 2 && s.score <= -2) hardConflict = true
    else if (w === 2 && s.score === -1) softConflict = true
  }
  return {
    score: den > 0 ? Math.round((num / den) * 100) : null,
    advances: advances.sort((a, b) => b.score * b.weight - a.score * a.weight),
    conflicts: conflicts.sort((a, b) => a.score * a.weight - b.score * b.weight),
    hardConflict,
    softConflict,
  }
}

export function alignmentWord(score: number | null): string {
  if (score === null) return 'Not scored'
  if (score >= 50) return 'Strongly aligned'
  if (score >= 15) return 'Aligned'
  if (score > -15) return 'Neutral'
  if (score > -50) return 'At odds'
  return 'Conflicts'
}

/** Sums earmarks so the goals screen can say how much cash is still unclaimed. */
export function totalEarmarked(goals: Goal[]): number {
  return goals.reduce((a, g) => a + g.earmarkedUsd, 0)
}
