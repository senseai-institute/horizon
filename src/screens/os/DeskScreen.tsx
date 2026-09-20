import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Glyph from '../../components/Glyph'
import { formatUsd, relativeTime } from '../../components/ui'
import { inboxScore, itemScore, scoreWord } from '../../os/inbox'
import { journeyProgress } from '../../os/planner'
import type { InboxItem } from '../../os/types'
import { useGoalViews } from '../../store/derived'
import { useOS } from '../../store/useOS'

/**
 * The main work surface. Left: everything that came in, with a score you work
 * down. Right: the item you are looking at, and the nearest piece of the
 * journey when nothing is selected.
 */
export default function DeskScreen() {
  const inbox = useOS((s) => s.inbox)
  const pieces = useOS((s) => s.pieces)
  const agents = useOS((s) => s.agents)
  const runs = useOS((s) => s.runs)
  const { markRead, markDone, reply, openChat, startSession } = useOS.getState()
  const goals = useGoalViews()
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter] = useState<'open' | 'all'>('open')
  const [replyText, setReplyText] = useState('')

  const score = inboxScore(inbox)
  const rows = useMemo(
    () =>
      inbox
        .filter((i) => (filter === 'open' ? !i.done : true))
        .sort((a, b) => itemScore(b) - itemScore(a) || b.at.localeCompare(a.at)),
    [inbox, filter],
  )
  const item = inbox.find((i) => i.id === selected) ?? null
  const progress = journeyProgress(pieces)
  const open = pieces.filter((p) => p.status === 'open' || p.status === 'doing')
  const next = open.sort((a, b) => (a.status === 'doing' ? -1 : 1) - (b.status === 'doing' ? -1 : 1) || a.weight - b.weight)[0]
  const goalOf = (id?: string) => goals.projections.find((p) => p.goal.id === id)?.goal
  const run = item?.runId ? runs.find((r) => r.id === item.runId) : undefined

  const select = (i: InboxItem) => {
    setSelected(i.id)
    setReplyText('')
    if (!i.read) markRead(i.id)
  }

  return (
    <div className="page page-wide">
      <div className="desk">
        <section className="stack stack-md">
          <div className="row" style={{ gap: 16, alignItems: 'center' }}>
            <ScoreRing score={score} />
            <div className="stack stack-xs">
              <h2 style={{ fontSize: 22 }}>{scoreWord(score)}</h2>
              <p className="meta" style={{ margin: 0, maxWidth: '38ch' }}>
                Inbox score: who it is from, whether it is urgent, and how long it has waited. Reading does not move
                it. Doing does.
              </p>
            </div>
          </div>

          <div className="row row-between">
            <div className="segmented">
              <button type="button" aria-pressed={filter === 'open'} onClick={() => setFilter('open')}>
                Open {inbox.filter((i) => !i.done).length}
              </button>
              <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
                Everything
              </button>
            </div>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => openChat('ag-desk')}>
              Ask Desk to triage
            </button>
          </div>

          <div className="inbox-list">
            {rows.length === 0 && (
              <div className="empty" style={{ border: 0 }}>
                <span className="meta">Nothing open. Score is zero.</span>
              </div>
            )}
            {rows.map((i) => {
              const ag = i.from.agentId ? agents.find((a) => a.id === i.from.agentId) : undefined
              return (
                <button key={i.id} type="button" className={`inbox-row${selected === i.id ? ' is-active' : ''}${!i.read ? ' is-unread' : ''}${i.done ? ' is-done' : ''}`} onClick={() => select(i)}>
                  <span>{!i.read && !i.done ? <span className="inbox-unread" /> : ag ? <Glyph size={12} hue={ag.hue} /> : null}</span>
                  <span style={{ minWidth: 0 }}>
                    <div className="inbox-subject">
                      {i.urgent && <span style={{ color: 'var(--contradict)' }}>! </span>}
                      {i.subject}
                    </div>
                    <div className="inbox-from">
                      {i.from.name} · {i.kind}
                      {i.scope === 'company' ? ' · company' : ''}
                    </div>
                  </span>
                  <span className="num meta" title="This item's share of the score">
                    {i.done ? '—' : itemScore(i).toFixed(1)}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="stack stack-md">
          {item ? (
            <article className="card stack stack-md">
              <div className="row row-wrap" style={{ gap: 8 }}>
                <span className="chip chip-outline">{item.kind}</span>
                {item.urgent && <span className="chip chip-contradict">urgent</span>}
                <span className="chip chip-outline">{item.scope}</span>
                <span className="meta" style={{ marginLeft: 'auto' }}>
                  {relativeTime(item.at)}
                </span>
              </div>
              <div>
                <h2 style={{ marginBottom: 6 }}>{item.subject}</h2>
                <div className="meta">From {item.from.name}</div>
              </div>
              <p className="prose" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {item.body}
              </p>
              {item.goalId && goalOf(item.goalId) && (
                <p className="meta" style={{ margin: 0 }}>
                  About the goal{' '}
                  <Link to={`/goals/${item.goalId}`} style={{ color: 'var(--accent)' }}>
                    {goalOf(item.goalId)!.title}
                  </Link>
                  .
                </p>
              )}
              {run && (
                <div className="card-quiet stack stack-xs" style={{ background: 'var(--paper-sunken)' }}>
                  <span className="label">Run · {run.status.replace('_', ' ')}</span>
                  <div className="run-steps">
                    {run.steps.map((s) => (
                      <span key={s.id} className={`run-step ${s.status}`} title={`${s.label}${s.log ? ' — ' + s.log : ''}`} />
                    ))}
                  </div>
                  <p className="meta" style={{ margin: 0 }}>
                    {run.intent}
                  </p>
                </div>
              )}
              {!item.done && (
                <div className="stack stack-sm" style={{ borderTop: '1px solid var(--rule)', paddingTop: 14 }}>
                  {item.kind === 'approval' && run?.status === 'awaiting_review' ? (
                    <div className="row row-wrap" style={{ gap: 8 }}>
                      <button type="button" className="btn btn-primary" onClick={() => markDone(item.id, 'approve')}>
                        Approve and run
                      </button>
                      <button type="button" className="btn" onClick={() => markDone(item.id, 'reject')}>
                        Reject
                      </button>
                      {item.from.agentId && (
                        <button type="button" className="btn btn-ghost" onClick={() => openChat(item.from.agentId!)}>
                          Ask {item.from.name}
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <textarea className="textarea" style={{ minHeight: 70, fontSize: 15 }} placeholder={`Reply to ${item.from.name}…`} value={replyText} onChange={(e) => setReplyText(e.target.value)} />
                      <div className="row row-wrap" style={{ gap: 8 }}>
                        <button type="button" className="btn btn-primary" disabled={!replyText.trim()} onClick={() => reply(item.id, replyText.trim())}>
                          Send reply
                        </button>
                        <button type="button" className="btn" onClick={() => markDone(item.id)}>
                          Done with this
                        </button>
                        {item.kind === 'email' && (
                          <button type="button" className="btn btn-ghost" onClick={() => openChat('ag-desk')}>
                            Ask Desk to draft
                          </button>
                        )}
                        {item.from.agentId && (
                          <button type="button" className="btn btn-ghost" onClick={() => openChat(item.from.agentId!)}>
                            Open chat
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </article>
          ) : (
            <article className="card stack stack-md">
              <div className="row row-between">
                <span className="label">The journey · {Math.round(progress.ratio * 100)}% of the way</span>
                <Link to="/journey" className="link-button" style={{ fontSize: 13 }}>
                  See the map
                </Link>
              </div>
              <div className="progress" style={{ height: 6 }}>
                <div className="progress-fill" style={{ width: `${progress.ratio * 100}%` }} />
              </div>
              {next ? (
                <>
                  <div>
                    <span className="label">{next.status === 'doing' ? 'In progress' : 'Nearest piece'}</span>
                    <h2 style={{ marginTop: 6 }}>{next.title}</h2>
                    <p className="prose-sm" style={{ margin: '8px 0 0' }}>
                      {next.detail}
                    </p>
                  </div>
                  <div className="row row-wrap" style={{ gap: 12 }}>
                    <span className="meta">weight {next.weight}</span>
                    {next.goalId && goalOf(next.goalId) && <span className="meta">for {goalOf(next.goalId)!.title}</span>}
                    {next.costUsd ? <span className="meta">{formatUsd(next.costUsd)}</span> : null}
                  </div>
                  <div className="row row-wrap" style={{ gap: 8 }}>
                    <button type="button" className="btn btn-primary" onClick={() => startSession(next.id)}>
                      Start a focus session on this
                    </button>
                    {next.agentId && (
                      <button type="button" className="btn" onClick={() => openChat(next.agentId!)}>
                        Ask {agents.find((a) => a.id === next.agentId)?.name}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p className="prose-sm" style={{ margin: 0 }}>
                  Nothing open on the journey. Add a goal and Planner lays out the pieces.
                </p>
              )}
              <p className="meta" style={{ margin: 0 }}>
                Select something on the left to work it. The score moves when you do.
              </p>
            </article>
          )}
        </section>
      </div>
    </div>
  )
}

/** A quiet ring. Fills as the score rises; the aim is to see it empty. */
function ScoreRing({ score }: { score: number }) {
  const r = 34
  const c = 2 * Math.PI * r
  const fill = Math.min(1, score / 60)
  const color = score < 10 ? 'var(--support)' : score < 25 ? 'var(--accent)' : score < 50 ? '#b3925a' : 'var(--contradict)'
  return (
    <div className="score-ring" role="img" aria-label={`Inbox score ${score}`}>
      <svg width="84" height="84" viewBox="0 0 84 84">
        <circle cx="42" cy="42" r={r} fill="none" stroke="var(--paper-deep)" strokeWidth="5" />
        <circle cx="42" cy="42" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - fill)} transform="rotate(-90 42 42)" style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.22,0.61,0.36,1)' }} />
      </svg>
      <span className="num">{score}</span>
    </div>
  )
}
