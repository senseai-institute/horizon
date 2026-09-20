import { Link } from 'react-router-dom'
import GoalCard from '../components/GoalCard'
import HabitCard from '../components/HabitCard'
import { ConfidenceBar, formatUsd } from '../components/ui'
import { confidenceColor } from '../lib/color'
import { alignmentWord, monthKey, monthLabel } from '../lib/goals'
import { useGoalViews, useGraph, useHabitViews, usePortfolio, useValuesView } from '../store/derived'
import { useHorizon } from '../store/useHorizon'

/**
 * The command centre. One screen that answers: what am I working toward, how is
 * it going, and what is waiting on me. Deliberately short.
 */
export default function TodayScreen() {
  const goals = useGoalViews()
  const habits = useHabitViews()
  const values = useValuesView()
  const portfolio = usePortfolio()
  const { confidence } = useGraph()
  const nodes = useHorizon((s) => s.nodes)
  const reviewItems = useHorizon((s) => s.reviewItems)
  const pending = reviewItems.filter((r) => r.status === 'pending')
  const pillars = nodes.filter((n) => n.kind === 'pillar' && !n.archived)
  const goalById = new Map(goals.projections.map((p) => [p.goal.id, p]))

  const active = goals.projections.filter((p) => p.goal.status === 'active' && p.remainingUsd > 0)
  const behind = active.filter((p) => p.shortfallUsd > 0)
  const nearest = [...active].sort((a, b) => (a.monthsToDate ?? 999) - (b.monthsToDate ?? 999)).slice(0, 3)

  /* Small, true things worth noticing. Never confetti. */
  const wins: { text: string; to: string }[] = []
  for (const h of habits) {
    const last = h.months.filter((m) => !m.isCurrent).slice(-1)[0]
    const goal = goalById.get(h.habit.redirectToGoalId)
    if (last?.underTarget && last.releasedUsd > 0)
      wins.push({
        text: `${monthLabel(last.month, 'long')} came in under target on ${h.habit.category.toLowerCase()}. ${formatUsd(last.releasedUsd)} went to ${goal?.goal.title ?? 'your goal'}.`,
        to: `/goals/${h.habit.redirectToGoalId}`,
      })
    else if (h.streak >= 2)
      wins.push({ text: `${h.streak} months running under target on ${h.habit.category.toLowerCase()}.`, to: '/goals' })
  }
  for (const p of goals.projections) {
    if (p.goal.status === 'reached' && p.goal.reachedAt && Date.now() - Date.parse(p.goal.reachedAt) < 45 * 86_400_000)
      wins.push({ text: `${p.goal.title} — reached.`, to: `/goals/${p.goal.id}` })
  }

  const today = new Date()
  const hour = today.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="page">
      <div className="page-head" style={{ marginBottom: 26 }}>
        <div className="page-head-text">
          <span className="label">{today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <h1 style={{ marginTop: 6 }}>{greeting}.</h1>
          <p className="lede">
            {active.length} goal{active.length === 1 ? '' : 's'} in progress, {formatUsd(goals.totalReleasedUsd)} released by
            habits so far
            {pending.length ? `, and ${pending.length} thing${pending.length === 1 ? '' : 's'} waiting on you.` : '. Nothing is waiting on you.'}
          </p>
        </div>
      </div>

      <div className="today-grid">
        <div className="stack stack-lg">
          {wins.length > 0 && (
            <section className="stack stack-sm">
              {wins.slice(0, 2).map((w, i) => (
                <Link key={i} to={w.to} className="quiet-win" style={{ textDecoration: 'none' }}>
                  <span aria-hidden="true">·</span>
                  <span>{w.text}</span>
                </Link>
              ))}
            </section>
          )}

          <section className="stack stack-sm">
            <div className="row row-between">
              <h3>Closest goals</h3>
              <Link to="/goals" className="link-button" style={{ fontSize: 13 }}>
                All goals
              </Link>
            </div>
            <div className="grid-3">
              {nearest.map((p) => (
                <GoalCard key={p.goal.id} p={p} compact />
              ))}
            </div>
            {behind.length > 0 && (
              <p className="meta" style={{ margin: 0 }}>
                {behind.length === 1 ? `${behind[0].goal.title} is behind.` : `${behind.length} goals are behind.`}{' '}
                <Link to="/money/review">There is a proposal in the queue.</Link>
              </p>
            )}
          </section>

          <section className="stack stack-sm">
            <div className="row row-between">
              <h3>This month</h3>
              <span className="meta">{monthLabel(monthKey(), 'long')}</span>
            </div>
            {habits.length === 0 ? (
              <p className="prose-sm" style={{ margin: 0 }}>
                Nothing tracked yet. <Link to="/goals#habits">Pick something you would like to spend less on</Link> and
                choose where the difference goes.
              </p>
            ) : (
              <div className="stack stack-sm">
                {habits.map((h) => (
                  <HabitCard key={h.habit.id} view={h} goalTitle={goalById.get(h.habit.redirectToGoalId)?.goal.title} compact />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="stack stack-md">
          <section className="card stack stack-sm">
            <div className="row row-between">
              <h4>Waiting on you</h4>
              <Link to="/money/review" className="link-button" style={{ fontSize: 13 }}>
                Review queue
              </Link>
            </div>
            {pending.length === 0 ? (
              <p className="meta" style={{ margin: 0 }}>
                Nothing. Horizon only asks when something has actually changed.
              </p>
            ) : (
              <ol className="stack stack-xs" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {pending.slice(0, 3).map((r, i) => (
                  <li key={r.id}>
                    <Link to="/money/review" className="next-step">
                      <span className="next-step-n">{i + 1}</span>
                      <span style={{ fontSize: 14 }}>{r.title}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="card stack stack-sm">
            <div className="row row-between">
              <h4>Your worldview</h4>
              <Link to="/beliefs" className="link-button" style={{ fontSize: 13 }}>
                Open the map
              </Link>
            </div>
            {pillars.map((p) => (
              <Link key={p.id} to={`/beliefs/${p.id}`} className="row" style={{ gap: 12, textDecoration: 'none', color: 'inherit' }}>
                <span style={{ flex: 1, fontSize: 14 }}>{p.label}</span>
                <ConfidenceBar value={confidence[p.id] ?? 50} width={90} />
                <span className="num meta" style={{ color: confidenceColor(confidence[p.id] ?? 50), width: 24, textAlign: 'right' }}>
                  {(confidence[p.id] ?? 50).toFixed(0)}
                </span>
              </Link>
            ))}
            <p className="meta" style={{ margin: 0 }}>
              {formatUsd(portfolio.investedUsd, { compact: true })} is invested behind these, across {portfolio.sleeves.length} sleeves.
            </p>
          </section>

          <section className="card stack stack-sm">
            <div className="row row-between">
              <h4>Values</h4>
              <Link to="/values" className="link-button" style={{ fontSize: 13 }}>
                Adjust
              </Link>
            </div>
            <div className="row" style={{ gap: 12, alignItems: 'baseline' }}>
              <span className="num" style={{ fontSize: 26 }}>
                {values.portfolioScore === null ? '—' : `${values.portfolioScore > 0 ? '+' : ''}${values.portfolioScore}`}
              </span>
              <span className="meta">{alignmentWord(values.portfolioScore)} · what you hold, weighted by what you care about</span>
            </div>
            {values.conflicts.length > 0 && (
              <p className="meta" style={{ margin: 0 }}>
                {values.conflicts.length} compan{values.conflicts.length === 1 ? 'y' : 'ies'} on the map work
                {values.conflicts.length === 1 ? 's' : ''} against a core value.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
