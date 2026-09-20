import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import GoalCard from '../components/GoalCard'
import HabitCard from '../components/HabitCard'
import { ConfidenceBar, formatUsd } from '../components/ui'
import { confidenceColor } from '../lib/color'
import { useGoalViews, useGraph, useHabitViews, usePortfolio } from '../store/derived'
import { useHorizon } from '../store/useHorizon'
import { allWorkflows, useOS } from '../store/useOS'
import { stageMeta, workflowById } from './workflows'
import { BLOCK_LABEL, todayKey } from './day'
import { sampleFeed } from './feed'
import { FLOW_HINT, FLOW_LABEL } from './bio'
import { journeyProgress } from './planner'
import type { WidgetId } from './types'

/**
 * The widget registry. A widget is a component and a line of description;
 * adding one — a Feedly feed, a GitHub queue, a calendar — is adding an entry
 * here. The Desk renders whichever the reader has switched on, in their order.
 */
export interface WidgetDef {
  id: WidgetId
  label: string
  blurb: string
  /** Columns of the 3-column desk grid. */
  span: 1 | 2 | 3
  Component: ComponentType
}

function PieceWidget() {
  const pieces = useOS((s) => s.pieces)
  const agents = useOS((s) => s.agents)
  const { startSession, openChat } = useOS.getState()
  const goals = useHorizon((s) => s.goals)
  const open = pieces.filter((p) => p.status === 'open' || p.status === 'doing')
  const next = [...open].sort((a, b) => (a.status === 'doing' ? -1 : 1) - (b.status === 'doing' ? -1 : 1) || a.weight - b.weight)[0]
  const progress = journeyProgress(pieces)
  return (
    <div className="stack stack-sm">
      <div className="row row-between">
        <span className="label">{next?.status === 'doing' ? 'In progress' : 'Nearest piece'} · {Math.round(progress.ratio * 100)}% of the way</span>
        <Link to="/journey" className="link-button" style={{ fontSize: 12.5 }}>Map</Link>
      </div>
      {next ? (
        <>
          <h3 style={{ fontSize: 20 }}>{next.title}</h3>
          <p className="prose-sm" style={{ margin: 0, fontSize: 14.5 }}>{next.detail}</p>
          <div className="meta">weight {next.weight}{next.goalId ? ` · for ${goals.find((g) => g.id === next.goalId)?.title ?? ''}` : ''}</div>
          <div className="row row-wrap" style={{ gap: 6 }}>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => startSession(next.id)}>Focus on this</button>
            {next.agentId && <button type="button" className="btn btn-sm" onClick={() => openChat(next.agentId!)}>Ask {agents.find((a) => a.id === next.agentId)?.name}</button>}
          </div>
        </>
      ) : (
        <p className="meta" style={{ margin: 0 }}>Nothing open. Add a goal or advance an initiative.</p>
      )}
    </div>
  )
}

function DayWidget() {
  const blocks = useOS((s) => s.blocks)
  const toggleBlock = useOS((s) => s.toggleBlock)
  const today = blocks.filter((b) => b.day === todayKey()).sort((a, b) => a.start.localeCompare(b.start))
  const now = new Date()
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return (
    <div className="stack stack-sm">
      <div className="row row-between">
        <span className="label">Today</span>
        <span className="meta">{today.filter((b) => b.done).length} of {today.length} done</span>
      </div>
      <ul className="day-list">
        {today.map((b) => {
          const current = b.start <= hhmm && hhmm < addMin(b.start, b.minutes)
          return (
            <li key={b.id} className={`day-block k-${b.kind}${b.done ? ' is-done' : ''}${current ? ' is-now' : ''}`}>
              <button type="button" className="day-check" aria-label={b.done ? 'Mark not done' : 'Mark done'} onClick={() => toggleBlock(b.id)}>{b.done ? '✓' : ''}</button>
              <span className="mono meta" style={{ width: 42 }}>{b.start}</span>
              <span className="truncate" style={{ flex: 1 }} title={`${b.title} — ${BLOCK_LABEL[b.kind]}`}>{b.title}</span>
              <span className="meta num" style={{ flex: 'none' }}>{b.minutes}m</span>
            </li>
          )
        })}
      </ul>
      <p className="meta" style={{ margin: 0 }}>Generated from the journey, the inbox and the body. Tick what happened; the rest is forgiven.</p>
    </div>
  )
}
function addMin(hhmm: string, m: number) {
  const [h, mm] = hhmm.split(':').map(Number)
  const t = h * 60 + mm + m
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

function InitiativesWidget() {
  const initiatives = useOS((s) => s.initiatives)
  const custom = useOS((s) => s.workflows)
  const workflows = allWorkflows(custom)
  return (
    <div className="stack stack-sm">
      <div className="row row-between">
        <span className="label">Initiatives</span>
        <Link to="/initiatives" className="link-button" style={{ fontSize: 12.5 }}>All</Link>
      </div>
      {initiatives.length === 0 && <p className="meta" style={{ margin: 0 }}>Nothing in flight. Capture an idea and start one.</p>}
      {initiatives.slice(0, 4).map((i) => {
        const w = workflowById(workflows, i.workflowId)
        const st = w?.stages[i.stageIndex]
        return (
          <Link key={i.id} to={`/initiatives?id=${i.id}`} className="stack stack-xs" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="row row-between"><span style={{ fontWeight: 500, fontSize: 14 }}>{i.title}</span><span className="meta">{st ? st.label ?? stageMeta(st.kind).label : ''}</span></div>
            <div className="stage-dots">
              {(w?.stages ?? []).map((s2, k) => <span key={s2.id} className={`stage-dot${k <= i.stageIndex ? ' is-on' : ''}`} title={s2.label ?? stageMeta(s2.kind).label} />)}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function FeedWidget() {
  const runtimeUrl = useOS((s) => s.runtimeUrl)
  const useRuntime = useOS((s) => s.useRuntime)
  return (
    <div className="stack stack-sm">
      <div className="row row-between">
        <span className="label">Feed</span>
        <span className="meta">{useRuntime ? `via ${runtimeUrl.replace(/^https?:\/\//, '')}` : 'sample · connect a runtime for live RSS'}</span>
      </div>
      {sampleFeed.slice(0, 4).map((f) => (
        <div key={f.id} className="stack" style={{ gap: 2 }}>
          <span style={{ fontSize: 14, lineHeight: 1.4 }}>{f.title}</span>
          <span className="meta">{f.source} · {f.summary}</span>
        </div>
      ))}
      <p className="meta" style={{ margin: 0 }}>A widget is one file in <code className="mono">src/os/widgets.tsx</code>. This one reads RSS through the runtime's <code className="mono">/feed</code>.</p>
    </div>
  )
}

function HabitsWidget() {
  const habits = useHabitViews()
  const goals = useHorizon((s) => s.goals)
  return (
    <div className="stack stack-sm">
      <span className="label">This month</span>
      {habits.slice(0, 2).map((h) => <HabitCard key={h.habit.id} view={h} goalTitle={goals.find((g) => g.id === h.habit.redirectToGoalId)?.title} compact />)}
    </div>
  )
}

function FlowWidget() {
  const flow = useOS((s) => s.flow)
  const bio = useOS((s) => s.bio)
  const session = useOS((s) => s.session)
  const last = bio.at(-1)
  return (
    <div className="stack stack-sm">
      <div className="row row-between"><span className="label">Body</span><Link to="/flow" className="link-button" style={{ fontSize: 12.5 }}>Flow</Link></div>
      <div className="row" style={{ gap: 10 }}><span className={`status-dot ${flow}`} /><span style={{ fontFamily: 'var(--serif)', fontSize: 20 }}>{FLOW_LABEL[flow]}</span>{last && <span className="num meta">{last.hr} bpm · {last.hrv} ms</span>}</div>
      <p className="meta" style={{ margin: 0 }}>{FLOW_HINT[flow]}</p>
      {session && <span className="meta">Session running, {Math.round(session.flowMinutes)} min in flow.</span>}
    </div>
  )
}

function JourneyWidget() {
  const pieces = useOS((s) => s.pieces)
  const p = journeyProgress(pieces)
  return (
    <div className="stack stack-sm">
      <span className="label">Journey</span>
      <span className="num" style={{ fontSize: 24 }}>{p.done} <span className="muted">/ {p.total}</span></span>
      <div className="progress"><div className="progress-fill" style={{ width: `${p.ratio * 100}%` }} /></div>
    </div>
  )
}

function MoneyWidget() {
  const portfolio = usePortfolio()
  const goals = useGoalViews()
  const { confidence } = useGraph()
  const nodes = useHorizon((s) => s.nodes)
  const nearest = goals.projections.filter((g) => g.goal.status === 'active' && g.remainingUsd > 0).sort((a, b) => (a.monthsToDate ?? 999) - (b.monthsToDate ?? 999))[0]
  return (
    <div className="stack stack-sm">
      <div className="row row-between"><span className="label">Money</span><Link to="/money" className="link-button" style={{ fontSize: 12.5 }}>Allocation</Link></div>
      <div className="row row-wrap" style={{ gap: 18 }}>
        <span className="meta"><span className="num" style={{ color: 'var(--ink)' }}>{formatUsd(portfolio.totalUsd, { compact: true })}</span> book</span>
        <span className="meta"><span className="num" style={{ color: 'var(--ink)' }}>{formatUsd(goals.freeCashUsd, { compact: true })}</span> unpointed</span>
      </div>
      {nearest && <GoalCard p={nearest} compact />}
      {nodes.filter((n) => n.kind === 'pillar' && !n.archived).slice(0, 3).map((n) => (
        <div key={n.id} className="row" style={{ gap: 8, fontSize: 13 }}><span style={{ flex: 1 }}>{n.label}</span><ConfidenceBar value={confidence[n.id] ?? 50} width={70} /><span className="num meta" style={{ color: confidenceColor(confidence[n.id] ?? 50) }}>{(confidence[n.id] ?? 50).toFixed(0)}</span></div>
      ))}
    </div>
  )
}

function AwayWidget() {
  const lastSeenAt = useOS((s) => s.lastSeenAt)
  const runs = useOS((s) => s.runs)
  const inbox = useOS((s) => s.inbox)
  const experiments = useOS((s) => s.experiments)
  const since = Date.parse(lastSeenAt)
  const doneRuns = runs.filter((r) => r.status === 'done' && Date.parse(r.updatedAt) > since)
  const waiting = runs.filter((r) => r.status === 'awaiting_review')
  const arrived = inbox.filter((i) => Date.parse(i.at) > since && !i.done)
  const finished = experiments.filter((e) => e.finishedAt && Date.parse(e.finishedAt) > since)
  const running = experiments.find((e) => e.status === 'running')
  return (
    <div className="stack stack-sm">
      <div className="row row-between"><span className="label">Since you were away</span><span className="meta">{new Date(lastSeenAt).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
      <ul className="stack stack-xs" style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 14 }}>
        <li><span className="num">{doneRuns.length}</span> run{doneRuns.length === 1 ? '' : 's'} finished{doneRuns[0] ? ` — latest: ${doneRuns[0].title}` : ''}</li>
        <li><span className="num">{waiting.length}</span> waiting for your review</li>
        <li><span className="num">{arrived.length}</span> arrived on the Desk</li>
        <li><span className="num">{finished.length}</span> experiment{finished.length === 1 ? '' : 's'} finished{running ? ` · ${running.name} at epoch ${running.metrics.length}/${running.epochs}` : ''}</li>
      </ul>
      <div className="row" style={{ gap: 6 }}>
        <Link to="/agents" className="btn btn-sm">Review runs</Link>
        <Link to="/lab" className="btn btn-sm btn-ghost">Lab</Link>
      </div>
    </div>
  )
}

function LabWidget() {
  const experiments = useOS((s) => s.experiments)
  const e = experiments.find((x) => x.status === 'running') ?? experiments[0]
  if (!e) return <p className="meta" style={{ margin: 0 }}>No experiments.</p>
  const last = e.metrics.at(-1)
  return (
    <div className="stack stack-sm">
      <div className="row row-between"><span className="label">Lab</span><Link to="/lab" className="link-button" style={{ fontSize: 12.5 }}>Open</Link></div>
      <div style={{ fontWeight: 500, fontSize: 14 }}>{e.name}</div>
      <div className="progress" style={{ height: 4 }}><div className="progress-fill" style={{ width: `${(e.metrics.length / e.epochs) * 100}%` }} /></div>
      <span className="meta">{e.status} · epoch {e.metrics.length}/{e.epochs}{last ? ` · val loss ${last.valLoss.toFixed(3)} · ${e.metricName} ${last.metric.toFixed(3)}` : ''}</span>
    </div>
  )
}

export const WIDGETS: WidgetDef[] = [
  { id: 'away', label: 'Since you were away', blurb: 'What the agents and the lab did while you were not looking.', span: 1, Component: AwayWidget },
  { id: 'lab', label: 'Lab', blurb: 'The experiment training right now.', span: 1, Component: LabWidget },
  { id: 'inbox', label: 'Inbox', blurb: 'Everything that arrived, with the score.', span: 2, Component: () => null },
  { id: 'piece', label: 'Nearest piece', blurb: 'The one thing to do next.', span: 1, Component: PieceWidget },
  { id: 'day', label: 'Today', blurb: 'Time blocks from the journey and the body.', span: 1, Component: DayWidget },
  { id: 'initiatives', label: 'Initiatives', blurb: 'Ideas on their way to outcomes.', span: 1, Component: InitiativesWidget },
  { id: 'feed', label: 'Feed', blurb: 'RSS through the runtime. The example of plugging something in.', span: 1, Component: FeedWidget },
  { id: 'flow', label: 'Body', blurb: 'Flow state and heart rate.', span: 1, Component: FlowWidget },
  { id: 'habits', label: 'Habits', blurb: 'This month’s spending you are changing.', span: 1, Component: HabitsWidget },
  { id: 'journey', label: 'Journey', blurb: 'Distance travelled.', span: 1, Component: JourneyWidget },
  { id: 'money', label: 'Money', blurb: 'Book, nearest goal, pillars.', span: 1, Component: MoneyWidget },
]
