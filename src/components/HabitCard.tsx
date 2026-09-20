import { useState } from 'react'
import { Link } from 'react-router-dom'
import { monthKey, monthLabel, type HabitView } from '../lib/goals'
import { useHorizon } from '../store/useHorizon'
import { useToast } from './Toast'
import { ConfirmButton, formatUsd } from './ui'

/**
 * One habit: the last few months as quiet bars, this month's spend as a single
 * number you can update, and where the difference has gone. No streak fire,
 * no points. The reward is the goal on the right getting closer.
 */
export default function HabitCard({ view, goalTitle, compact = false }: { view: HabitView; goalTitle?: string; compact?: boolean }) {
  const { habit, months, current, releasedUsd, streak, recentAverageUsd } = view
  const logHabitMonth = useHorizon((s) => s.logHabitMonth)
  const removeHabit = useHorizon((s) => s.removeHabit)
  const toast = useToast()
  const thisMonth = monthKey()
  const [draft, setDraft] = useState<string | null>(null)
  const shown = months.slice(-7)
  const max = Math.max(habit.baselineMonthlyUsd, ...shown.map((m) => m.spentUsd), 1)

  const commit = () => {
    if (draft === null) return
    const n = Number(draft)
    if (!Number.isFinite(n) || n < 0) {
      setDraft(null)
      return
    }
    if (n !== (current?.spentUsd ?? -1)) {
      logHabitMonth(habit.id, thisMonth, n)
      const release = Math.max(0, habit.baselineMonthlyUsd - n)
      toast({
        text:
          release > 0
            ? `${monthLabel(thisMonth, 'long')} so far: ${formatUsd(n)}. On course to release ${formatUsd(release)} to ${goalTitle ?? 'your goal'}.`
            : `${monthLabel(thisMonth, 'long')} so far: ${formatUsd(n)}. Over the old baseline — nothing lost, nothing released.`,
      })
    }
    setDraft(null)
  }

  return (
    <article className="card stack stack-sm" style={{ padding: '18px 20px' }}>
      <div className="row row-between" style={{ gap: 12, alignItems: 'flex-start' }}>
        <div className="stack stack-xs" style={{ minWidth: 0 }}>
          <span className="label">{habit.category}</span>
          <h4 style={{ fontFamily: 'var(--serif)', fontSize: 18 }}>{habit.title}</h4>
          {!compact && habit.note && (
            <p className="meta" style={{ margin: 0 }}>
              {habit.note}
            </p>
          )}
        </div>
        <div className="stack stack-xs" style={{ textAlign: 'right', flex: 'none' }}>
          <span className="label">Released so far</span>
          <span className="num" style={{ fontSize: 20, color: 'var(--support)' }}>
            {formatUsd(releasedUsd)}
          </span>
          {goalTitle && (
            <span className="meta">
              → <Link to={`/goals/${habit.redirectToGoalId}`} style={{ color: 'var(--ink-2)' }}>{goalTitle}</Link>
            </span>
          )}
        </div>
      </div>

      <div className="month-bars" role="img" aria-label={`Monthly spend on ${habit.category}, last ${shown.length} months`}>
        {shown.map((m) => (
          <div key={m.month} className="month-bar" title={`${monthLabel(m.month, 'long')}: ${formatUsd(m.spentUsd)}`}>
            <div
              className={`month-bar-fill${m.isCurrent ? ' is-current' : m.underTarget ? ' is-under' : ''}`}
              style={{ height: `${Math.max(4, (m.spentUsd / max) * 100)}%` }}
            />
            <span className="month-bar-label">{monthLabel(m.month).slice(0, 3)}</span>
          </div>
        ))}
      </div>

      <div className="row row-between row-wrap" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 8 }}>
          <span className="label">{monthLabel(thisMonth, 'long')} so far</span>
          <span className="num" style={{ fontSize: 15 }}>$</span>
          <input
            className="input num"
            style={{ width: 92, padding: '4px 8px' }}
            inputMode="decimal"
            value={draft ?? String(current?.spentUsd ?? '')}
            placeholder="0"
            onFocus={() => setDraft(String(current?.spentUsd ?? ''))}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
            }}
            aria-label={`Spend on ${habit.category} this month`}
          />
          <span className="meta">
            target {formatUsd(habit.targetMonthlyUsd)} · was {formatUsd(habit.baselineMonthlyUsd)}
          </span>
        </div>
        {!compact && (
          <div className="row" style={{ gap: 10 }}>
            {streak > 0 && (
              <span className="meta">
                {streak} month{streak === 1 ? '' : 's'} running under target
              </span>
            )}
            {recentAverageUsd !== null && streak === 0 && (
              <span className="meta">recent average {formatUsd(recentAverageUsd)}</span>
            )}
            <ConfirmButton className="btn btn-sm btn-ghost" confirmLabel="Stop tracking" onConfirm={() => removeHabit(habit.id)}>
              Stop
            </ConfirmButton>
          </div>
        )}
      </div>
    </article>
  )
}
