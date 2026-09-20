import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Field } from '../../components/ui'
import { EVERYDAY_AREAS, STATUS_LABEL } from '../../os/everyday'
import type { EverydayItem } from '../../os/types'
import { useOS } from '../../store/useOS'

/**
 * Everyday. The list of workflows a whole life is made of, and whether this
 * is their home yet. It is the product roadmap kept inside the product:
 * identify each one, then knock them out one by one. Every one of them goes
 * through a connection so nothing is stuck inside someone else's app.
 */
export default function EverydayScreen() {
  const everyday = useOS((s) => s.everyday)
  const connections = useOS((s) => s.connections)
  const { setEverydayStatus, addEveryday, removeEveryday } = useOS.getState()
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [does, setDoes] = useState('')
  const [area, setArea] = useState<EverydayItem['area']>('Home')
  const built = everyday.filter((e) => e.status === 'built').length
  const next = everyday.filter((e) => e.status === 'next')
  const cxName = (id: string) => connections.find((c) => c.id === id)?.name ?? id
  const cxReady = (id: string) => connections.find((c) => c.id === id)?.status === 'ready'

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <div className="page-head">
        <div className="page-head-text">
          <h1>Everyday</h1>
          <p className="lede">
            Everything a day is made of, and whether Horizon is its home yet. The aim is one application: wake up and
            check it, add the to-do, give the cat her tablet, do the research, build the thing. Each row is a workflow
            to identify and then knock out — small ones are about the right interface, large ones are real work.
          </p>
        </div>
        <button type="button" className="btn" onClick={() => setAdding((v) => !v)}>{adding ? 'Cancel' : 'Add a workflow'}</button>
      </div>

      <div className="row row-wrap" style={{ gap: 18, marginBottom: 22 }}>
        <span className="meta"><span className="num" style={{ color: 'var(--ink)' }}>{built}</span> of {everyday.length} built</span>
        <span className="meta"><span className="num" style={{ color: 'var(--ink)' }}>{next.length}</span> next</span>
        <span className="meta">Principle: every source is a connection with an export. Nothing lives inside someone else’s product.</span>
      </div>

      {adding && (
        <section className="card stack stack-md" style={{ background: 'var(--paper-sunken)', marginBottom: 26 }}>
          <h3>A workflow that needs a home</h3>
          <div className="grid-2">
            <Field label="In a few words"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dog walking rota" /></Field>
            <Field label="Area">
              <select className="select" value={area} onChange={(e) => setArea(e.target.value as EverydayItem['area'])}>
                {EVERYDAY_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
          </div>
          <Field label="What the experience should be"><input className="input" value={does} onChange={(e) => setDoes(e.target.value)} placeholder="Who walks when, on the fridge; a nudge if nobody has by four." /></Field>
          <div>
            <button type="button" className="btn btn-primary" disabled={!title.trim()} onClick={() => { addEveryday({ area, title: title.trim(), does: does.trim(), status: 'next', needs: [] }); setTitle(''); setDoes(''); setAdding(false) }}>
              Add to the list
            </button>
          </div>
        </section>
      )}

      <div className="stack stack-lg">
        {EVERYDAY_AREAS.map((a) => {
          const items = everyday.filter((e) => e.area === a)
          if (!items.length) return null
          return (
            <section key={a} className="stack stack-sm">
              <h2 style={{ fontSize: 20 }}>{a}</h2>
              <div className="list-rules">
                {items.map((e) => (
                  <div key={e.id} className="row row-between row-wrap" style={{ gap: 10, padding: '10px 0' }}>
                    <div className="stack" style={{ gap: 3, flex: 1, minWidth: 240 }}>
                      <div className="row" style={{ gap: 8 }}>
                        <span style={{ fontWeight: 500, fontSize: 15 }}>{e.to && e.status === 'built' ? <Link to={e.to}>{e.title}</Link> : e.title}</span>
                        <span className={`chip ${e.status === 'built' ? 'chip-accent' : 'chip-outline'}`}>{STATUS_LABEL[e.status]}</span>
                      </div>
                      <span className="meta">{e.does}</span>
                      {e.needs.length > 0 && (
                        <span className="meta">
                          Needs {e.needs.map((n, i) => <span key={n}>{i > 0 ? ', ' : ''}<Link to="/connections" style={{ color: cxReady(n) ? 'var(--ink-3)' : 'var(--accent)' }}>{cxName(n)}</Link></span>)}
                        </span>
                      )}
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <div className="segmented">
                        {(['built', 'next', 'later'] as const).map((st) => (
                          <button key={st} type="button" aria-pressed={e.status === st} onClick={() => setEverydayStatus(e.id, st)}>{STATUS_LABEL[st]}</button>
                        ))}
                      </div>
                      {e.custom && <button type="button" className="btn btn-sm btn-ghost" onClick={() => removeEveryday(e.id)} aria-label="Remove">×</button>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
