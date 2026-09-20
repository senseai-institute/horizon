import { useMemo } from 'react'
import { seedValues } from '../data/seed'
import { computeConfidence, descendants } from '../lib/confidence'
import {
  alignCompany,
  projectGoal,
  viewHabit,
  type AlignmentView,
  type GoalProjection,
  type HabitView,
} from '../lib/goals'
import type { GraphNode, Sleeve, ValueWeight } from '../lib/types'
import { useHorizon } from './useHorizon'

/** The whole map, scored. Memoised on the three arrays it depends on. */
export function useGraph() {
  const nodes = useHorizon((s) => s.nodes)
  const edges = useHorizon((s) => s.edges)
  const evidence = useHorizon((s) => s.evidence)
  return useMemo(() => computeConfidence(nodes, edges, evidence), [nodes, edges, evidence])
}

export interface PositionView {
  companyId: string
  node: GraphNode | undefined
  valueUsd: number
  /** Share of the whole portfolio. */
  pctOfPortfolio: number
  /** Share of this sleeve. */
  pctOfSleeve: number
  confidence: number
  breachesCap: boolean
  breachesSize: boolean
}

export interface SleeveView {
  sleeve: Sleeve
  root: GraphNode | undefined
  valueUsd: number
  currentPct: number
  targetPct: number
  /** currentPct − targetPct. Positive means over-allocated. */
  driftPct: number
  /** Dollars that would move to close the drift. */
  driftUsd: number
  branchConfidence: number
  belowExit: boolean
  positions: PositionView[]
  breaches: string[]
  companyCount: number
}

export interface PortfolioView {
  totalUsd: number
  investedUsd: number
  cashUsd: number
  cashPct: number
  sleeves: SleeveView[]
  unallocatedPct: number
}

/**
 * All allocation maths is derived, never stored, so changing a target
 * recalculates drift on the same render.
 */
export function usePortfolio(): PortfolioView {
  const sleeves = useHorizon((s) => s.sleeves)
  const cashUsd = useHorizon((s) => s.cashUsd)
  const willNotHold = useHorizon((s) => s.willNotHold)
  const { confidence, index } = useGraph()

  return useMemo(() => {
    const investedUsd = sleeves.reduce(
      (sum, s) => sum + s.positions.reduce((a, p) => a + p.valueUsd, 0),
      0,
    )
    const totalUsd = investedUsd + cashUsd

    const views: SleeveView[] = sleeves.map((sleeve) => {
      const valueUsd = sleeve.positions.reduce((a, p) => a + p.valueUsd, 0)
      const currentPct = totalUsd ? (valueUsd / totalUsd) * 100 : 0
      const driftPct = currentPct - sleeve.targetPct
      const branchConfidence = confidence[sleeve.rootId] ?? 50
      const branchIds = new Set(descendants(index, sleeve.rootId))
      const positions: PositionView[] = sleeve.positions
        .map((p) => {
          const node = index.nodeById.get(p.companyId)
          const pctOfPortfolio = totalUsd ? (p.valueUsd / totalUsd) * 100 : 0
          return {
            companyId: p.companyId,
            node,
            valueUsd: p.valueUsd,
            pctOfPortfolio,
            pctOfSleeve: valueUsd ? (p.valueUsd / valueUsd) * 100 : 0,
            confidence: confidence[p.companyId] ?? 50,
            breachesCap: pctOfPortfolio > sleeve.rules.maxSinglePositionPct,
            breachesSize: (node?.marketCapB ?? 0) * 1000 < sleeve.rules.minMarketCapM,
          }
        })
        .sort((a, b) => b.valueUsd - a.valueUsd)

      const breaches: string[] = []
      for (const p of positions) {
        if (p.breachesCap)
          breaches.push(
            `${p.node?.label ?? p.companyId} is ${p.pctOfPortfolio.toFixed(
              1,
            )}% of the book, over the ${sleeve.rules.maxSinglePositionPct}% cap.`,
          )
        if (p.breachesSize)
          breaches.push(
            `${p.node?.label ?? p.companyId} is below the $${sleeve.rules.minMarketCapM}m minimum size.`,
          )
        if (!branchIds.has(p.companyId))
          breaches.push(`${p.node?.label ?? p.companyId} no longer sits under this branch of the map.`)
        if (willNotHold.includes(p.companyId))
          breaches.push(`${p.node?.label ?? p.companyId} is marked "will not hold" on the values screen.`)
      }

      return {
        sleeve,
        root: index.nodeById.get(sleeve.rootId),
        valueUsd,
        currentPct,
        targetPct: sleeve.targetPct,
        driftPct,
        driftUsd: (driftPct / 100) * totalUsd,
        branchConfidence,
        belowExit: branchConfidence < sleeve.exitBelow,
        positions,
        breaches,
        companyCount: [...branchIds].filter((id) => index.nodeById.get(id)?.kind === 'company').length,
      }
    })

    const allocatedTarget = sleeves.reduce((a, s) => a + s.targetPct, 0)
    return {
      totalUsd,
      investedUsd,
      cashUsd,
      cashPct: totalUsd ? (cashUsd / totalUsd) * 100 : 0,
      sleeves: views,
      unallocatedPct: Math.max(0, 100 - allocatedTarget),
    }
  }, [sleeves, cashUsd, confidence, index, willNotHold])
}

/** Evidence attached to a node, newest first. */
export function useEvidenceFor(nodeId: string | undefined) {
  const evidence = useHorizon((s) => s.evidence)
  return useMemo(
    () =>
      nodeId
        ? evidence
            .filter((e) => e.targetId === nodeId)
            .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
        : [],
    [evidence, nodeId],
  )
}

export function usePendingCount() {
  return useHorizon((s) => s.reviewItems.filter((r) => r.status === 'pending').length)
}

/* ------------------------------------------------------------------ */
/* Goals and habits                                                    */
/* ------------------------------------------------------------------ */


export function useHabitViews(): HabitView[] {
  const habits = useHorizon((s) => s.habits)
  return useMemo(() => habits.map((h) => viewHabit(h)), [habits])
}

export interface GoalsView {
  projections: GoalProjection[]
  /** Cash not earmarked for anything. */
  freeCashUsd: number
  totalReleasedUsd: number
}

export function useGoalViews(): GoalsView {
  const goals = useHorizon((s) => s.goals)
  const cashUsd = useHorizon((s) => s.cashUsd)
  const portfolio = usePortfolio()
  const habitViews = useHabitViews()
  return useMemo(() => {
    const sleeveValue = (id: string) => portfolio.sleeves.find((v) => v.sleeve.id === id)?.valueUsd ?? 0
    const releasedTo = (goalId: string) =>
      habitViews.filter((h) => h.habit.redirectToGoalId === goalId).reduce((a, h) => a + h.releasedUsd, 0)
    const projections = goals.map((g) => {
      const released = releasedTo(g.id)
      // Habit releases are earmarked cash too; they sit on top of the manual earmark.
      return projectGoal({ ...g, earmarkedUsd: g.earmarkedUsd + released }, sleeveValue, released)
    })
    const earmarked = projections.reduce((a, p) => a + p.goal.earmarkedUsd, 0)
    return {
      projections,
      freeCashUsd: Math.max(0, cashUsd - earmarked),
      totalReleasedUsd: habitViews.reduce((a, h) => a + h.releasedUsd, 0),
    }
  }, [goals, cashUsd, portfolio, habitViews])
}

/* ------------------------------------------------------------------ */
/* Values                                                              */
/* ------------------------------------------------------------------ */

export interface ValuesView {
  weights: Record<string, ValueWeight>
  byCompany: Record<string, AlignmentView>
  /** Value-weighted alignment of the money actually deployed, −100…100. */
  portfolioScore: number | null
  /** Companies on the map that work against a core value. */
  conflicts: GraphNode[]
  coreCount: number
}

export function useValuesView(): ValuesView {
  const nodes = useHorizon((s) => s.nodes)
  const weights = useHorizon((s) => s.valueWeights)
  const portfolio = usePortfolio()
  return useMemo(() => {
    const byCompany: Record<string, AlignmentView> = {}
    const conflicts: GraphNode[] = []
    for (const n of nodes) {
      if (n.kind !== 'company' || n.archived) continue
      const a = alignCompany(n, weights, seedValues)
      byCompany[n.id] = a
      if (a.hardConflict) conflicts.push(n)
    }
    let num = 0
    let den = 0
    for (const sv of portfolio.sleeves) {
      for (const p of sv.positions) {
        const a = byCompany[p.companyId]
        if (!a || a.score === null) continue
        num += a.score * p.valueUsd
        den += p.valueUsd
      }
    }
    return {
      weights,
      byCompany,
      portfolioScore: den > 0 ? Math.round(num / den) : null,
      conflicts,
      coreCount: Object.values(weights).filter((w) => w === 2).length,
    }
  }, [nodes, weights, portfolio])
}
