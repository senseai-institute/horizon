import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ConfirmButton, formatDate, relativeTime } from '../../components/ui'
import type { Doc, Sheet } from '../../os/types'
import { useOS } from '../../store/useOS'

const KIND_LABEL: Record<Doc['kind'], string> = { note: 'Note', spec: 'Spec', research: 'Research', 'model-card': 'Model card', disclosure: 'Invention record' }

/**
 * Docs and sheets, in the same place as everything else. Plain text with
 * headings; tables with a total row. Attached to initiatives, so the spec,
 * the research, the cost and the invention record live with the work.
 */
export default function DocsScreen() {
  const docs = useOS((s) => s.docs)
  const sheets = useOS((s) => s.sheets)
  const initiatives = useOS((s) => s.initiatives)
  const { saveDoc, deleteDoc, saveSheet } = useOS.getState()
  const [params, setParams] = useSearchParams()
  const filter = params.get('initiative')
  const items = useMemo(() => {
    const d = docs.filter((x) => !filter || x.initiativeId === filter).map((x) => ({ type: 'doc' as const, id: x.id, title: x.title, at: x.updatedAt, initiativeId: x.initiativeId, sub: KIND_LABEL[x.kind] }))
    const s = sheets.filter((x) => !filter || x.initiativeId === filter).map((x) => ({ type: 'sheet' as const, id: x.id, title: x.title, at: x.updatedAt, initiativeId: x.initiativeId, sub: 'Sheet' }))
    return [...d, ...s].sort((a, b) => b.at.localeCompare(a.at))
  }, [docs, sheets, filter])
  const selId = params.get('id') ?? items[0]?.id
  const doc = docs.find((d) => d.id === selId)
  const sheet = sheets.find((s) => s.id === selId)
  const titleOf = (id?: string) => initiatives.find((i) => i.id === id)?.title

  return (
    <div className="page page-wide">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Docs</h1>
          <p className="lede">Specs, research, model cards, cost tables, invention records — with the initiative they belong to, not in five other apps.</p>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button type="button" className="btn" onClick={() => { const id = saveDoc({ title: 'Untitled', body: '', kind: 'note', initiativeId: filter ?? undefined }); setParams({ ...(filter ? { initiative: filter } : {}), id }) }}>New doc</button>
          <button type="button" className="btn" onClick={() => { const id = saveSheet({ title: 'Untitled sheet', columns: ['Line', 'Amount'], numeric: [false, true], rows: [['', 0]], initiativeId: filter ?? undefined }); setParams({ ...(filter ? { initiative: filter } : {}), id }) }}>New sheet</button>
        </div>
      </div>
      <div className="row row-wrap" style={{ gap: 6, marginBottom: 18 }}>
        <button type="button" className={`btn btn-sm${!filter ? ' btn-primary' : ''}`} onClick={() => setParams({})}>All</button>
        {initiatives.map((i) => <button key={i.id} type="button" className={`btn btn-sm${filter === i.id ? ' btn-primary' : ''}`} onClick={() => setParams({ initiative: i.id })}>{i.title}</button>)}
      </div>
      <div className="desk" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2.2fr)' }}>
        <div className="stack stack-xs">
          {items.map((it) => (
            <button key={it.id} type="button" className="card stack" style={{ textAlign: 'left', cursor: 'pointer', padding: '10px 14px', gap: 2, borderColor: selId === it.id ? 'var(--accent)' : undefined }} onClick={() => setParams({ ...(filter ? { initiative: filter } : {}), id: it.id })}>
              <span style={{ fontWeight: 500, fontSize: 14 }}>{it.title}</span>
              <span className="meta">{it.sub} · {relativeTime(it.at)}{it.initiativeId ? ` · ${titleOf(it.initiativeId)}` : ''}</span>
            </button>
          ))}
          {items.length === 0 && <p className="meta">Nothing here yet.</p>}
        </div>
        <div>
          {doc && <DocEditor key={doc.id} doc={doc} onSave={(patch) => saveDoc({ ...doc, ...patch })} onDelete={() => { deleteDoc(doc.id); setParams(filter ? { initiative: filter } : {}) }} />}
          {sheet && <SheetEditor key={sheet.id} sheet={sheet} onSave={(patch) => saveSheet({ ...sheet, ...patch })} />}
          {!doc && !sheet && <div className="empty"><span className="meta">Pick something, or make one.</span></div>}
        </div>
      </div>
    </div>
  )
}

function DocEditor({ doc, onSave, onDelete }: { doc: Doc; onSave: (p: Partial<Doc>) => void; onDelete: () => void }) {
  const [title, setTitle] = useState(doc.title)
  const [body, setBody] = useState(doc.body)
  const [kind, setKind] = useState(doc.kind)
  const dirty = title !== doc.title || body !== doc.body || kind !== doc.kind
  useEffect(() => {
    if (!dirty) return
    const t = setTimeout(() => onSave({ title, body, kind }), 600)
    return () => clearTimeout(t)
  }, [title, body, kind, dirty, onSave])
  return (
    <section className="card stack stack-sm">
      <div className="row row-between row-wrap" style={{ gap: 8 }}>
        <input className="input" style={{ fontFamily: 'var(--serif)', fontSize: 22, border: 0, padding: 0, background: 'transparent', flex: 1, minWidth: 200 }} value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
        <select className="select" style={{ width: 'auto' }} value={kind} onChange={(e) => setKind(e.target.value as Doc['kind'])}>
          {(Object.keys(KIND_LABEL) as Doc['kind'][]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </select>
      </div>
      <textarea className="textarea doc-body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="# A heading&#10;Then the text." />
      <div className="row row-between">
        <span className="meta">{dirty ? 'Saving…' : `Saved ${relativeTime(doc.updatedAt)} · created ${formatDate(doc.createdAt)}`}</span>
        {doc.kind !== 'disclosure' && <ConfirmButton confirmLabel="Delete the doc" onConfirm={onDelete}>Delete</ConfirmButton>}
        {doc.kind === 'disclosure' && <span className="meta">Invention records are not deleted.</span>}
      </div>
    </section>
  )
}

function SheetEditor({ sheet, onSave }: { sheet: Sheet; onSave: (p: Partial<Sheet>) => void }) {
  const [rows, setRows] = useState(sheet.rows)
  const [title, setTitle] = useState(sheet.title)
  useEffect(() => {
    const t = setTimeout(() => { if (rows !== sheet.rows || title !== sheet.title) onSave({ rows, title }) }, 600)
    return () => clearTimeout(t)
  }, [rows, title, sheet.rows, sheet.title, onSave])
  const set = (r: number, c: number, v: string) => setRows((rs) => rs.map((row, i) => (i === r ? row.map((cell, j) => (j === c ? (sheet.numeric[c] ? Number(v) || 0 : v) : cell)) : row)))
  const totals = sheet.columns.map((_, c) => (sheet.numeric[c] ? rows.reduce((a, r) => a + Number(r[c] || 0), 0) : null))
  return (
    <section className="card stack stack-sm">
      <input className="input" style={{ fontFamily: 'var(--serif)', fontSize: 22, border: 0, padding: 0, background: 'transparent' }} value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
      <div className="scroll-x">
        <table className="table sheet">
          <thead><tr>{sheet.columns.map((c, i) => <th key={i} className={sheet.numeric[i] ? 'right' : undefined}>{c}</th>)}<th /></tr></thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} className={sheet.numeric[c] ? 'right' : undefined}>
                    <input className={`cell${sheet.numeric[c] ? ' num right' : ''}`} value={String(cell)} inputMode={sheet.numeric[c] ? 'decimal' : undefined} onChange={(e) => set(r, c, e.target.value)} />
                  </td>
                ))}
                <td><button type="button" className="btn btn-sm btn-ghost" aria-label="Remove row" onClick={() => setRows((rs) => rs.filter((_, i) => i !== r))}>×</button></td>
              </tr>
            ))}
            <tr>
              {totals.map((t, i) => <td key={i} className={sheet.numeric[i] ? 'right num' : 'label'} style={{ fontWeight: 500 }}>{t === null ? (i === 0 ? 'Total' : '') : t.toLocaleString('en-US')}</td>)}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <div className="row row-between">
        <button type="button" className="btn btn-sm" onClick={() => setRows((rs) => [...rs, sheet.columns.map((_, c) => (sheet.numeric[c] ? 0 : ''))])}>Add a row</button>
        <span className="meta">Saved {relativeTime(sheet.updatedAt)}</span>
      </div>
    </section>
  )
}
