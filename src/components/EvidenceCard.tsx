import { useState } from 'react'
import { Link } from 'react-router-dom'
import { POINTS_PER_STRENGTH } from '../lib/confidence'
import { stanceWord, type Evidence } from '../lib/types'
import { useGraph } from '../store/derived'
import { useHorizon } from '../store/useHorizon'
import { useToast } from './Toast'
import { IconExternal } from './icons'
import { ConfirmButton, Highlighted, StanceToggle, formatDate } from './ui'

/**
 * One passage, with the controls that let a reader change their mind about it.
 * Changing the stance here is what drives confidence propagation through the
 * whole map, so this component is deliberately the same everywhere it appears.
 */
export default function EvidenceCard({
  evidence,
  showTarget = false,
  defaultOpen = false,
}: {
  evidence: Evidence
  showTarget?: boolean
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [noteDraft, setNoteDraft] = useState<string | null>(null)
  const setStance = useHorizon((s) => s.setEvidenceStance)
  const setStrength = useHorizon((s) => s.setEvidenceStrength)
  const setNote = useHorizon((s) => s.setEvidenceNote)
  const removeEvidence = useHorizon((s) => s.removeEvidence)
  const { index } = useGraph()
  const toast = useToast()
  const target = index.nodeById.get(evidence.targetId)

  const points = (evidence.stance === 'supports' ? 1 : -1) * evidence.strength * POINTS_PER_STRENGTH

  return (
    <article
      className="card"
      style={{
        padding: '18px 20px',
        display: 'flex',
        gap: 16,
        background: open ? 'var(--paper-raised)' : 'transparent',
      }}
    >
      <div className={`stance-rail ${evidence.stance}`} aria-hidden="true" />
      <div className="stack stack-sm" style={{ flex: 1, minWidth: 0 }}>
        <div className="row row-between row-wrap" style={{ alignItems: 'flex-start', gap: 12 }}>
          <div className="stack stack-xs" style={{ minWidth: 0 }}>
            <h4 style={{ fontFamily: 'var(--sans)', fontSize: 14.5, fontWeight: 500 }}>{evidence.title}</h4>
            <div className="meta">
              {evidence.source.company} · {evidence.source.form} · {evidence.source.section} ·{' '}
              {formatDate(evidence.source.filedAt)}
            </div>
            {showTarget && target && (
              <div className="meta">
                Speaks to{' '}
                <Link to={`/beliefs/${target.id}`} style={{ color: 'var(--accent)' }}>
                  {target.label}
                </Link>
              </div>
            )}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <StanceToggle
              stance={evidence.stance}
              size="sm"
              onChange={(stance) => {
                setStance(evidence.id, stance)
                toast({
                  text: `Re-marked as ${stanceWord(stance)}. Confidence has been recomputed up the whole branch.`,
                  to: '/money/review',
                  actionLabel: 'Open review queue',
                })
              }}
            />
          </div>
        </div>

        <blockquote
          className={`excerpt is-${evidence.stance === 'supports' ? 'support' : 'contradict'}`}
          style={{ margin: 0 }}
        >
          <Highlighted text={evidence.excerpt} highlight={evidence.highlight} />
        </blockquote>

        <div className="row row-wrap row-between" style={{ gap: 14 }}>
          <div className="row" style={{ gap: 10 }}>
            <span className="label">Weight</span>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={evidence.strength}
              onChange={(e) => setStrength(evidence.id, Number(e.target.value))}
              style={{ width: 96 }}
              aria-label="How much weight to give this passage, 1 to 5"
            />
            <span className="num meta">{evidence.strength} of 5</span>
            <span
              className="num meta"
              title="Raw points this passage contributes before diminishing returns are applied"
            >
              ({points > 0 ? '+' : '−'}
              {Math.abs(points)} pts)
            </span>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button type="button" className="link-button" style={{ fontSize: 13 }} onClick={() => setOpen((o) => !o)}>
              {open ? 'Less' : 'Note & source'}
            </button>
            <Link to={`/beliefs/evidence/${evidence.id}`} className="link-button" style={{ fontSize: 13 }}>
              Open passage
            </Link>
          </div>
        </div>

        {open && (
          <div className="stack stack-sm" style={{ paddingTop: 4, borderTop: '1px solid var(--rule)' }}>
            <div className="field" style={{ paddingTop: 10 }}>
              <span className="label">Your note</span>
              <textarea
                className="textarea"
                style={{ minHeight: 64, fontSize: 15.5 }}
                placeholder="Why does this passage matter, and what would change your reading of it?"
                value={noteDraft ?? evidence.note ?? ''}
                onChange={(e) => setNoteDraft(e.target.value)}
                onBlur={() => {
                  if (noteDraft !== null && noteDraft !== (evidence.note ?? '')) setNote(evidence.id, noteDraft)
                  setNoteDraft(null)
                }}
              />
            </div>
            <div className="row row-between row-wrap" style={{ gap: 10 }}>
              <a
                className="btn btn-sm"
                href={evidence.source.url}
                target="_blank"
                rel="noreferrer noopener"
                title="Opens EDGAR's public search for this filer"
              >
                <IconExternal /> Find the filing on EDGAR
              </a>
              <ConfirmButton confirmLabel="Detach it" onConfirm={() => removeEvidence(evidence.id)}>
                Detach
              </ConfirmButton>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
