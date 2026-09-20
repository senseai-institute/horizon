import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { confidenceColor } from '../lib/color'
import type { GraphNode } from '../lib/types'
import { useEvidenceFor, useGraph, useValuesView } from '../store/derived'
import { AlignPill } from '../screens/ValuesScreen'
import { alignmentWord } from '../lib/goals'
import { useHorizon } from '../store/useHorizon'
import AddEvidenceForm from './AddEvidenceForm'
import ConfidenceBreakdown from './ConfidenceBreakdown'
import EvidenceCard from './EvidenceCard'
import { IconPlus } from './icons'
import {
  ConfidenceGauge,
  ConfirmButton,
  EmptyState,
  Field,
  KindChip,
  SectionHead,
  formatDate,
} from './ui'

/**
 * Everything known about one node. Used full-page at /thesis/:id and inside the
 * drawer that opens when a node is clicked on the map, so the two can never
 * disagree.
 */
export default function NodeDetail({ node, compact = false }: { node: GraphNode; compact?: boolean }) {
  const { confidence, breakdowns, index } = useGraph()
  const evidence = useEvidenceFor(node.id)
  const updateNode = useHorizon((s) => s.updateNode)
  const archiveNode = useHorizon((s) => s.archiveNode)
  const restoreNode = useHorizon((s) => s.restoreNode)
  const setEdgeWeight = useHorizon((s) => s.setEdgeWeight)
  const willNotHold = useHorizon((s) => s.willNotHold)
  const toggleWillNotHold = useHorizon((s) => s.toggleWillNotHold)
  const valuesView = useValuesView()
  const alignment = node.kind === 'company' ? valuesView.byCompany[node.id] : undefined
  const banned = willNotHold.includes(node.id)

  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({
    claim: node.claim ?? '',
    horizonYears: node.horizonYears ?? 5,
    falsifiers: (node.falsifiers ?? []).join('\n'),
  })

  const value = confidence[node.id] ?? 50
  const breakdown = breakdowns[node.id]

  const parents = useMemo(
    () =>
      (index.parentEdges.get(node.id) ?? []).map((e) => ({
        edge: e,
        node: index.nodeById.get(e.to),
      })),
    [index, node.id],
  )
  const children = useMemo(
    () =>
      (index.childEdges.get(node.id) ?? [])
        .map((e) => ({ edge: e, node: index.nodeById.get(e.from) }))
        .sort((a, b) => (confidence[b.node?.id ?? ''] ?? 0) - (confidence[a.node?.id ?? ''] ?? 0)),
    [index, node.id, confidence],
  )

  const supporting = evidence.filter((e) => e.stance === 'supports')
  const contradicting = evidence.filter((e) => e.stance === 'contradicts')
  const isBelief = node.kind === 'pillar' || node.kind === 'thesis'

  const startEdit = () => {
    setDraft({
      claim: node.claim ?? '',
      horizonYears: node.horizonYears ?? 5,
      falsifiers: (node.falsifiers ?? []).join('\n'),
    })
    setEditing(true)
  }
  const saveEdit = () => {
    updateNode(node.id, {
      claim: draft.claim.trim(),
      horizonYears: draft.horizonYears,
      falsifiers: draft.falsifiers
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean),
    })
    setEditing(false)
  }

  return (
    <div className="stack stack-lg">
      {node.archived && (
        <div className="card-quiet row row-between row-wrap" style={{ gap: 12, background: 'var(--paper-sunken)' }}>
          <span className="prose-sm">
            Archived. It stays in the record but contributes nothing to anything above it.
          </span>
          <button type="button" className="btn btn-sm" onClick={() => restoreNode(node.id)}>
            Restore
          </button>
        </div>
      )}

      {/* ---------- header ---------- */}
      <header className="stack stack-sm">
        <div className="row row-wrap" style={{ gap: 8 }}>
          <KindChip kind={node.kind} />
          {node.ticker && (
            <span className="chip">
              <span className="num">{node.ticker}</span> · {node.exchange}
            </span>
          )}
          {node.marketCapB !== undefined && (
            <span className="chip chip-outline">
              <span className="num">${node.marketCapB.toLocaleString()}bn</span>
            </span>
          )}
          {node.sicCode && (
            <span className="chip chip-outline" title={node.sicLabel}>
              SIC <span className="num">{node.sicCode}</span>
            </span>
          )}
          <span className="meta" style={{ marginLeft: 'auto' }}>
            Added {formatDate(node.createdAt)}
          </span>
        </div>

        {!compact && <h1 style={{ maxWidth: '26ch' }}>{node.label}</h1>}
        {compact && <h2 style={{ maxWidth: '30ch' }}>{node.label}</h2>}

        <div className="row row-wrap" style={{ gap: 28, alignItems: 'flex-end', paddingTop: 6 }}>
          <ConfidenceGauge value={value} size="lg" />
          <div className="stack stack-xs">
            <span className="label">Evidence attached here</span>
            <span className="prose-sm">
              {evidence.length === 0 ? (
                'None yet.'
              ) : (
                <>
                  <span style={{ color: 'var(--support)' }}>{supporting.length} supporting</span>
                  {' · '}
                  <span style={{ color: 'var(--contradict)' }}>{contradicting.length} contradicting</span>
                </>
              )}
            </span>
          </div>
          {node.horizonYears !== undefined && (
            <div className="stack stack-xs">
              <span className="label">Time horizon</span>
              <span className="prose-sm num">{node.horizonYears} years</span>
            </div>
          )}
        </div>
      </header>

      {/* ---------- the claim ---------- */}
      <section className="stack stack-sm">
        <SectionHead
          title={isBelief ? 'The claim' : node.kind === 'company' ? 'What it does' : 'What this groups'}
          aside={
            isBelief && !editing ? (
              <button type="button" className="btn btn-sm btn-ghost" onClick={startEdit}>
                Edit
              </button>
            ) : null
          }
        />
        {editing ? (
          <div className="stack stack-sm">
            <Field label="Claim">
              <textarea
                className="textarea"
                style={{ minHeight: 140 }}
                value={draft.claim}
                onChange={(e) => setDraft({ ...draft, claim: e.target.value })}
              />
            </Field>
            <Field label="Time horizon (years)">
              <input
                className="input"
                type="number"
                min={1}
                max={30}
                style={{ width: 110 }}
                value={draft.horizonYears}
                onChange={(e) => setDraft({ ...draft, horizonYears: Number(e.target.value) })}
              />
            </Field>
            <Field label="What would make you decide you were wrong?" hint="One per line.">
              <textarea
                className="textarea"
                style={{ minHeight: 110 }}
                value={draft.falsifiers}
                onChange={(e) => setDraft({ ...draft, falsifiers: e.target.value })}
              />
            </Field>
            <div className="row" style={{ gap: 8 }}>
              <button type="button" className="btn btn-primary" onClick={saveEdit}>
                Save
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="prose" style={{ maxWidth: '64ch' }}>
            {node.claim ?? node.businessDescription ?? 'No description written yet.'}
          </p>
        )}
      </section>

      {/* ---------- falsifiers ---------- */}
      {isBelief && !editing && (
        <section className="stack stack-sm">
          <SectionHead title="What would make you decide you were wrong" />
          {node.falsifiers?.length ? (
            <ul className="stack stack-sm" style={{ margin: 0, paddingLeft: 20 }}>
              {node.falsifiers.map((f, i) => (
                <li key={i} className="prose-sm" style={{ maxWidth: '62ch' }}>
                  {f}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No falsifiers written">
              A claim you cannot lose is not a claim. Write down what would change your mind before the
              evidence arrives.
            </EmptyState>
          )}
        </section>
      )}

      {/* ---------- values ---------- */}
      {node.kind === 'company' && alignment && (
        <section className="stack stack-sm">
          <SectionHead
            title="Against your values"
            aside={
              <button type="button" className={`btn btn-sm${banned ? '' : ' btn-ghost'}`} onClick={() => toggleWillNotHold(node.id)}>
                {banned ? 'Will not hold — undo' : 'Mark: will not hold'}
              </button>
            }
          />
          <div className="row" style={{ gap: 12, alignItems: 'baseline' }}>
            <AlignPill score={alignment.score} />
            <span className="meta">{alignmentWord(alignment.score)}</span>
            {alignment.hardConflict && !banned && <span className="chip chip-contradict">works against a core value</span>}
            {banned && <span className="chip">will not hold</span>}
          </div>
          {(node.values ?? []).length === 0 ? (
            <p className="meta" style={{ margin: 0 }}>
              Not scored yet.
            </p>
          ) : (
            <ul className="stack stack-xs" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {[...alignment.advances, ...alignment.conflicts].map((row) => (
                <li key={row.value.id} className="row" style={{ gap: 10, alignItems: 'baseline', fontSize: 14 }}>
                  <span className="num" style={{ width: 24, color: row.score > 0 ? 'var(--support)' : 'var(--contradict)' }}>
                    {row.score > 0 ? '+' : ''}
                    {row.score}
                  </span>
                  <span style={{ fontWeight: 500 }}>{row.value.label}</span>
                  <span className="meta">{row.reason}</span>
                </li>
              ))}
              {(node.values ?? [])
                .filter((v) => !(valuesView.weights[v.valueId] ?? 0))
                .map((v) => (
                  <li key={v.valueId} className="meta" style={{ fontSize: 13 }}>
                    Also scored on a value you have not weighted: {v.reason}
                  </li>
                ))}
            </ul>
          )}
          <p className="meta" style={{ margin: 0 }}>
            Change what counts on the <Link to="/values">values screen</Link>.
          </p>
        </section>
      )}

      {/* ---------- relations ---------- */}
      <section className="stack stack-md">
        <SectionHead title="Where it sits" />
        <div className="grid-2">
          <div className="stack stack-sm">
            <span className="label">What it hangs off</span>
            {parents.length === 0 ? (
              <p className="prose-sm" style={{ margin: 0 }}>
                Nothing. This is a top-level belief.
              </p>
            ) : (
              parents.map(({ edge, node: parent }) =>
                parent ? (
                  <div key={edge.id} className="card-quiet stack stack-xs" style={{ padding: '14px 16px' }}>
                    <div className="row row-between">
                      <Link to={`/beliefs/${parent.id}`} style={{ color: 'var(--ink)', fontWeight: 500 }}>
                        {parent.label}
                      </Link>
                      <span className="num meta" style={{ color: confidenceColor(confidence[parent.id] ?? 50) }}>
                        {(confidence[parent.id] ?? 50).toFixed(0)}
                      </span>
                    </div>
                    <p className="prose-sm" style={{ margin: 0, fontSize: 15 }}>
                      {edge.rationale}
                    </p>
                    <div className="row" style={{ gap: 10, paddingTop: 4 }}>
                      <span className="label">Weight</span>
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={edge.weight}
                        onChange={(e) => setEdgeWeight(edge.id, Number(e.target.value))}
                        style={{ width: 92 }}
                        aria-label={`How much ${node.label} informs ${parent.label}`}
                      />
                      <span className="num meta">{edge.weight.toFixed(2)}</span>
                    </div>
                  </div>
                ) : null,
              )
            )}
          </div>

          <div className="stack stack-sm">
            <span className="label">What hangs off it</span>
            {children.length === 0 ? (
              <p className="prose-sm" style={{ margin: 0 }}>
                Nothing yet. {isBelief ? 'Until something does, this is an ungrounded belief.' : ''}
              </p>
            ) : (
              <table className="table">
                <tbody>
                  {children.map(({ edge, node: child }) =>
                    child ? (
                      <tr key={edge.id}>
                        <td>
                          <Link to={`/beliefs/${child.id}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>
                            {child.label}
                          </Link>
                          {child.ticker && <span className="num meta"> {child.ticker}</span>}
                        </td>
                        <td className="right num meta" style={{ width: 58 }}>
                          w {edge.weight.toFixed(2)}
                        </td>
                        <td
                          className="right num"
                          style={{ width: 44, color: confidenceColor(confidence[child.id] ?? 50) }}
                        >
                          {(confidence[child.id] ?? 50).toFixed(0)}
                        </td>
                      </tr>
                    ) : null,
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      {/* ---------- confidence breakdown ---------- */}
      {breakdown && (
        <section className="stack stack-sm">
          <SectionHead title="What is driving this number" />
          <div className="card">
            <ConfidenceBreakdown breakdown={breakdown} />
          </div>
        </section>
      )}

      {/* ---------- evidence ---------- */}
      <section className="stack stack-md">
        <SectionHead
          title="Evidence"
          aside={
            !adding ? (
              <button type="button" className="btn btn-sm" onClick={() => setAdding(true)}>
                <IconPlus /> Attach a passage
              </button>
            ) : null
          }
        />
        {adding && (
          <AddEvidenceForm
            targetId={node.id}
            defaultCompany={node.kind === 'company' ? node.label : undefined}
            defaultTicker={node.ticker}
            onDone={() => setAdding(false)}
          />
        )}
        {evidence.length === 0 && !adding ? (
          <EmptyState title="Nothing attached to this node yet">
            Confidence here is still just your prior. Attach a passage from a filing — including one that
            argues against you — and it starts being computed.
          </EmptyState>
        ) : (
          <div className="stack stack-sm">
            {evidence.map((e) => (
              <EvidenceCard key={e.id} evidence={e} />
            ))}
          </div>
        )}
      </section>

      {/* ---------- archive ---------- */}
      {!node.archived && (
        <section className="row row-between row-wrap" style={{ gap: 12, borderTop: '1px solid var(--rule)', paddingTop: 18 }}>
          <p className="meta" style={{ margin: 0, maxWidth: '50ch' }}>
            Archiving keeps the node and its evidence in the record and in the journal, but stops it counting
            toward anything above it.
          </p>
          <ConfirmButton confirmLabel="Archive it" onConfirm={() => archiveNode(node.id)}>
            Archive
          </ConfirmButton>
        </section>
      )}
    </div>
  )
}
