import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatUsd } from '../../components/ui'
import { hexPath, hexSpiral, hexToPixel } from '../../os/geometry'
import { journeyProgress } from '../../os/planner'
import type { JourneyPiece } from '../../os/types'
import { useHorizon } from '../../store/useHorizon'
import { useOS } from '../../store/useOS'

const SIZE = 46

/**
 * The journey as a flower-of-life packing: done pieces at the centre, open
 * pieces on the next ring, locked ones further out. Each hex is one discrete
 * piece of work between here and a goal.
 */
export default function JourneyScreen() {
  const pieces = useOS((s) => s.pieces)
  const agents = useOS((s) => s.agents)
  const { startPiece, completePiece, startSession, openChat } = useOS.getState()
  const goals = useHorizon((s) => s.goals)
  const [goalFilter, setGoalFilter] = useState<string>('all')
  const [selected, setSelected] = useState<string | null>(null)

  const shown = useMemo(() => pieces.filter((p) => goalFilter === 'all' || p.goalId === goalFilter), [pieces, goalFilter])
  const ordered = useMemo(() => {
    const rank = (p: JourneyPiece) => (p.status === 'done' ? 0 : p.status === 'doing' ? 1 : p.status === 'open' ? 2 : 3)
    return [...shown].sort((a, b) => rank(a) - rank(b) || (a.doneAt ?? '').localeCompare(b.doneAt ?? '') || a.weight - b.weight)
  }, [shown])
  const cells = hexSpiral(ordered.length)
  const placed = ordered.map((p, i) => ({ p, ...hexToPixel(cells[i].q, cells[i].r, SIZE) }))
  const minX = Math.min(0, ...placed.map((x) => x.x)) - SIZE * 1.2
  const maxX = Math.max(0, ...placed.map((x) => x.x)) + SIZE * 1.2
  const minY = Math.min(0, ...placed.map((x) => x.y)) - SIZE * 1.2
  const maxY = Math.max(0, ...placed.map((x) => x.y)) + SIZE * 1.2
  const progress = journeyProgress(shown)
  const sel = pieces.find((p) => p.id === selected)
  const goalOf = (id?: string) => goals.find((g) => g.id === id)

  return (
    <div className="page page-wide">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Journey</h1>
          <p className="lede">
            The discrete pieces of work between here and your goals, laid out from the centre. Done at the heart, open
            on the next ring, locked beyond that until what they depend on is finished.
          </p>
        </div>
        <div className="stack stack-xs" style={{ minWidth: 200 }}>
          <span className="label">Distance travelled</span>
          <span className="num" style={{ fontSize: 26 }}>
            {progress.done} <span className="muted">/ {progress.total}</span>
          </span>
          <div className="progress">
            <div className="progress-fill" style={{ width: `${progress.ratio * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="row row-wrap" style={{ gap: 6, marginBottom: 18 }}>
        <button type="button" className={`btn btn-sm${goalFilter === 'all' ? ' btn-primary' : ''}`} onClick={() => setGoalFilter('all')}>
          All goals
        </button>
        {goals
          .filter((g) => g.status === 'active')
          .map((g) => (
            <button key={g.id} type="button" className={`btn btn-sm${goalFilter === g.id ? ' btn-primary' : ''}`} onClick={() => setGoalFilter(g.id)}>
              {g.title}
            </button>
          ))}
      </div>

      <div className="desk is-map">
        <div className="card" style={{ padding: 8 }}>
          <svg className="hexmap" viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} role="list" aria-label="Journey map">
            {placed.map(({ p, x, y }) => {
              const fill = p.status === 'done' ? 'var(--accent)' : p.status === 'doing' ? 'var(--accent-soft)' : p.status === 'open' ? 'var(--paper-raised)' : 'var(--paper-sunken)'
              const stroke = p.status === 'done' ? 'var(--accent)' : p.status === 'locked' ? 'var(--rule)' : 'var(--accent-line)'
              const isSel = selected === p.id
              const words = p.title.split(' ')
              const lines: string[] = ['']
              for (const w of words) {
                if ((lines[lines.length - 1] + ' ' + w).trim().length > 13 && lines.length < 3) lines.push(w)
                else lines[lines.length - 1] = (lines[lines.length - 1] + ' ' + w).trim()
              }
              return (
                <g key={p.id} className={`hex is-${p.status}`} onClick={() => p.status !== 'locked' && setSelected(p.id)} role="listitem" aria-label={`${p.title}, ${p.status}`}>
                  <path d={hexPath(x, y, SIZE * 0.92)} fill={fill} stroke={isSel ? 'var(--ink)' : stroke} strokeWidth={isSel ? 2 : 1} />
                  <text className="hex-label" textAnchor="middle" y={y - (lines.length - 1) * 5.5 + 1} style={p.status === 'done' ? { fill: '#f2f6f4' } : undefined}>
                    {lines.map((l, i) => (
                      <tspan key={i} x={x} dy={i === 0 ? 0 : 11}>
                        {l}
                      </tspan>
                    ))}
                  </text>
                  <text className="hex-sub" textAnchor="middle" x={x} y={y + SIZE * 0.62} style={p.status === 'done' ? { fill: '#d5e0db' } : undefined}>
                    {p.weight}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        <div className="stack stack-md">
          {sel ? (
            <article className="card stack stack-md">
              <div className="row row-wrap" style={{ gap: 8 }}>
                <span className="chip chip-outline">{sel.status}</span>
                <span className="chip chip-outline">weight {sel.weight}</span>
                {sel.costUsd ? <span className="chip chip-outline num">{formatUsd(sel.costUsd)}</span> : null}
              </div>
              <h2>{sel.title}</h2>
              <p className="prose-sm" style={{ margin: 0 }}>
                {sel.detail}
              </p>
              {sel.goalId && goalOf(sel.goalId) && (
                <p className="meta" style={{ margin: 0 }}>
                  For{' '}
                  <Link to={`/goals/${sel.goalId}`} style={{ color: 'var(--accent)' }}>
                    {goalOf(sel.goalId)!.title}
                  </Link>
                </p>
              )}
              {sel.dependsOn.length > 0 && (
                <p className="meta" style={{ margin: 0 }}>
                  After: {sel.dependsOn.map((d) => pieces.find((p) => p.id === d)?.title ?? d).join('; ')}
                </p>
              )}
              <div className="row row-wrap" style={{ gap: 8, borderTop: '1px solid var(--rule)', paddingTop: 12 }}>
                {sel.status === 'open' && (
                  <>
                    <button type="button" className="btn btn-primary" onClick={() => startSession(sel.id)}>
                      Focus on this
                    </button>
                    <button type="button" className="btn" onClick={() => startPiece(sel.id)}>
                      Mark in progress
                    </button>
                  </>
                )}
                {sel.status === 'doing' && (
                  <button type="button" className="btn btn-primary" onClick={() => completePiece(sel.id)}>
                    Done
                  </button>
                )}
                {sel.status !== 'done' && sel.agentId && (
                  <button type="button" className="btn btn-ghost" onClick={() => openChat(sel.agentId!)}>
                    Ask {agents.find((a) => a.id === sel.agentId)?.name}
                  </button>
                )}
                {sel.status === 'done' && <span className="meta">Done {sel.doneAt ? new Date(sel.doneAt).toLocaleDateString('en-GB') : ''}.</span>}
              </div>
            </article>
          ) : (
            <div className="card stack stack-sm">
              <h4>How the map works</h4>
              <p className="prose-sm" style={{ margin: 0 }}>
                Each hexagon is one piece. Its number is its weight — how much of the journey it is. Pieces come from
                the planning engine, from agents, and from your own downloads. Click an open one to start it, or to
                start a focus session on it.
              </p>
              <p className="meta" style={{ margin: 0 }}>
                Locked pieces open when what they depend on is done.
              </p>
            </div>
          )}
          <div className="card stack stack-xs">
            <span className="label">Open now</span>
            {pieces.filter((p) => p.status === 'open' || p.status === 'doing').slice(0, 8).map((p) => (
              <button key={p.id} type="button" className="link-button" style={{ textAlign: 'left', fontSize: 14, textDecoration: 'none', color: 'var(--ink)' }} onClick={() => setSelected(p.id)}>
                {p.status === 'doing' ? '▸ ' : '· '}
                {p.title}
                {p.goalId && goalOf(p.goalId) && <span className="meta"> · {goalOf(p.goalId)!.title}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
