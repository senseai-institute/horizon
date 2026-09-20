import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoalProgress } from '../components/GoalCard'
import { Field } from '../components/ui'
import { HORIZONS, HORIZON_HINT, HORIZON_LABEL, projectGoal } from '../lib/goals'
import type { Horizon } from '../lib/types'
import { useHorizon } from '../store/useHorizon'

type Step = 'goal' | 'amount' | 'habit' | 'done'

const GOAL_EXAMPLES = ['Buy a place when the lease ends', 'Six weeks off next year', 'A year of runway to build the thing', 'Three months of breathing room']

/**
 * Starts from what someone actually wants, not from a market. Three short
 * steps: the goal, the numbers, and one thing they would happily spend less on
 * to get there. Beliefs come later, once there is something for them to fund.
 */
export default function OnboardingScreen() {
  const navigate = useNavigate()
  const addGoal = useHorizon((s) => s.addGoal)
  const addHabit = useHorizon((s) => s.addHabit)
  const completeOnboarding = useHorizon((s) => s.completeOnboarding)
  const cashUsd = useHorizon((s) => s.cashUsd)

  const [step, setStep] = useState<Step>('goal')
  const [title, setTitle] = useState('')
  const [why, setWhy] = useState('')
  const [horizon, setHorizon] = useState<Horizon>('soon')
  const [target, setTarget] = useState('')
  const [monthly, setMonthly] = useState('')
  const [date, setDate] = useState('')
  const [category, setCategory] = useState('')
  const [baseline, setBaseline] = useState('')
  const [habitTarget, setHabitTarget] = useState('')
  const [goalId, setGoalId] = useState<string | null>(null)

  const finishGoal = () => {
    const id = addGoal({
      title: title.trim(),
      why: why.trim(),
      kind: 'save',
      horizon,
      targetUsd: Number(target),
      monthlyUsd: Number(monthly) || 0,
      targetDate: date || undefined,
      earmarkedUsd: 0,
    })
    setGoalId(id)
    setStep('habit')
  }

  const finish = (withHabit: boolean) => {
    if (withHabit && goalId && category.trim() && Number(baseline) > 0)
      addHabit({
        category: category.trim(),
        title: `Less on ${category.trim().toLowerCase()}`,
        baselineMonthlyUsd: Number(baseline),
        targetMonthlyUsd: Number(habitTarget) || 0,
        redirectToGoalId: goalId,
      })
    completeOnboarding()
    setStep('done')
  }

  const preview =
    Number(target) > 0
      ? projectGoal(
          {
            id: 'preview',
            title,
            why,
            horizon,
            kind: 'save',
            targetUsd: Number(target),
            earmarkedUsd: 0,
            monthlyUsd: Number(monthly) || 0,
            targetDate: date || undefined,
            linkedSleeveIds: [],
            status: 'active',
            createdAt: new Date().toISOString(),
          },
          () => 0,
          0,
        )
      : null

  return (
    <div className="page page-narrow" style={{ maxWidth: 680 }}>
      {step === 'goal' && (
        <div className="stack stack-lg">
          <div>
            <h1>What are you working toward?</h1>
            <p className="lede" style={{ marginTop: 10 }}>
              Not a return target. A thing — a place, a stretch of time, something you want to make or give. Money is
              for something, and Horizon starts there.
            </p>
          </div>
          <div className="stack stack-md">
            <Field label="The goal">
              <input className="input" autoFocus style={{ fontSize: 17, padding: '10px 12px' }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Buy a place when the lease ends in April" />
            </Field>
            <div className="row row-wrap" style={{ gap: 6 }}>
              {GOAL_EXAMPLES.map((ex) => (
                <button key={ex} type="button" className="chip" style={{ cursor: 'pointer', border: 0 }} onClick={() => setTitle(ex)}>
                  {ex}
                </button>
              ))}
            </div>
            <Field label="Why it matters — one honest sentence">
              <input className="input" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Owning makes the next decade of housing a decision, not a surprise." />
            </Field>
            <div className="field">
              <span className="label">When</span>
              <div className="grid-2" style={{ gap: 8 }}>
                {HORIZONS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    className="card"
                    style={{ textAlign: 'left', cursor: 'pointer', padding: '12px 14px', borderColor: horizon === h ? 'var(--accent)' : 'var(--rule)', background: horizon === h ? 'var(--accent-soft)' : 'var(--paper-raised)' }}
                    onClick={() => setHorizon(h)}
                  >
                    <div style={{ fontWeight: 500 }}>{HORIZON_LABEL[h]}</div>
                    <div className="meta">{HORIZON_HINT[h]}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="row row-between">
            <button type="button" className="btn btn-primary" disabled={!title.trim()} onClick={() => setStep('amount')}>
              Continue
            </button>
            <button
              type="button"
              className="link-button"
              style={{ fontSize: 13 }}
              onClick={() => {
                completeOnboarding()
                navigate('/desk')
              }}
            >
              Skip — show me the example
            </button>
          </div>
        </div>
      )}

      {step === 'amount' && (
        <div className="stack stack-lg">
          <div>
            <h1>How much, and by when?</h1>
            <p className="lede" style={{ marginTop: 10 }}>
              Rough is fine. Horizon will tell you whether the monthly amount actually gets there, and what to change
              if it does not.
            </p>
          </div>
          <div className="grid-3">
            <Field label="Target ($)">
              <input className="input num" autoFocus inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="120000" />
            </Field>
            <Field label="Each month ($)">
              <input className="input num" inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} placeholder="3500" />
            </Field>
            <Field label="By (optional)">
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>
          {preview && (
            <div className="card stack stack-sm">
              <div className="goal-title">{title}</div>
              <GoalProgress p={preview} />
              <p className="meta" style={{ margin: 0 }}>
                {preview.monthsToDate !== null
                  ? preview.shortfallUsd === 0
                    ? `At that rate it lands on time.`
                    : `At that rate it lands about $${Math.round(preview.shortfallUsd).toLocaleString()} short. ${preview.neededMonthlyUsd ? `$${preview.neededMonthlyUsd.toLocaleString()} a month would do it.` : ''}`
                  : preview.monthsToFund !== null
                    ? `About ${preview.monthsToFund} months at that rate.`
                    : 'Add a monthly amount to see when it lands.'}
                {' '}You have ${cashUsd.toLocaleString()} in cash to point at goals as well.
              </p>
            </div>
          )}
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-primary" disabled={!(Number(target) > 0)} onClick={finishGoal}>
              Put it on the board
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setStep('goal')}>
              Back
            </button>
          </div>
        </div>
      )}

      {step === 'habit' && (
        <div className="stack stack-lg">
          <div>
            <h1>One thing you would happily spend less on?</h1>
            <p className="lede" style={{ marginTop: 10 }}>
              Whatever you do not spend on it goes to {title || 'the goal'} — automatically, at the end of every month.
              That is the whole reward system. No points, no streak fire. The goal just gets closer.
            </p>
          </div>
          <Field label="What is it?">
            <input className="input" autoFocus value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Cannabis, takeaway, taxis, subscriptions…" />
          </Field>
          <div className="grid-2">
            <Field label="A typical month used to cost ($)">
              <input className="input num" inputMode="decimal" value={baseline} onChange={(e) => setBaseline(e.target.value)} placeholder="340" />
            </Field>
            <Field label="Aiming for ($ a month)">
              <input className="input num" inputMode="decimal" value={habitTarget} onChange={(e) => setHabitTarget(e.target.value)} placeholder="150" />
            </Field>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-primary" disabled={!(category.trim() && Number(baseline) > 0)} onClick={() => finish(true)}>
              Track it
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => finish(false)}>
              Not right now
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="stack stack-lg">
          <div>
            <h1>That is the board.</h1>
            <p className="lede" style={{ marginTop: 10 }}>
              Your goal is up, next to an example so you can see how the rest fits together: a Desk where the work
              arrives, a journey of pieces between you and the goal, agents that prepare things and wait for you, and
              beliefs and values that decide where the long-term money goes.
            </p>
          </div>
          <div className="row row-wrap" style={{ gap: 8 }}>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/desk')}>
              Open the Desk
            </button>
            <button type="button" className="btn" onClick={() => navigate(goalId ? `/goals/${goalId}` : '/goals')}>
              See the goal
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
