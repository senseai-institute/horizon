import { useState } from 'react'
import { Link } from 'react-router-dom'
import GoalCard from '../components/GoalCard'
import HabitCard from '../components/HabitCard'
import { useToast } from '../components/Toast'
import { IconPlus } from '../components/icons'
import { EmptyState, Field, formatUsd } from '../components/ui'
import { HORIZONS, HORIZON_HINT, HORIZON_LABEL } from '../lib/goals'
import type { GoalKind, Horizon } from '../lib/types'
import { useGoalViews, useHabitViews } from '../store/derived'
import { useHorizon } from '../store/useHorizon'

export default function GoalsScreen() {
  const goals = useGoalViews()
  const habits = useHabitViews()
  const [adding, setAdding] = useState<'goal' | 'habit' | null>(null)
  const goalById = new Map(goals.projections.map((p) => [p.goal.id, p]))

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Goals</h1>
          <p className="lede">
            What the money is for, by when. Habits underneath: things you would like to spend less on, with the
            difference sent to a goal instead of disappearing.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn btn-primary" onClick={() => setAdding(adding === 'goal' ? null : 'goal')}>
            <IconPlus /> New goal
          </button>
        </div>
      </div>

      {adding === 'goal' && <NewGoalForm onDone={() => setAdding(null)} />}

      <div className="row row-wrap" style={{ gap: 28, marginBottom: 26 }}>
        <span className="meta">
          <span className="num" style={{ color: 'var(--ink)' }}>{formatUsd(goals.freeCashUsd)}</span> of cash not yet pointed at
          anything
        </span>
        <span className="meta">
          <span className="num" style={{ color: 'var(--support)' }}>{formatUsd(goals.totalReleasedUsd)}</span> released by habits
        </span>
      </div>

      <div className="horizon-grid" style={{ marginBottom: 44 }}>
        {HORIZONS.map((h) => {
          const rows = goals.projections
            .filter((p) => p.goal.horizon === h)
            .sort((a, b) => (a.goal.status === 'reached' ? 1 : 0) - (b.goal.status === 'reached' ? 1 : 0))
          return (
            <div key={h} className="stack stack-sm">
              <div>
                <div className="label">{HORIZON_LABEL[h]}</div>
                <div className="meta">{HORIZON_HINT[h]}</div>
              </div>
              {rows.length === 0 ? (
                <div className="empty" style={{ padding: '22px 16px' }}>
                  <span className="meta">Nothing here yet.</span>
                </div>
              ) : (
                rows.map((p) => <GoalCard key={p.goal.id} p={p} />)
              )}
            </div>
          )
        })}
      </div>

      <section id="habits" className="stack stack-md">
        <div className="row row-between row-wrap" style={{ gap: 12 }}>
          <div>
            <h2>Spend less on this, and it goes there</h2>
            <p className="meta" style={{ margin: '6px 0 0', maxWidth: '64ch' }}>
              Released money is measured against what a month used to cost, so every improvement counts, not just
              the months that hit the target. It is earmarked for the goal the moment the month closes.
            </p>
          </div>
          <button type="button" className="btn" onClick={() => setAdding(adding === 'habit' ? null : 'habit')}>
            <IconPlus /> Track something
          </button>
        </div>
        {adding === 'habit' && <NewHabitForm onDone={() => setAdding(null)} />}
        {habits.length === 0 ? (
          <EmptyState title="Nothing tracked yet">
            Name a category, what a month used to cost, what you are aiming for, and which goal the difference should
            feed.
          </EmptyState>
        ) : (
          <div className="grid-2">
            {habits.map((h) => (
              <HabitCard key={h.habit.id} view={h} goalTitle={goalById.get(h.habit.redirectToGoalId)?.goal.title} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

const KIND_OPTIONS: { kind: GoalKind; label: string; hint: string }[] = [
  { kind: 'save', label: 'Save for something', hint: 'A deposit, a cushion, time off.' },
  { kind: 'build', label: 'Build something', hint: 'A product, a project, a business — runway to make it.' },
  { kind: 'give', label: 'Give something', hint: 'A fund, a scholarship, a standing donation.' },
]

export function NewGoalForm({ onDone, defaultHorizon = 'soon' }: { onDone: () => void; defaultHorizon?: Horizon }) {
  const addGoal = useHorizon((s) => s.addGoal)
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [why, setWhy] = useState('')
  const [kind, setKind] = useState<GoalKind>('save')
  const [horizon, setHorizon] = useState<Horizon>(defaultHorizon)
  const [target, setTarget] = useState('')
  const [monthly, setMonthly] = useState('')
  const [date, setDate] = useState('')
  const [earmark, setEarmark] = useState('')
  const can = title.trim() && Number(target) > 0

  return (
    <div className="card stack stack-md" style={{ background: 'var(--paper-sunken)', marginBottom: 26 }}>
      <h3>A new goal</h3>
      <Field label="What is it?">
        <input className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A house deposit" />
      </Field>
      <Field label="Why does it matter? One honest sentence.">
        <input className="input" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Rent ends in April." />
      </Field>
      <div className="row row-wrap" style={{ gap: 8 }}>
        {KIND_OPTIONS.map((k) => (
          <button
            key={k.kind}
            type="button"
            className={`btn btn-sm${kind === k.kind ? ' btn-primary' : ''}`}
            onClick={() => setKind(k.kind)}
            title={k.hint}
          >
            {k.label}
          </button>
        ))}
      </div>
      <div className="field">
        <span className="label">When</span>
        <div className="row row-wrap" style={{ gap: 6 }}>
          {HORIZONS.map((h) => (
            <button key={h} type="button" className={`btn btn-sm${horizon === h ? ' btn-primary' : ''}`} onClick={() => setHorizon(h)}>
              {HORIZON_LABEL[h]} <span style={{ opacity: 0.7 }}>· {HORIZON_HINT[h].toLowerCase()}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid-3">
        <Field label="Target ($)">
          <input className="input num" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="120000" />
        </Field>
        <Field label="Each month ($)">
          <input className="input num" inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} placeholder="3500" />
        </Field>
        <Field label="By (optional)">
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Already set aside ($, optional)">
        <input className="input num" inputMode="decimal" value={earmark} onChange={(e) => setEarmark(e.target.value)} placeholder="0" style={{ maxWidth: 200 }} />
      </Field>
      <div className="row" style={{ gap: 8 }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!can}
          onClick={() => {
            addGoal({
              title: title.trim(),
              why: why.trim(),
              kind,
              horizon,
              targetUsd: Number(target),
              monthlyUsd: Number(monthly) || 0,
              targetDate: date || undefined,
              earmarkedUsd: Number(earmark) || 0,
            })
            toast({ text: `${title.trim()} is on the board.` })
            onDone()
          }}
        >
          Add the goal
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export function NewHabitForm({ onDone, defaultGoalId }: { onDone: () => void; defaultGoalId?: string }) {
  const goals = useHorizon((s) => s.goals)
  const addHabit = useHorizon((s) => s.addHabit)
  const toast = useToast()
  const active = goals.filter((g) => g.status === 'active')
  const [category, setCategory] = useState('')
  const [title, setTitle] = useState('')
  const [baseline, setBaseline] = useState('')
  const [target, setTarget] = useState('')
  const [goalId, setGoalId] = useState(defaultGoalId ?? active[0]?.id ?? '')
  const can = category.trim() && Number(baseline) > 0 && Number(target) >= 0 && goalId

  return (
    <div className="card stack stack-md" style={{ background: 'var(--paper-sunken)' }}>
      <h3>Track something</h3>
      <div className="grid-2">
        <Field label="What do you spend it on?">
          <input className="input" autoFocus value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Cannabis, takeaway, subscriptions…" />
        </Field>
        <Field label="What would you like to call this? (optional)">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Smoke less" />
        </Field>
      </div>
      <div className="grid-3">
        <Field label="A typical month used to cost ($)">
          <input className="input num" inputMode="decimal" value={baseline} onChange={(e) => setBaseline(e.target.value)} placeholder="340" />
        </Field>
        <Field label="Aiming for ($ a month)">
          <input className="input num" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="150" />
        </Field>
        <Field label="The difference goes to">
          <select className="select" value={goalId} onChange={(e) => setGoalId(e.target.value)}>
            {active.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {active.length === 0 && (
        <p className="meta" style={{ margin: 0 }}>
          You need an active goal first — <Link to="/goals">add one</Link>.
        </p>
      )}
      <div className="row" style={{ gap: 8 }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!can}
          onClick={() => {
            addHabit({
              category: category.trim(),
              title: title.trim() || `Less on ${category.trim().toLowerCase()}`,
              baselineMonthlyUsd: Number(baseline),
              targetMonthlyUsd: Number(target),
              redirectToGoalId: goalId,
            })
            toast({ text: 'Tracking. Log this month’s spend whenever you like — the month closes on its own.' })
            onDone()
          }}
        >
          Start tracking
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  )
}
