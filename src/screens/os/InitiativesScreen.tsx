import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Glyph from '../../components/Glyph'
import { useToast } from '../../components/Toast'
import { ConfirmButton, Field, formatDate, formatUsd } from '../../components/ui'
import { STAGE_KINDS, stageMeta, workflowById, type StageKind, type Workflow, type WorkflowStage } from '../../os/workflows'
import { useGraph } from '../../store/derived'
import { useHorizon } from '../../store/useHorizon'
import { allWorkflows, useOS } from '../../store/useOS'

/**
 * Initiatives run on workflows. A workflow is an explicit list of stages;
 * each stage kind has one executor that does the real thing. Two built-ins
 * ship — Idea → Product and Idea → Thesis → Trade → Monitor — and the
 * designer below assembles new ones from the same stage kinds.
 */
export default function InitiativesScreen() {
  const initiatives = useOS((s) => s.initiatives)
  const custom = useOS((s) => s.workflows)
  const runs = useOS((s) => s.runs)
  const pieces = useOS((s) => s.pieces)
  const blocks = useOS((s) => s.blocks)
  const agents = useOS((s) => s.agents)
  const downloads = useOS((s) => s.downloads)
  const { createInitiative, advanceInitiative, openChat } = useOS.getState()
  const goals = useHorizon((s) => s.goals)
  const sleeves = useHorizon((s) => s.sleeves)
  const { confidence, index } = useGraph()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const workflows = useMemo(() => allWorkflows(custom), [custom])
  const tab = params.get('tab') === 'workflows' ? 'workflows' : 'initiatives'
  const creating = params.get('new') === '1'
  const selectedId = params.get('id') ?? initiatives[0]?.id
  const it = useMemo(() => initiatives.find((i) => i.id === selectedId) ?? initiatives[0], [initiatives, selectedId])
  const wf = it ? workflowById(workflows, it.workflowId) : undefined

  const [title, setTitle] = useState('')
  const [spark, setSpark] = useState('')
  const [fromDownload, setFromDownload] = useState('')
  const [wfChoice, setWfChoice] = useState(workflows[0]?.id ?? '')
  useEffect(() => {
    if (fromDownload) {
      const d = downloads.find((x) => x.id === fromDownload)
      if (d && d.kind !== 'drawing') setSpark(d.content)
    }
  }, [fromDownload, downloads])

  const pillar = it?.pillarId ? index.nodeById.get(it.pillarId) : undefined
  const goal = it?.goalId ? goals.find((g) => g.id === it.goalId) : undefined
  const sleeve = it?.sleeveId ? sleeves.find((s) => s.id === it.sleeveId) : undefined
  const itRuns = it ? runs.filter((r) => it.runIds.includes(r.id)) : []
  const itPieces = it ? pieces.filter((p) => it.pieceIds.includes(p.id)) : []
  const itBlocks = it ? blocks.filter((b) => it.blockIds.includes(b.id)) : []
  const nextStage = wf && it ? wf.stages[it.stageIndex + 1] : undefined
  const label = (st: WorkflowStage) => st.label ?? stageMeta(st.kind).label

  return (
    <div className="page page-wide">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Initiatives</h1>
          <p className="lede">
            An idea, run on an explicit workflow to an outcome. Each stage does something real — a research run, a
            belief on the map, a sleeve, prepared orders, time on the day — and leaves something you can open.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div className="segmented">
            <button type="button" aria-pressed={tab === 'initiatives'} onClick={() => setParams({})}>Initiatives</button>
            <button type="button" aria-pressed={tab === 'workflows'} onClick={() => setParams({ tab: 'workflows' })}>Workflows</button>
          </div>
          {tab === 'initiatives' && (
            <button type="button" className="btn btn-primary" onClick={() => setParams(creating ? {} : { new: '1' })}>
              {creating ? 'Cancel' : 'New initiative'}
            </button>
          )}
        </div>
      </div>

      {tab === 'workflows' && <WorkflowsTab workflows={workflows} />}

      {tab === 'initiatives' && creating && (
        <section className="card stack stack-md" style={{ background: 'var(--paper-sunken)', marginBottom: 26 }}>
          <h3>What is the idea, and which way does it go?</h3>
          <div className="field">
            <span className="label">Workflow</span>
            <div className="grid-3">
              {workflows.map((w) => (
                <button key={w.id} type="button" className="card stack stack-xs" style={{ textAlign: 'left', cursor: 'pointer', padding: '12px 14px', borderColor: wfChoice === w.id ? 'var(--accent)' : 'var(--rule)', background: wfChoice === w.id ? 'var(--accent-soft)' : 'var(--paper-raised)' }} onClick={() => setWfChoice(w.id)}>
                  <span style={{ fontWeight: 500 }}>{w.name}</span>
                  <span className="meta">{w.stages.map(label).join(' → ')}</span>
                </button>
              ))}
            </div>
          </div>
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
                {downloads.map((d) => <option key={d.id} value={d.id}>{d.kind === 'drawing' ? 'A drawing' : d.content.slice(0, 80)}</option>)}
              </select>
            </Field>
          )}
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!title.trim() || !wfChoice}
              onClick={() => {
                const id = createInitiative(wfChoice, title.trim(), spark.trim() || 'No spark written down.', fromDownload || undefined)
                setTitle(''); setSpark(''); setFromDownload('')
                setParams({ id })
                toast({ text: 'Captured. Advance it when you are ready.' })
              }}
            >
              Capture it
            </button>
          </div>
        </section>
      )}

      {tab === 'initiatives' && (
        <div className="desk is-map">
          <div className="stack stack-md">
            {it && wf ? (
              <>
                <section className="card stack stack-md">
                  <div className="row row-between row-wrap" style={{ gap: 10 }}>
                    <div>
                      <span className="label">{wf.name} · {label(wf.stages[it.stageIndex])} · since {formatDate(it.updatedAt)}</span>
                      <h2 style={{ marginTop: 4 }}>{it.title}</h2>
                    </div>
                    {nextStage && (
                      <button type="button" className="btn btn-primary" onClick={() => { advanceInitiative(it.id); toast({ text: `${it.title}: ${label(nextStage)}.` }) }}>
                        Advance to {label(nextStage)}
                      </button>
                    )}
                  </div>
                  <p className="prose" style={{ margin: 0, maxWidth: '64ch' }}>{it.spark}</p>
                  <ol className="pipeline">
                    {wf.stages.map((st, k) => {
                      const state = k < it.stageIndex ? 'done' : k === it.stageIndex ? 'now' : 'todo'
                      const ev = it.history.find((h) => h.stage === st.id)
                      const meta = stageMeta(st.kind)
                      return (
                        <li key={st.id} className={`pipe is-${state}`}>
                          <span className="pipe-dot" />
                          <div className="stack" style={{ gap: 2 }}>
                            <span style={{ fontWeight: 500, fontSize: 14 }}>{label(st)}{meta.gated ? <span className="meta" title="Always waits on the review queue"> · reviewed</span> : null}</span>
                            <span className="meta">{ev?.text ?? meta.does}</span>
                            {ev && <span className="meta" style={{ color: 'var(--ink-4)' }}>{formatDate(ev.at)}</span>}
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                  <p className="meta" style={{ margin: 0 }}>Outcome: {wf.outcome}</p>
                </section>

                <section className="card stack stack-sm">
                  <span className="label">What it has produced</span>
                  {pillar && <div className="row row-between" style={{ fontSize: 14 }}><span>Belief: <Link to={`/beliefs/${pillar.id}`}>{pillar.label}</Link></span><span className="num meta">confidence {(confidence[pillar.id] ?? 50).toFixed(0)}</span></div>}
                  {goal && <div className="row row-between" style={{ fontSize: 14 }}><span>Goal: <Link to={`/goals/${goal.id}`}>{goal.title}</Link></span><span className="num meta">{formatUsd(goal.targetUsd)}</span></div>}
                  {sleeve && <div className="row row-between" style={{ fontSize: 14 }}><span>Sleeve: <Link to="/money">{sleeve.name}</Link></span><span className="num meta">{sleeve.targetPct}% · exit below {sleeve.exitBelow}</span></div>}
                  {itPieces.map((p) => <div key={p.id} className="row row-between" style={{ fontSize: 14 }}><span>Piece: <Link to="/journey">{p.title}</Link></span><span className="meta">{p.status}</span></div>)}
                  {itRuns.map((r) => {
                    const ag = agents.find((a) => a.id === r.agentId)
                    return <div key={r.id} className="row row-between" style={{ fontSize: 14, gap: 8 }}><span className="row" style={{ gap: 6 }}>{ag && <Glyph size={14} hue={ag.hue} />}<span>Run: <Link to="/agents">{r.title}</Link></span></span><span className="meta">{r.status.replace('_', ' ')}</span></div>
                  })}
                  {itBlocks.map((b) => <div key={b.id} className="row row-between" style={{ fontSize: 14 }}><span>Time: {b.title}</span><span className="meta">{b.day} {b.start} · {b.minutes}m</span></div>)}
                  {!pillar && !goal && !sleeve && itPieces.length === 0 && itRuns.length === 0 && <p className="meta" style={{ margin: 0 }}>Nothing yet. Advance it.</p>}
                  <div className="row" style={{ gap: 6, paddingTop: 6 }}>
                    <button type="button" className="btn btn-sm" onClick={() => openChat('ag-planner')}>Talk to Planner about it</button>
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => openChat('ag-horizon')}>Ask Horizon</button>
                  </div>
                </section>
              </>
            ) : (
              <div className="empty"><h4>No initiatives yet</h4><span className="meta">Capture one, or say it to the palette (⌘K).</span></div>
            )}
          </div>

          <div className="stack stack-sm">
            <span className="label">All initiatives</span>
            {initiatives.map((i) => {
              const w = workflowById(workflows, i.workflowId)
              return (
                <button key={i.id} type="button" className="card stack stack-xs" style={{ textAlign: 'left', cursor: 'pointer', padding: '14px 16px', borderColor: it?.id === i.id ? 'var(--accent)' : undefined }} onClick={() => setParams({ id: i.id })}>
                  <div className="row row-between"><span style={{ fontWeight: 500 }}>{i.title}</span><span className="meta">{w ? label(w.stages[i.stageIndex]) : ''}</span></div>
                  <div className="stage-dots">{(w?.stages ?? []).map((st, k) => <span key={st.id} className={`stage-dot${k <= i.stageIndex ? ' is-on' : ''}`} title={label(st)} />)}</div>
                  <span className="meta">{w?.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/** Built-ins on the left; the designer on the right assembles a new one from stage kinds. */
function WorkflowsTab({ workflows }: { workflows: Workflow[] }) {
  const { saveWorkflow, deleteWorkflow } = useOS.getState()
  const toast = useToast()
  const [name, setName] = useState('')
  const [blurb, setBlurb] = useState('')
  const [outcome, setOutcome] = useState('')
  const [stages, setStages] = useState<WorkflowStage[]>([{ id: 'spark', kind: 'spark' }])
  const add = (kind: StageKind) => setStages((s) => [...s, { id: `${kind}-${s.length}`, kind }])
  const remove = (i: number) => setStages((s) => s.filter((_, k) => k !== i))
  const move = (i: number, d: -1 | 1) => setStages((s) => { const n = [...s]; const j = i + d; if (j < 0 || j >= n.length) return s; [n[i], n[j]] = [n[j], n[i]]; return n })
  const label = (st: WorkflowStage) => st.label ?? stageMeta(st.kind).label

  return (
    <div className="desk is-even">
      <div className="stack stack-md">
        {workflows.map((w) => (
          <section key={w.id} className="card stack stack-sm">
            <div className="row row-between row-wrap" style={{ gap: 8 }}>
              <h3>{w.name}</h3>
              {w.builtin ? <span className="chip chip-outline">built in</span> : <ConfirmButton className="btn btn-sm btn-ghost" confirmLabel="Delete it" onConfirm={() => deleteWorkflow(w.id)}>Delete</ConfirmButton>}
            </div>
            <p className="prose-sm" style={{ margin: 0 }}>{w.blurb}</p>
            <ol className="stack stack-xs" style={{ margin: 0, paddingLeft: 18 }}>
              {w.stages.map((st) => {
                const m = stageMeta(st.kind)
                return <li key={st.id} style={{ fontSize: 13.5 }}><span style={{ fontWeight: 500 }}>{label(st)}</span> <span className="meta">— {m.does}{m.gated ? ' Reviewed.' : ''}</span></li>
              })}
            </ol>
            <p className="meta" style={{ margin: 0 }}>Outcome: {w.outcome}</p>
          </section>
        ))}
      </div>

      <section className="card stack stack-md" style={{ background: 'var(--paper-sunken)', position: 'sticky', top: 16 }}>
        <h3>Design a workflow</h3>
        <Field label="Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Idea → Newsletter" /></Field>
        <Field label="What it is for"><input className="input" value={blurb} onChange={(e) => setBlurb(e.target.value)} placeholder="Something you want to publish every week." /></Field>
        <Field label="What you end up with"><input className="input" value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="An issue out, and a decision about the next." /></Field>
        <div className="field">
          <span className="label">Stages, in order</span>
          <ol className="stack stack-xs" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {stages.map((st, i) => (
              <li key={`${st.id}-${i}`} className="row" style={{ gap: 8, fontSize: 13.5 }}>
                <span className="mono meta" style={{ width: 18 }}>{i + 1}</span>
                <span style={{ flex: 1 }}>{label(st)} <span className="meta">— {stageMeta(st.kind).produces}</span></span>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => move(i, -1)} aria-label="Up">↑</button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => move(i, 1)} aria-label="Down">↓</button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => remove(i)} aria-label="Remove">×</button>
              </li>
            ))}
          </ol>
        </div>
        <div className="field">
          <span className="label">Add a stage</span>
          <div className="row row-wrap" style={{ gap: 6 }}>
            {STAGE_KINDS.map((k) => <button key={k.kind} type="button" className="btn btn-sm" title={k.does} onClick={() => add(k.kind)}>{k.label}</button>)}
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!name.trim() || stages.length < 2}
          onClick={() => {
            saveWorkflow({ name: name.trim(), blurb: blurb.trim(), outcome: outcome.trim(), stages: stages.map((st, i) => ({ ...st, id: `${st.kind}-${i}` })) })
            toast({ text: `"${name.trim()}" is a workflow. It is a choice on every new initiative.` })
            setName(''); setBlurb(''); setOutcome(''); setStages([{ id: 'spark', kind: 'spark' }])
          }}
        >
          Save the workflow
        </button>
        <p className="meta" style={{ margin: 0 }}>Every stage kind has one executor. A new kind — "publish", "hire", "ship a PR" — is one case in the store and one connector in the runtime.</p>
      </section>
    </div>
  )
}
