import { useState } from 'react'
import Glyph from '../../components/Glyph'
import { formatDate, relativeTime } from '../../components/ui'
import { SCOPE_LABEL } from '../../os/agents'
import type { Scope } from '../../os/types'
import { useOS } from '../../store/useOS'

const ALL_SCOPES = Object.keys(SCOPE_LABEL) as Scope[]

/**
 * The orchestration layer, visible. Who exists, what each may touch, and every
 * run with its steps. Personal and company scopes are separate keys — same
 * infrastructure, different permissions.
 */
export default function AgentsScreen() {
  const agents = useOS((s) => s.agents)
  const runs = useOS((s) => s.runs)
  const { setScope, setAgentEnabled, decideRun, openChat } = useOS.getState()
  const [tab, setTab] = useState<'runs' | 'agents'>('runs')
  const awaiting = runs.filter((r) => r.status === 'awaiting_review')

  return (
    <div className="page" style={{ maxWidth: 1000 }}>
      <div className="page-head">
        <div className="page-head-text">
          <h1>Agents</h1>
          <p className="lede">
            The infrastructure under everything. Each agent is a role with a scope. Runs are the work they do, step by
            step, with a human review gate on anything that moves money or changes a plan.
          </p>
        </div>
      </div>

      <div className="segmented" style={{ marginBottom: 22 }}>
        <button type="button" aria-pressed={tab === 'runs'} onClick={() => setTab('runs')}>
          Runs {awaiting.length ? <span className="num" style={{ opacity: 0.6 }}>{awaiting.length} waiting</span> : null}
        </button>
        <button type="button" aria-pressed={tab === 'agents'} onClick={() => setTab('agents')}>
          Agents & permissions
        </button>
      </div>

      {tab === 'runs' && (
        <div className="stack stack-md">
          {[...runs]
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .map((r) => {
              const ag = agents.find((a) => a.id === r.agentId)
              return (
                <article key={r.id} className="card stack stack-sm">
                  <div className="row row-between row-wrap" style={{ gap: 10 }}>
                    <div className="row" style={{ gap: 10 }}>
                      {ag && <Glyph size={22} hue={ag.hue} active={r.status === 'running'} />}
                      <div>
                        <div style={{ fontWeight: 500 }}>{r.title}</div>
                        <div className="meta">
                          {ag?.name} · {r.status.replace('_', ' ')} · {relativeTime(r.updatedAt)}
                        </div>
                      </div>
                    </div>
                    {r.status === 'awaiting_review' && (
                      <div className="row" style={{ gap: 6 }}>
                        <button type="button" className="btn btn-sm btn-primary" onClick={() => decideRun(r.id, true)}>
                          Approve
                        </button>
                        <button type="button" className="btn btn-sm" onClick={() => decideRun(r.id, false)}>
                          Reject
                        </button>
                        <button type="button" className="btn btn-sm btn-ghost" onClick={() => openChat(r.agentId, r.threadId)}>
                          Discuss
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="prose-sm" style={{ margin: 0 }}>
                    {r.intent}
                  </p>
                  <div className="run-steps">
                    {r.steps.map((s) => (
                      <span key={s.id} className={`run-step ${s.status}`} />
                    ))}
                  </div>
                  <ol style={{ margin: 0, paddingLeft: 18 }} className="stack stack-xs">
                    {r.steps.map((s) => (
                      <li key={s.id} className="meta" style={{ color: s.status === 'done' ? 'var(--ink-2)' : s.status === 'doing' ? 'var(--accent)' : undefined }}>
                        {s.label}
                        {s.log ? ` — ${s.log}` : ''}
                        {s.status === 'doing' ? ' …' : ''}
                      </li>
                    ))}
                  </ol>
                </article>
              )
            })}
        </div>
      )}

      {tab === 'agents' && (
        <div className="grid-2">
          {agents.map((a) => (
            <article key={a.id} className="card stack stack-sm">
              <div className="row row-between">
                <div className="row" style={{ gap: 10 }}>
                  <Glyph size={26} hue={a.hue} />
                  <div>
                    <div style={{ fontWeight: 500 }}>{a.name}</div>
                    <div className="meta">{a.role}</div>
                  </div>
                </div>
                <button type="button" role="switch" aria-checked={a.enabled} className="switch" onClick={() => setAgentEnabled(a.id, !a.enabled)} aria-label={`${a.name} enabled`} />
              </div>
              <p className="meta" style={{ margin: 0 }}>
                {a.greeting}
              </p>
              <div className="stack" style={{ paddingTop: 4 }}>
                <span className="label" style={{ paddingBottom: 4 }}>
                  May touch
                </span>
                {ALL_SCOPES.map((sc) => (
                  <div key={sc} className="scope-row">
                    <span style={{ color: sc.startsWith('company') ? 'var(--ink-2)' : undefined }}>
                      <span className="mono" style={{ color: 'var(--ink-4)', marginRight: 6 }}>
                        {sc.split('.')[0]}
                      </span>
                      {SCOPE_LABEL[sc]}
                    </span>
                    <button type="button" role="switch" aria-checked={a.scopes.includes(sc)} className="switch" onClick={() => setScope(a.id, sc, !a.scopes.includes(sc))} aria-label={SCOPE_LABEL[sc]} />
                  </div>
                ))}
              </div>
              <div className="meta">
                Tools: {a.tools.map((t) => t.label.toLowerCase() + (t.needsReview ? ' (reviewed)' : '')).join('; ')}.
              </div>
              <div className="meta">Since {formatDate('2026-06-01T00:00:00Z')}</div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
