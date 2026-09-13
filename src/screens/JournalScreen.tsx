import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Delta, EmptyState, formatDate, formatMonth } from '../components/ui'
import type { JournalType } from '../lib/types'
import { useGraph } from '../store/derived'
import { useHorizon } from '../store/useHorizon'

const TYPE_LABEL: Record<JournalType, string> = {
  belief: 'Belief',
  confidence: 'Confidence',
  evidence: 'Evidence',
  decision: 'Decision',
  discovery: 'Discovery',
  sleeve: 'Sleeve',
  note: 'Note',
}

const FILTERS: (JournalType | 'all')[] = ['all', 'belief', 'evidence', 'confidence', 'decision', 'discovery', 'sleeve', 'note']

export default function JournalScreen() {
  const journal = useHorizon((s) => s.journal)
  const addNote = useHorizon((s) => s.addNote)
  const { index } = useGraph()
  const [filter, setFilter] = useState<JournalType | 'all'>('all')
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState({ title: '', detail: '' })

  const groups = useMemo(() => {
    const rows = journal
      .filter((e) => (filter === 'all' ? true : e.type === filter))
      .slice()
      .sort((a, b) => b.at.localeCompare(a.at))
    const out: { month: string; entries: typeof rows }[] = []
    for (const e of rows) {
      const month = formatMonth(e.at)
      if (!out.length || out[out.length - 1].month !== month) out.push({ month, entries: [e] })
      else out[out.length - 1].entries.push(e)
    }
    return out
  }, [journal, filter])

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <div className="page-head">
        <div className="page-head-text">
          <h1>Journal</h1>
          <p className="lede">
            Everything that happened, in order. Beliefs written, passages attached, confidence moved, decisions
            approved and rejected. The point is to be able to look back in a year and see how your thinking
            actually changed.
          </p>
        </div>
        <button type="button" className="btn" onClick={() => setNoteOpen((v) => !v)}>
          {noteOpen ? 'Cancel' : 'Write a note'}
        </button>
      </div>

      {noteOpen && (
        <div className="card stack stack-sm" style={{ marginBottom: 26, background: 'var(--paper-sunken)' }}>
          <input
            className="input"
            placeholder="What is on your mind?"
            value={note.title}
            onChange={(e) => setNote({ ...note, title: e.target.value })}
          />
          <textarea
            className="textarea"
            placeholder="The longer version. Write it for the version of you reading this in a year."
            value={note.detail}
            onChange={(e) => setNote({ ...note, detail: e.target.value })}
          />
          <div className="row" style={{ gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!note.title.trim()}
              onClick={() => {
                addNote(note.title.trim(), note.detail.trim())
                setNote({ title: '', detail: '' })
                setNoteOpen(false)
              }}
            >
              Add to the journal
            </button>
          </div>
        </div>
      )}

      <div className="row row-wrap" style={{ gap: 6, marginBottom: 26 }}>
        <div className="segmented row-wrap">
          {FILTERS.map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'Everything' : TYPE_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState title="Nothing of that kind yet" />
      ) : (
        <div className="stack">
          {groups.map((g) => (
            <div key={g.month}>
              <div className="timeline-month label">{g.month}</div>
              <div className="timeline">
                {g.entries.map((e) => {
                  const node = e.nodeId ? index.nodeById.get(e.nodeId) : undefined
                  return (
                    <div key={e.id} className={`timeline-entry t-${e.type}`}>
                      <div className="row row-wrap" style={{ gap: 8, alignItems: 'baseline' }}>
                        <span className="chip chip-outline">{TYPE_LABEL[e.type]}</span>
                        <span className="meta">{formatDate(e.at)}</span>
                        {e.delta !== undefined && <Delta value={e.delta} />}
                      </div>
                      <h4 style={{ margin: '6px 0 4px', fontFamily: 'var(--serif)', fontSize: 17 }}>{e.title}</h4>
                      <p className="prose-sm" style={{ margin: 0, maxWidth: '64ch' }}>
                        {e.detail}
                      </p>
                      {node && (
                        <Link to={`/thesis/${node.id}`} className="link-button" style={{ fontSize: 12.5, marginTop: 6, display: 'inline-block' }}>
                          {node.label}
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
