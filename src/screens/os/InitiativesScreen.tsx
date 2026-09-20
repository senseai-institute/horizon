import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Glyph from '../../components/Glyph'
import { useToast } from '../../components/Toast'
import { Field, formatDate, formatUsd } from '../../components/ui'
import { useGraph } from '../../store/derived'
import { useHorizon } from '../../store/useHorizon'
import { STAGES, STAGE_HINT, STAGE_LABEL, useOS } from '../../store/useOS'

/**
 * Idea → outcome, as one line. Every stage does something real and leaves a
 * thing you can open: a run, a pillar, pieces, a goal, calendar time. The
 * alternative-sports initiative ships mid-flight so the shape is visible.
 */
export default function InitiativesScreen() {
  const initiatives = useOS((s) => s.initiatives)
  const runs = useOS((s) => s.runs)
  const pieces = useOS((s) => s.pieces)
  const blocks = useOS((s) => s.blocks)
  const agents = useOS((s) => s.agents)
  const downloads = useOS((s) => s.downloads)
  const { createInitiative, advanceInitiative, openChat } = useOS.getState()
  const goals = useHorizon((s) => s.goals)
  const { confidence, index } = useGraph()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [title, setTitle] = useState('')
  const [spark, setSpark] = useState('')
  const [fromDownload, setFromDownload] = useState('')
  const creating = params.get('new') === '1'
  const selectedId = params.get('id') ?? initiatives[0]?.id
  const it = useMemo(() => initiatives.find((i) => i.id === selectedId) ?? initiatives[0], [initiatives, selectedId])

  useEffect(() => {
    if (fromDownload) {
      const d = downloads.find((x) => x.id === fromDownload)
      if (d && d.kind !== 'drawing') setSpark(d.content)
    }
  }, [fromDownload, downloads])

  const stageIdx = it ? STAGES.indexOf(it.stage) : -1
  const pillar = it?.pillarId ? index.nodeById.get(it.pillarId) : undefined
  const goal = it?.goalId ? goals.find((g) => g.id === it.goalId) : undefined
  const itRuns = it ? runs.filter((r) => it.runIds.includes(r.id)) : []
  const itPieces = it ? pieces.filter((p) => it.pieceIds.includes(p.id)) : []
  const itBlocks = it ? blocks.filter((b) => it.blockIds.includes(b.id)) : []

  return (
    <div className="page page-wide">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Initiatives</h1>
          <p className="lede">
            An idea, all the way to an outcome. Spark it from a conversation or a drawing; the OS researches it,
            writes it as a belief, breaks it into pieces, costs it, launches agents, and puts the time on your day.
            Each stage leaves something you can open.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setParams(creating ? {} : { new: '1' })}>
          {creating ? 'Cancel' : 'New initiative'}
        </button>
      </div>

      {creating && (
        <section className="card stack stack-md" style={{ background: 'var(--paper-sunken)', marginBottom: 26 }}>
          <h3>What is the idea?</h3>
          <Field label="In a few words">
            <input className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Alternative sports" />
          </Field>
          <Field label="Where it came from — the conversation, the thing you saw, the itch">
            <textarea className="textarea" value={spark} onChange={(e) => setSpark(e.target.value)} placeholder="A conversation with a friend about how everyone under forty plays pickleball and nobody watches the NBA." />
          </Field>
          {downloads.length > 0 && (
            <Field label="Or start from a download">
              <select className="select" value={fromDownload} onChange={(e) => setFromDownload(e.target.value)}>
                <option value="">—</option>
                {downloads.map((d) => (
                  <option key={d.id} value={d.id}>{d.kind === 'drawing' ? 'A drawing' : d.content.slice(0, 80)}</option>
                ))}
              </select>
            </Field>
          )}
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!title.trim()}
              onClick={() => {
                const id = createInitiative(title.trim(), spark.trim() || 'No spark written down.', fromDownload || undefined)
                setTitle('')
                setSpark('')
                setFromDownload('')
                setParams({ id })
                toast({ text: 'Captured. Advance it when you are ready — Planner starts researching.' })
              }}
            >
              Capture it
            </button>
          </div>
        </section>
      )}

      <div className="desk is-map">
        <div className="stack stack-md">
          {it ? (
            <>
              <section className="card stack stack-md">
                <div className="row row-between row-wrap" style={{ gap: 10 }}>
                  <div>
                    <span className="label">{STAGE_LABEL[it.stage]} · since {formatDate(it.updatedAt)}</span>
                    <h2 style={{ marginTop: 4 }}>{it.title}</h2>
                  </div>
                  {it.stage !== 'monitor' && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => {
                        advanceInitiative(it.id)
                        toast({ text: `${it.title}: ${STAGE_LABEL[STAGES[stageIdx + 1]]}.` })
                      }}
                    >
                      Advance to {STAGE_LABEL[STAGES[stageIdx + 1]]}
                    </button>
                  )}
                </div>
                <p className="prose" style={{ margin: 0, maxWidth: '64ch' }}>{it.spark}</p>

                <ol className="pipeline">
                  {STAGES.map((st, k) => {
                    const state = k < stageIdx ? 'done' : k === stageIdx ? 'now' : 'todo'
                    const ev = it.history.find((h) => h.stage === st)
                    return (
                      <li key={st} className={`pipe is-${state}`}>
                        <span className="pipe-dot" />
                        <div className="stack" style={{ gap: 2 }}>
                          <span style={{ fontWeight: 500, fontSize: 14 }}>{STAGE_LABEL[st]}</span>
                          <span className="meta">{ev?.text ?? STAGE_HINT[st]}</span>
                          {ev && <span className="meta" style={{ color: 'var(--ink-4)' }}>{formatDate(ev.at)}</span>}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </section>

              <section className="card stack stack-sm">
                <span className="label">What it has produced</span>
                {pillar && (
                  <div className="row row-between" style={{ fontSize: 14 }}>
                    <span>Belief: <Link to={`/beliefs/${pillar.id}`}>{pillar.label}</Link></span>
                    <span className="num meta">confidence {(confidence[pillar.id] ?? 50).toFixed(0)}</span>
                  </div>
                )}
                {goal && (
                  <div className="row row-between" style={{ fontSize: 14 }}>
                    <span>Goal: <Link to={`/goals/${goal.id}`}>{goal.title}</Link></span>
                    <span className="num meta">{formatUsd(goal.targetUsd)}</span>
                  </div>
                )}
                {itPieces.map((p) => (
                  <div key={p.id} className="row row-between" style={{ fontSize: 14 }}>
                    <span>Piece: <Link to="/journey">{p.title}</Link></span>
                    <span className="meta">{p.status}</span>
                  </div>
                ))}
                {itRuns.map((r) => {
                  const ag = agents.find((a) => a.id === r.agentId)
                  return (
                    <div key={r.id} className="row row-between" style={{ fontSize: 14, gap: 8 }}>
                      <span className="row" style={{ gap: 6 }}>{ag && <Glyph size={14} hue={ag.hue} />}Run: <Link to="/agents">{r.title}</Link></span>
                      <span className="meta">{r.status.replace('_', ' ')}</span>
                    </div>
                  )
                })}
                {itBlocks.map((b) => (
                  <div key={b.id} className="row row-between" style={{ fontSize: 14 }}>
                    <span>Time: {b.title}</span>
                    <span className="meta">{b.day} {b.start} · {b.minutes}m</span>
                  </div>
                ))}
                {!pillar && !goal && itPieces.length === 0 && itRuns.length === 0 && <p className="meta" style={{ margin: 0 }}>Nothing yet. Advance it.</p>}
                <div className="row" style={{ gap: 6, paddingTop: 6 }}>
                  <button type="button" className="btn btn-sm" onClick={() => openChat('ag-planner')}>Talk to Planner about it</button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => openChat('ag-horizon')}>Ask Horizon</button>
                </div>
              </section>
            </>
          ) : (
            <div className="empty">
              <h4>No initiatives yet</h4>
              <span className="meta">Capture one from a conversation, a drawing, or the palette (⌘K, then just type it).</span>
            </div>
          )}
        </div>

        <div className="stack stack-sm">
          <span className="label">All initiatives</span>
          {initiatives.map((i) => (
            <button key={i.id} type="button" className={`card stack stack-xs${it?.id === i.id ? ' is-selected' : ''}`} style={{ textAlign: 'left', cursor: 'pointer', padding: '14px 16px', borderColor: it?.id === i.id ? 'var(--accent)' : undefined }} onClick={() => setParams({ id: i.id })}>
              <div className="row row-between"><span style={{ fontWeight: 500 }}>{i.title}</span><span className="meta">{STAGE_LABEL[i.stage]}</span></div>
              <div className="stage-dots">{STAGES.map((st, k) => <span key={st} className={`stage-dot${k <= STAGES.indexOf(i.stage) ? ' is-on' : ''}`} />)}</div>
            </button>
          ))}
          <div className="card stack stack-xs" style={{ background: 'var(--paper-sunken)' }}>
            <span className="label">How it runs</span>
            <p className="meta" style={{ margin: 0, lineHeight: 1.55 }}>
              Advance moves one stage and does the real thing: a research run to Planner; a pillar on the belief map;
              pieces on the journey; a costed goal with a roadmap run; runs to Ledger and Desk plus time on the day.
              Everything that touches money waits in the queue.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
