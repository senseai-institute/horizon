import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { IconCheck, IconClose, IconSearchCompanies } from '../components/icons'
import { ConfidenceBar, EmptyState } from '../components/ui'
import { seedDiscovery } from '../data/seed'
import { confidenceColor } from '../lib/color'
import type { Candidate, CandidateStatus, MatchReason } from '../lib/types'
import { useGraph } from '../store/derived'
import { useHorizon } from '../store/useHorizon'

const REASON_LABEL: Record<MatchReason['type'], string> = {
  sic: 'Industry code',
  'competitor-mention': 'Named in a filing',
  description: 'Business description',
  'supply-chain': 'Supply chain',
  'customer-overlap': 'Same customer',
}

export default function DiscoveryScreen() {
  const [seedId, setSeedId] = useState(seedDiscovery[0].id)
  const [showRemembered, setShowRemembered] = useState(false)
  const candidateStatus = useHorizon((s) => s.candidateStatus)
  const seed = seedDiscovery.find((d) => d.id === seedId)!

  const open = seed.candidates.filter((c) => !candidateStatus[c.id])
  const decided = seed.candidates.filter((c) => candidateStatus[c.id])
  const sorted = useMemo(() => [...open].sort((a, b) => b.score - a.score), [open])

  return (
    <div className="page" style={{ maxWidth: 1000 }}>
      <div className="page-head">
        <div className="page-head-text">
          <h1>Discovery</h1>
          <p className="lede">
            Name a company you are optimistic about — including a private one you cannot own — and Horizon comes
            back with public companies that look like it, and says why each one matched.
          </p>
        </div>
      </div>

      <div className="stack stack-sm" style={{ marginBottom: 30 }}>
        <span className="label">Seed company</span>
        <div className="grid-3">
          {seedDiscovery.map((d) => {
            const active = d.id === seedId
            const remaining = d.candidates.filter((c) => !candidateStatus[c.id]).length
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => setSeedId(d.id)}
                className="card"
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderColor: active ? 'var(--accent)' : 'var(--rule)',
                  background: active ? 'var(--accent-soft)' : 'var(--paper-raised)',
                  padding: '16px 18px',
                }}
              >
                <div className="row row-between" style={{ marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--serif)', fontSize: 18 }}>{d.name}</span>
                  <span className="chip chip-outline">{d.isPrivate ? 'Private' : 'Public'}</span>
                </div>
                <p className="meta" style={{ margin: 0 }}>
                  {remaining} of {d.candidates.length} still to go through
                </p>
              </button>
            )
          })}
        </div>
      </div>

      <section className="card stack stack-sm" style={{ marginBottom: 28, background: 'var(--paper-sunken)' }}>
        <div className="row" style={{ gap: 10 }}>
          <span style={{ color: 'var(--ink-4)', display: 'grid' }}>
            <IconSearchCompanies />
          </span>
          <h3>Companies that look like {seed.name}</h3>
        </div>
        <p className="prose-sm" style={{ margin: 0, maxWidth: '70ch' }}>
          {seed.blurb}
        </p>
        <p className="meta" style={{ margin: 0 }}>
          Seed classification: SIC <span className="num">{seed.sicCode}</span> — {seed.sicLabel}
        </p>
      </section>

      {sorted.length === 0 ? (
        <EmptyState title={`You have been through every match for ${seed.name}`}>
          Accepted companies are on the <Link to="/beliefs">map</Link>. Rejected ones are remembered and will not
          come back.
        </EmptyState>
      ) : (
        <div className="stack stack-md">
          {sorted.map((c) => (
            <CandidateCard key={c.id} candidate={c} seedName={seed.name} />
          ))}
        </div>
      )}

      {decided.length > 0 && (
        <section style={{ marginTop: 34 }}>
          <button type="button" className="link-button" onClick={() => setShowRemembered((v) => !v)}>
            {showRemembered ? 'Hide' : 'Show'} the {decided.length} you have already decided on
          </button>
          {showRemembered && (
            <table className="table" style={{ marginTop: 14 }}>
              <tbody>
                {decided.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {c.name} <span className="num meta">{c.ticker}</span>
                    </td>
                    <td className="right">
                      <span
                        className={
                          candidateStatus[c.id] === 'accepted'
                            ? 'chip chip-support'
                            : candidateStatus[c.id] === 'rejected'
                              ? 'chip chip-contradict'
                              : 'chip'
                        }
                      >
                        {statusLabel(candidateStatus[c.id])}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  )
}

function statusLabel(s: CandidateStatus | undefined) {
  if (s === 'accepted') return 'Accepted — on the map'
  if (s === 'rejected') return 'Rejected — will not come back'
  return 'Set aside'
}

function CandidateCard({ candidate, seedName }: { candidate: Candidate; seedName: string }) {
  const accept = useHorizon((s) => s.acceptCandidate)
  const setStatus = useHorizon((s) => s.setCandidateStatus)
  const { index, confidence } = useGraph()
  const toast = useToast()
  const parent = index.nodeById.get(candidate.suggestedParentId)
  const alreadyOnMap = candidate.existingNodeId ? index.nodeById.has(candidate.existingNodeId) : false

  return (
    <article className="card stack stack-md">
      <div className="row row-between row-wrap" style={{ gap: 16, alignItems: 'flex-start' }}>
        <div className="stack stack-xs" style={{ minWidth: 0 }}>
          <div className="row row-wrap" style={{ gap: 8 }}>
            <h3 style={{ fontSize: 20 }}>{candidate.name}</h3>
            <span className="chip">
              <span className="num">{candidate.ticker}</span> · {candidate.exchange}
            </span>
            <span className="chip chip-outline num">${candidate.marketCapB.toLocaleString()}bn</span>
            {alreadyOnMap && <span className="chip chip-accent">Already on your map</span>}
          </div>
          <p className="prose-sm" style={{ margin: '4px 0 0', maxWidth: '66ch' }}>
            {candidate.description}
          </p>
        </div>
        <div className="stack stack-xs" style={{ minWidth: 150 }}>
          <span className="label">Match</span>
          <div className="row" style={{ gap: 9 }}>
            <span className="num" style={{ fontSize: 22, color: confidenceColor(candidate.score) }}>
              {candidate.score}
            </span>
            <ConfidenceBar value={candidate.score} width={70} />
          </div>
          <span className="meta">against {seedName}</span>
        </div>
      </div>

      <div className="stack stack-sm">
        <span className="label">Why it matched</span>
        <div className="stack stack-xs">
          {candidate.reasons.map((r, i) => (
            <div key={i} className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
              <span className="chip chip-outline" style={{ marginTop: 2, flex: 'none' }}>
                {REASON_LABEL[r.type]}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{r.label}</div>
                <p className="meta" style={{ margin: 0, maxWidth: '62ch' }}>
                  {r.detail}
                  {r.source && <span className="mono"> — {r.source}</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="row row-between row-wrap" style={{ gap: 12, borderTop: '1px solid var(--rule)', paddingTop: 14 }}>
        <p className="meta" style={{ margin: 0 }}>
          If accepted it is filed under <strong style={{ color: 'var(--ink-2)', fontWeight: 500 }}>{parent?.label ?? 'the map'}</strong>
          {parent && (
            <>
              {' '}
              (currently <span className="num">{(confidence[parent.id] ?? 50).toFixed(0)}</span>), with no evidence
              attached yet.
            </>
          )}
        </p>
        <div className="row" style={{ gap: 8 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              accept(seedName, candidate)
              toast({
                text: `${candidate.name} added under ${parent?.label ?? 'the map'}. Attach a passage to give it a real score.`,
              })
            }}
          >
            <IconCheck /> Accept
          </button>
          <button type="button" className="btn" onClick={() => setStatus(candidate.id, 'set-aside')}>
            Set aside
          </button>
          <button type="button" className="btn btn-danger" onClick={() => setStatus(candidate.id, 'rejected')}>
            <IconClose /> Reject
          </button>
        </div>
      </div>
    </article>
  )
}
