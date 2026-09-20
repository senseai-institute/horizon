import { useMemo, useState } from 'react'
import EvidenceCard from '../components/EvidenceCard'
import { EmptyState } from '../components/ui'
import { useGraph } from '../store/derived'
import { useHorizon } from '../store/useHorizon'

type Filter = 'all' | 'supports' | 'contradicts'

export default function EvidenceScreen() {
  const evidence = useHorizon((s) => s.evidence)
  const { index } = useGraph()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return evidence
      .filter((e) => (filter === 'all' ? true : e.stance === filter))
      .filter((e) => {
        if (!q) return true
        const target = index.nodeById.get(e.targetId)
        return (
          e.title.toLowerCase().includes(q) ||
          e.excerpt.toLowerCase().includes(q) ||
          e.source.company.toLowerCase().includes(q) ||
          e.source.form.toLowerCase().includes(q) ||
          (target?.label.toLowerCase().includes(q) ?? false)
        )
      })
      .sort((a, b) => b.source.filedAt.localeCompare(a.source.filedAt))
  }, [evidence, filter, query, index])

  const supports = evidence.filter((e) => e.stance === 'supports').length
  const contradicts = evidence.length - supports

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Evidence</h1>
          <p className="lede">
            Every passage in the notebook, in filing order. {supports} support what you believe and{' '}
            {contradicts} argue against it. Re-marking any one of them recomputes the whole map.
          </p>
        </div>
      </div>

      <div className="row row-wrap row-between" style={{ gap: 12, marginBottom: 22 }}>
        <div className="segmented">
          {(['all', 'supports', 'contradicts'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={f === 'supports' ? 'is-support' : f === 'contradicts' ? 'is-contradict' : undefined}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? `All ${evidence.length}` : f === 'supports' ? `Supporting ${supports}` : `Contradicting ${contradicts}`}
            </button>
          ))}
        </div>
        <input
          className="input"
          style={{ maxWidth: 320 }}
          placeholder="Search passages, filers and forms"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Nothing matches that">Try a filer name, a form type, or a phrase from a passage.</EmptyState>
      ) : (
        <div className="stack stack-sm">
          {rows.map((e) => (
            <EvidenceCard key={e.id} evidence={e} showTarget />
          ))}
        </div>
      )}
    </div>
  )
}
