import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { GoalProgress, KIND_WORD, goalStatusLine } from '../components/GoalCard'
import HabitCard from '../components/HabitCard'
import { useToast } from '../components/Toast'
import { ConfirmButton, EmptyState, Field, PercentSlider, Stat, formatDate, formatUsd } from '../components/ui'
import { HORIZONS, HORIZON_LABEL } from '../lib/goals'
import type { Horizon } from '../lib/types'
import { useGoalViews, useHabitViews, usePortfolio } from '../store/derived'
import { useHorizon } from '../store/useHorizon'
import { NewHabitForm } from './GoalsScreen'

export default function GoalDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const goals = useGoalViews()
  const habits = useHabitViews().filter((h) => h.habit.redirectToGoalId === id)
  const portfolio = usePortfolio()
  const updateGoal = useHorizon((s) => s.updateGoal)
  const earmarkToGoal = useHorizon((s) => s.earmarkToGoal)
  const setGoalStatus = useHorizon((s) => s.setGoalStatus)
  const reviewItems = useHorizon((s) => s.reviewItems)
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [addingHabit, setAddingHabit] = useState(false)
  const [moveUsd, setMoveUsd] = useState('')

  const p = goals.projections.find((x) => x.goal.id === id)
  if (!p) {
    return (
      <div className="page page-narrow">
        <EmptyState title="That goal is not here">
          <Link to="/goals">Back to goals</Link>.
        </EmptyState>
      </div>
    )
  }
  const g = p.goal
  const reached = g.status === 'reached' || p.remainingUsd === 0
  const pendingForGoal = reviewItems.filter((r) => r.status === 'pending' && r.goalId === g.id)
  const linked = portfolio.sleeves.filter((s) => g.linkedSleeveIds.includes(s.sleeve.id))
  const manualEarmark = g.earmarkedUsd - p.fromHabitsUsd

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 22 }}>
        <Link to="/goals" className="link-button" style={{ fontSize: 13 }}>
          ← All goals
        </Link>
      </div>

      <header className="stack stack-sm" style={{ marginBottom: 30 }}>
        <div className="row row-wrap" style={{ gap: 8 }}>
          <span className="chip chip-outline">{KIND_WORD[g.kind]}</span>
          <span className="chip chip-outline">{HORIZON_LABEL[g.horizon]}</span>
          {g.status !== 'active' && <span className="chip">{g.status === 'reached' ? 'Reached' : 'Paused'}</span>}
          <span className="meta" style={{ marginLeft: 'auto' }}>
            Written {formatDate(g.createdAt)}
          </span>
        </div>
        <h1 style={{ maxWidth: '22ch' }}>{g.title}</h1>
        <p className="prose" style={{ maxWidth: '60ch' }}>
          {g.why}
        </p>
      </header>

      <section className="card stack stack-md" style={{ marginBottom: 26 }}>
        <div className="row row-wrap" style={{ gap: 36, alignItems: 'flex-start' }}>
          <Stat label="Funded" value={formatUsd(p.fundedUsd)} sub={`of ${formatUsd(g.targetUsd)}`} />
          <Stat label="Still to go" value={formatUsd(p.remainingUsd)} />
          <Stat label="Each month" value={formatUsd(g.monthlyUsd)} sub={p.neededMonthlyUsd && p.neededMonthlyUsd > g.monthlyUsd ? `${formatUsd(p.neededMonthlyUsd)} needed for the date` : undefined} />
          {p.fromHabitsUsd > 0 && <Stat label="From habits" value={formatUsd(p.fromHabitsUsd)} color="var(--support)" />}
        </div>
        <GoalProgress p={p} height={12} />
        <div className="row row-between row-wrap" style={{ gap: 10 }}>
          <span className="meta" style={{ color: !reached && p.shortfallUsd > 0 ? 'var(--contradict)' : undefined }}>
            {goalStatusLine(p)}
            {g.targetDate && !reached && p.monthsToDate !== null && ` · ${p.monthsToDate} month${p.monthsToDate === 1 ? '' : 's'} left`}
          </span>
          {p.projectedOnDate !== null && !reached && (
            <span className="meta">Dotted line: where the current rate lands it on the date.</span>
          )}
        </div>
        {pendingForGoal.length > 0 && (
          <div className="card-quiet" style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent-line)', padding: '12px 16px' }}>
            <p className="prose-sm" style={{ margin: 0 }}>
              {pendingForGoal[0].title}. <Link to="/money/review">See the proposal.</Link>
            </p>
          </div>
        )}
      </section>

      <div className="grid-2" style={{ marginBottom: 30 }}>
        <section className="card stack stack-sm">
          <h4>Set money aside</h4>
          <p className="meta" style={{ margin: 0 }}>
            {formatUsd(goals.freeCashUsd)} of cash is not yet pointed at anything. Earmarking does not move it anywhere —
            it just says what it is for.
          </p>
          <div className="row" style={{ gap: 8 }}>
            <input
              className="input num"
              inputMode="decimal"
              style={{ maxWidth: 140 }}
              placeholder="0"
              value={moveUsd}
              onChange={(e) => setMoveUsd(e.target.value)}
            />
            <button
              type="button"
              className="btn"
              disabled={!(Number(moveUsd) > 0) || Number(moveUsd) > goals.freeCashUsd}
              onClick={() => {
                earmarkToGoal(g.id, Number(moveUsd), 'Set aside by hand from unallocated cash.')
                toast({ text: `${formatUsd(Number(moveUsd))} set aside for ${g.title}.` })
                setMoveUsd('')
              }}
            >
              Set aside
            </button>
            {manualEarmark > 0 && (
              <button
                type="button"
                className="btn btn-ghost"
                disabled={!(Number(moveUsd) > 0) || Number(moveUsd) > manualEarmark}
                onClick={() => {
                  earmarkToGoal(g.id, -Number(moveUsd), 'Released back to unallocated cash.')
                  setMoveUsd('')
                }}
              >
                Release
              </button>
            )}
          </div>
        </section>

        <section className="card stack stack-sm">
          <h4>Funded by beliefs</h4>
          {linked.length === 0 ? (
            <p className="meta" style={{ margin: 0 }}>
              No sleeves are pointed at this goal. Long-horizon goals are usually funded by the{' '}
              <Link to="/money">belief-driven sleeves</Link>; short ones by cash.
            </p>
          ) : (
            <ul className="stack stack-xs" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {linked.map((s) => (
                <li key={s.sleeve.id} className="row row-between" style={{ fontSize: 14 }}>
                  <Link to="/money" style={{ color: 'var(--ink)', textDecoration: 'none' }}>
                    {s.sleeve.name}
                  </Link>
                  <span className="num meta">{formatUsd(s.valueUsd)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="field" style={{ paddingTop: 6 }}>
            <span className="label">Point a sleeve here</span>
            <div className="row row-wrap" style={{ gap: 6 }}>
              {portfolio.sleeves.map((s) => {
                const on = g.linkedSleeveIds.includes(s.sleeve.id)
                return (
                  <button
                    key={s.sleeve.id}
                    type="button"
                    className={`btn btn-sm${on ? ' btn-primary' : ''}`}
                    onClick={() =>
                      updateGoal(g.id, {
                        linkedSleeveIds: on ? g.linkedSleeveIds.filter((x) => x !== s.sleeve.id) : [...g.linkedSleeveIds, s.sleeve.id],
                      })
                    }
                  >
                    {s.sleeve.name}
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      </div>

      <section className="stack stack-sm" style={{ marginBottom: 30 }}>
        <div className="row row-between row-wrap" style={{ gap: 10 }}>
          <h3>Habits feeding this</h3>
          <button type="button" className="btn btn-sm" onClick={() => setAddingHabit((v) => !v)}>
            {addingHabit ? 'Cancel' : 'Track something for this goal'}
          </button>
        </div>
        {addingHabit && <NewHabitForm defaultGoalId={g.id} onDone={() => setAddingHabit(false)} />}
        {habits.length === 0 && !addingHabit ? (
          <p className="meta" style={{ margin: 0 }}>
            None yet. Whatever you decide to spend less on can send the difference here.
          </p>
        ) : (
          <div className="grid-2">
            {habits.map((h) => (
              <HabitCard key={h.habit.id} view={h} goalTitle={g.title} />
            ))}
          </div>
        )}
      </section>

      <section className="stack stack-sm">
        <div className="row row-between">
          <h3>Details</h3>
          {!editing && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
        </div>
        {editing ? (
          <GoalEditor
            goalId={g.id}
            onDone={() => setEditing(false)}
          />
        ) : (
          <div className="row row-wrap" style={{ gap: 28 }}>
            <Stat label="Target" value={formatUsd(g.targetUsd)} />
            <Stat label="By" value={g.targetDate ? formatDate(g.targetDate) : 'No date'} />
            <Stat label="Horizon" value={HORIZON_LABEL[g.horizon]} />
          </div>
        )}
        <div className="row row-wrap" style={{ gap: 8, paddingTop: 12, borderTop: '1px solid var(--rule)' }}>
          {g.status === 'active' && !reached && (
            <button type="button" className="btn btn-sm" onClick={() => setGoalStatus(g.id, 'paused')}>
              Pause contributions
            </button>
          )}
          {g.status === 'paused' && (
            <button type="button" className="btn btn-sm" onClick={() => setGoalStatus(g.id, 'active')}>
              Resume
            </button>
          )}
          {g.status !== 'reached' && (
            <ConfirmButton className="btn btn-sm" confirmLabel="Yes, it is reached" onConfirm={() => { setGoalStatus(g.id, 'reached'); navigate('/goals') }}>
              Mark as reached
            </ConfirmButton>
          )}
        </div>
      </section>
    </div>
  )
}

function GoalEditor({ goalId, onDone }: { goalId: string; onDone: () => void }) {
  const goal = useHorizon((s) => s.goals.find((g) => g.id === goalId))!
  const updateGoal = useHorizon((s) => s.updateGoal)
  const [title, setTitle] = useState(goal.title)
  const [why, setWhy] = useState(goal.why)
  const [target, setTarget] = useState(String(goal.targetUsd))
  const [monthly, setMonthly] = useState(goal.monthlyUsd)
  const [date, setDate] = useState(goal.targetDate ?? '')
  const [horizon, setHorizon] = useState<Horizon>(goal.horizon)
  return (
    <div className="card stack stack-md" style={{ background: 'var(--paper-sunken)' }}>
      <Field label="Title">
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Why">
        <input className="input" value={why} onChange={(e) => setWhy(e.target.value)} />
      </Field>
      <div className="grid-3">
        <Field label="Target ($)">
          <input className="input num" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
        </Field>
        <Field label="By">
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Horizon">
          <select className="select" value={horizon} onChange={(e) => setHorizon(e.target.value as Horizon)}>
            {HORIZONS.map((h) => (
              <option key={h} value={h}>
                {HORIZON_LABEL[h]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Each month">
        <PercentSlider value={monthly} min={0} max={Math.max(6000, monthly)} step={50} suffix="" onChange={setMonthly} />
      </Field>
      <div className="row" style={{ gap: 8 }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            updateGoal(goalId, {
              title: title.trim() || goal.title,
              why: why.trim(),
              targetUsd: Number(target) || goal.targetUsd,
              monthlyUsd: monthly,
              targetDate: date || undefined,
              horizon,
            })
            onDone()
          }}
        >
          Save
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  )
}
