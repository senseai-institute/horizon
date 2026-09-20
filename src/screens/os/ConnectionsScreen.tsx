import { CONNECTION_KIND_LABEL } from '../../os/connections'
import type { Connection } from '../../os/types'
import { useOS } from '../../store/useOS'

const STATUS_LABEL: Record<Connection['status'], string> = { ready: 'Ready', 'needs-setup': 'Needs setup', off: 'Off' }
const WHERE_LABEL: Record<Connection['where'], string> = { machine: 'On the machine', lan: 'On the network', internet: 'Internet · transactional' }

/**
 * Everything the OS can reach. Local things are always on; internet things
 * are transactional — each use is approved and logged — so the machine is
 * offline by default and still does the work.
 */
export default function ConnectionsScreen() {
  const connections = useOS((s) => s.connections)
  const agents = useOS((s) => s.agents)
  const blueprints = useOS((s) => s.blueprints)
  const initiatives = useOS((s) => s.initiatives)
  const setStatus = useOS((s) => s.setConnectionStatus)
  const groups: Connection['where'][] = ['machine', 'lan', 'internet']
  const neededBy = (cid: string) => blueprints.filter((b) => b.connections.includes(cid)).map((b) => initiatives.find((i) => i.id === b.initiativeId)?.title).filter(Boolean)

  return (
    <div className="page" style={{ maxWidth: 1060 }}>
      <div className="page-head">
        <div className="page-head-text">
          <h1>Connections</h1>
          <p className="lede">
            What the OS can reach, and on what terms. On the machine: always on, yours. On the internet:
            transactional — every use is a proposal, approved and logged — so the default is offline and the
            work still gets done.
          </p>
        </div>
      </div>
      <div className="row row-wrap" style={{ gap: 22, marginBottom: 24 }}>
        <span className="meta"><span className="num" style={{ color: 'var(--ink)' }}>{connections.filter((c) => c.status === 'ready').length}</span> ready</span>
        <span className="meta"><span className="num" style={{ color: 'var(--ink)' }}>{connections.filter((c) => c.status === 'needs-setup').length}</span> to set up</span>
        <span className="meta"><span className="num" style={{ color: 'var(--ink)' }}>{connections.filter((c) => c.transactional).length}</span> transactional</span>
      </div>
      {groups.map((g) => (
        <section key={g} className="stack stack-sm" style={{ marginBottom: 30 }}>
          <h3>{WHERE_LABEL[g]}</h3>
          <div className="stack">
            {connections.filter((c) => c.where === g).map((c) => {
              const needs = neededBy(c.id)
              return (
                <div key={c.id} className="row row-wrap" style={{ gap: 14, padding: '12px 0', borderBottom: '1px solid var(--rule)', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div className="row row-wrap" style={{ gap: 8 }}>
                      <span style={{ fontWeight: 500 }}>{c.name}</span>
                      <span className="chip chip-outline">{CONNECTION_KIND_LABEL[c.kind]}</span>
                      <span className="chip chip-outline">{c.scope}</span>
                      {c.transactional && <span className="chip">transactional</span>}
                    </div>
                    <div className="meta" style={{ marginTop: 4 }}>{c.gives}</div>
                    <div className="meta" style={{ marginTop: 2 }}>
                      {c.usedBy.length ? `Used by ${c.usedBy.map((a) => agents.find((x) => x.id === a)?.name ?? a).join(', ')}.` : ''}
                      {needs.length ? ` Needed by ${needs.join(', ')}.` : ''}
                    </div>
                  </div>
                  <div className="segmented">
                    {(['ready', 'needs-setup', 'off'] as Connection['status'][]).map((st) => (
                      <button key={st} type="button" aria-pressed={c.status === st} onClick={() => setStatus(c.id, st)}>{STATUS_LABEL[st]}</button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
      <p className="meta">A connection is one module in the runtime with three verbs: read, propose, apply. Status here is what the runtime would report; in this build it is a switch.</p>
    </div>
  )
}
