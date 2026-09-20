import { Link, useParams } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { IconExternal } from '../components/icons'
import {
  ConfidenceBar,
  EmptyState,
  Highlighted,
  StanceToggle,
  formatDate,
} from '../components/ui'
import { ancestors } from '../lib/confidence'
import { confidenceColor } from '../lib/color'
import { useGraph } from '../store/derived'
import { useHorizon } from '../store/useHorizon'

/**
 * One passage, shown at reading size. The point of this screen is that the
 * reader can see the actual words, decide what they mean, and watch that
 * decision travel up the map from the panel on the right.
 */
export default function EvidenceViewerScreen() {
  const { id } = useParams()
  const evidence = useHorizon((s) => s.evidence.find((e) => e.id === id))
  const nodes = useHorizon((s) => s.nodes)
  const setStance = useHorizon((s) => s.setEvidenceStance)
  const setStrength = useHorizon((s) => s.setEvidenceStrength)
  const setNote = useHorizon((s) => s.setEvidenceNote)
  const setTarget = useHorizon((s) => s.setEvidenceTarget)
  const { confidence, index } = useGraph()
  const toast = useToast()

  if (!evidence) {
    return (
      <div className="page page-narrow">
        <EmptyState title="That passage is not in this notebook">
          <Link to="/beliefs/evidence">Back to all evidence</Link>.
        </EmptyState>
      </div>
    )
  }

  const target = index.nodeById.get(evidence.targetId)
  const chain = target ? [target.id, ...ancestors(index, target.id)] : []
  const beliefOptions = nodes
    .filter((n) => !n.archived)
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label))

  return (
    <div className="page" style={{ maxWidth: 1060 }}>
      <div style={{ marginBottom: 22 }}>
        <Link to="/beliefs/evidence" className="link-button" style={{ fontSize: 13 }}>
          ← All evidence
        </Link>
      </div>

      <div className="page-head">
        <div className="page-head-text">
          <span className="label">
            {evidence.source.form} · {evidence.source.section}
          </span>
          <h1 style={{ margin: '8px 0 10px', maxWidth: '24ch' }}>{evidence.title}</h1>
          <p className="meta">
            {evidence.source.company} · filed {formatDate(evidence.source.filedAt)} · attached{' '}
            {formatDate(evidence.addedAt)}
          </p>
        </div>
        <a className="btn" href={evidence.source.url} target="_blank" rel="noreferrer noopener">
          <IconExternal /> Find it on EDGAR
        </a>
      </div>

      <div className="split">
        <div className="stack stack-lg">
          <blockquote
            className={`excerpt is-${evidence.stance === 'supports' ? 'support' : 'contradict'}`}
            style={{ margin: 0, fontSize: 20, lineHeight: 1.68, paddingLeft: 26 }}
          >
            <Highlighted text={evidence.excerpt} highlight={evidence.highlight} />
          </blockquote>

          <p className="meta" style={{ maxWidth: '62ch' }}>
            Passages in this prototype are illustrative prose written in the register of the filings they are
            attributed to — not quotations. The link above goes to EDGAR's public search so the real document
            can be found.
          </p>

          <section className="card stack stack-md">
            <div className="row row-between row-wrap" style={{ gap: 12 }}>
              <h3>How you are reading it</h3>
              <StanceToggle
                stance={evidence.stance}
                onChange={(s) => {
                  setStance(evidence.id, s)
                  toast({
                    text:
                      s === 'contradicts'
                        ? 'Marked as contradicting. Confidence has fallen through every belief above it.'
                        : 'Marked as supporting. Confidence has risen through the branch above it.',
                    to: '/money/review',
                    actionLabel: 'Open review queue',
                  })
                }}
              />
            </div>

            <div className="field">
              <span className="label">Which belief does it speak to?</span>
              <select
                className="select"
                value={evidence.targetId}
                onChange={(e) => setTarget(evidence.id, e.target.value)}
              >
                {beliefOptions.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.kind === 'company' ? `${n.label} (${n.ticker})` : n.label} — {n.kind}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <span className="label">How much weight does it deserve?</span>
              <div className="row" style={{ gap: 14 }}>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={evidence.strength}
                  onChange={(e) => setStrength(evidence.id, Number(e.target.value))}
                  style={{ flex: 1, maxWidth: 220 }}
                />
                <span className="num meta">{evidence.strength} of 5</span>
              </div>
            </div>

            <div className="field">
              <span className="label">Your note</span>
              <textarea
                className="textarea"
                defaultValue={evidence.note ?? ''}
                placeholder="What this changes, and what would change your reading of it."
                onBlur={(e) => {
                  if (e.target.value !== (evidence.note ?? '')) setNote(evidence.id, e.target.value)
                }}
              />
            </div>
          </section>
        </div>

        <aside className="stack stack-md" style={{ position: 'sticky', top: 24 }}>
          <div className="card stack stack-sm">
            <span className="label">What this passage is holding up</span>
            <ul className="chain" style={{ marginTop: 4 }}>
              {chain.map((nodeId, i) => {
                const n = index.nodeById.get(nodeId)
                if (!n) return null
                const c = confidence[nodeId] ?? 50
                return (
                  <li key={nodeId} className={i === 0 ? 'is-evidence' : undefined}>
                    <Link
                      to={`/beliefs/${nodeId}`}
                      style={{ color: 'var(--ink)', textDecoration: 'none', fontSize: 13.5 }}
                    >
                      {n.label}
                    </Link>
                    <div className="row" style={{ gap: 8, marginTop: 4 }}>
                      <ConfidenceBar value={c} width={80} />
                      <span className="num meta" style={{ color: confidenceColor(c) }}>
                        {c.toFixed(0)}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
            <p className="meta" style={{ margin: 0, lineHeight: 1.55 }}>
              Change the stance above and every number in this list moves.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
