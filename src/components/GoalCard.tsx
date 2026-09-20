import { Link } from 'react-router-dom'
import type { GoalProjection } from '../lib/goals'
import type { GoalKind } from '../lib/types'
import { formatDate, formatUsd } from './ui'

export const KIND_WORD: Record<GoalKind, string> = {
  save: 'Saving for',
  build: 'Building',
  give: 'Giving',
}

/** Two-tone bar: what habits released sits on top of everything else funded. */
export function GoalProgress({ p, height = 8 }: { p: GoalProjection; height?: number }) {
  const total = Math.max(1, p.goal.targetUsd)
  const habitsPct = Math.min(100, (p.fromHabitsUsd / total) * 100)
  const restPct = Math.min(100, (p.fundedUsd / total) * 100)
  const projectedPct = p.projectedOnDate !== null ? p.projectedOnDate * 100 : null
  const reached = p.goal.status === 'reached' || p.remainingUsd === 0
  return (
    <div className="progress" style={{ height }} aria-label={`${Math.round(p.progress * 100)}% funded`}>
      {projectedPct !== null && projectedPct > restPct && <div className="progress-ghost" style={{ width: `${projectedPct}%` }} />}
      <div className={`progress-fill${reached ? ' is-reached' : ''}`} style={{ width: `${restPct}%` }} />
      {habitsPct > 0.5 && (
        <div
          className="progress-fill is-habits"
          style={{ left: `${Math.max(0, restPct - habitsPct)}%`, width: `${habitsPct}%`, right: 'auto' }}
          title={`${formatUsd(p.fromHabitsUsd)} of this came from habits`}
        />
      )}
    </div>
  )
}

export function goalStatusLine(p: GoalProjection): string {
  const g = p.goal
  if (g.status === 'reached' || p.remainingUsd === 0) return g.reachedAt ? `Reached ${formatDate(g.reachedAt)}` : 'Reached'
  if (g.status === 'paused') return 'Paused'
  if (p.monthsToDate !== null) {
    if (p.shortfallUsd === 0) return `On track for ${formatDate(g.targetDate!, { month: 'short', year: 'numeric', day: undefined })}`
    return `${formatUsd(p.shortfallUsd, { compact: true })} short for ${formatDate(g.targetDate!, { month: 'short', year: 'numeric', day: undefined })}`
  }
  if (p.monthsToFund === null) return 'No monthly contribution yet'
  if (p.monthsToFund > 24) return `About ${Math.round(p.monthsToFund / 12)} years at this rate`
  return `About ${p.monthsToFund} months at this rate`
}

export default function GoalCard({ p, compact = false }: { p: GoalProjection; compact?: boolean }) {
  const g = p.goal
  const reached = g.status === 'reached' || p.remainingUsd === 0
  return (
    <Link to={`/goals/${g.id}`} className={`goal-card${reached ? ' is-reached' : ''}`}>
      <span className="label" style={{ whiteSpace: 'nowrap' }}>{KIND_WORD[g.kind]}</span>
      <div className="goal-title">{g.title}</div>
      <div className="row row-between" style={{ alignItems: 'baseline', marginBottom: 8 }}>
        <span className="num" style={{ fontSize: 15 }}>
          {formatUsd(p.fundedUsd, { compact: true })}
          <span className="muted"> of {formatUsd(g.targetUsd, { compact: true })}</span>
        </span>
        <span className="num meta">{Math.round(p.progress * 100)}%</span>
      </div>
      <GoalProgress p={p} />
      <div className="row row-between row-wrap" style={{ marginTop: 8, gap: 6 }}>
        <span className="meta" style={{ color: !reached && p.shortfallUsd > 0 ? 'var(--contradict)' : undefined }}>
          {goalStatusLine(p)}
        </span>
        {p.fromHabitsUsd > 0 && !compact && (
          <span className="meta" style={{ color: 'var(--support)' }} title="Released by habits">
            {formatUsd(p.fromHabitsUsd, { compact: true })} from habits
          </span>
        )}
      </div>
    </Link>
  )
}
