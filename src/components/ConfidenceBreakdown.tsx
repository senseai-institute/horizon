import { Link } from 'react-router-dom'
import { EVIDENCE_BASE, MAX_SHIFT, type Breakdown } from '../lib/confidence'
import { confidenceColor } from '../lib/color'
import { ConfidenceBar, Delta } from './ui'

/**
 * Shows exactly how a number was arrived at. The point of the product is that
 * confidence is never typed in, so it has to be possible to take any score
 * apart and see what is holding it up.
 */
export default function ConfidenceBreakdown({ breakdown }: { breakdown: Breakdown }) {
  const b = breakdown
  const hasDirect = b.direct !== null
  const hasInherited = b.inherited !== null
  const blended = hasDirect && hasInherited

  return (
    <div className="stack stack-md">
      {!hasDirect && !hasInherited && (
        <p className="prose-sm" style={{ margin: 0 }}>
          Nothing is attached and nothing hangs underneath, so this sits at the prior you wrote when you
          created it — {b.prior}. A belief with nothing behind it is just a feeling; attach a passage or hang
          something under it and this number starts meaning something.
        </p>
      )}

      {hasDirect && (
        <section className="stack stack-sm">
          <div className="row row-between">
            <span className="label">From passages attached here</span>
            <span className="num" style={{ color: confidenceColor(b.direct!) }}>
              {b.direct!.toFixed(1)}
            </span>
          </div>
          <ul className="stack stack-xs" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {b.evidence.map((e) => (
              <li key={e.evidenceId} className="row row-between" style={{ gap: 12, alignItems: 'baseline' }}>
                <span style={{ minWidth: 0, fontSize: 13.5 }}>
                  <span
                    className="stance-rail"
                    style={{
                      display: 'inline-block',
                      width: 3,
                      height: 10,
                      marginRight: 8,
                      verticalAlign: 'baseline',
                      background: e.stance === 'supports' ? 'var(--support)' : 'var(--contradict)',
                    }}
                  />
                  <Link to={`/evidence/${e.evidenceId}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>
                    {e.title}
                  </Link>
                </span>
                <span className="num meta" style={{ whiteSpace: 'nowrap' }}>
                  <Delta value={e.points} /> <span className="muted">· weight {e.strength}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="meta" style={{ margin: 0, lineHeight: 1.55 }}>
            Net {b.netPoints > 0 ? '+' : b.netPoints < 0 ? '−' : ''}
            {Math.abs(b.netPoints)} points, applied as{' '}
            <Delta value={b.appliedShift} /> to the {EVIDENCE_BASE} baseline. Agreeing passages count for less
            as they pile up — the tenth supporting filing moves a belief less than the first did, and nothing
            can shift a node more than {MAX_SHIFT} points on its own evidence alone.
          </p>
        </section>
      )}

      {hasInherited && (
        <section className="stack stack-sm">
          <div className="row row-between">
            <span className="label">From what hangs underneath</span>
            <span className="num" style={{ color: confidenceColor(b.inherited!) }}>
              {b.inherited!.toFixed(1)}
            </span>
          </div>
          <table className="table">
            <tbody>
              {b.children.map((c) => (
                <tr key={c.nodeId}>
                  <td style={{ paddingRight: 10 }}>
                    <Link to={`/thesis/${c.nodeId}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>
                      {c.label}
                    </Link>
                  </td>
                  <td style={{ width: 120 }}>
                    <ConfidenceBar value={c.confidence} width={90} />
                  </td>
                  <td className="right num" style={{ width: 48, color: confidenceColor(c.confidence) }}>
                    {c.confidence.toFixed(0)}
                  </td>
                  <td className="right num meta" style={{ width: 96 }} title="Share of the inherited number">
                    {(c.share * 100).toFixed(0)}% of it
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {blended && (
        <section className="stack stack-sm">
          <span className="label">How they were blended</span>
          <div className="row" style={{ gap: 0, height: 22, borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                width: `${b.directWeight * 100}%`,
                background: 'var(--paper-deep)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 11,
                color: 'var(--ink-2)',
              }}
            >
              {Math.round(b.directWeight * 100)}% own evidence
            </div>
            <div
              style={{
                flex: 1,
                background: 'var(--accent-soft)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 11,
                color: 'var(--accent)',
              }}
            >
              {Math.round((1 - b.directWeight) * 100)}% what hangs underneath
            </div>
          </div>
          <p className="meta" style={{ margin: 0, lineHeight: 1.55 }}>
            A belief is mostly worth what the things below it are worth, so the branch carries most of the
            weight. That is also why one contradicting filing on one company can be felt at the top of the
            map.
          </p>
        </section>
      )}
    </div>
  )
}
