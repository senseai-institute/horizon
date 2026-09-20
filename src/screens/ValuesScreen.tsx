import { Link } from 'react-router-dom'
import { formatUsd } from '../components/ui'
import { seedValues } from '../data/seed'
import { alignmentWord } from '../lib/goals'
import type { ValueWeight } from '../lib/types'
import { usePortfolio, useValuesView } from '../store/derived'
import { useHorizon } from '../store/useHorizon'

const WEIGHT_LABEL: Record<ValueWeight, string> = { 0: 'Not for me', 1: 'Matters', 2: 'Core' }

export function AlignPill({ score }: { score: number | null }) {
  const color = score === null ? 'var(--ink-4)' : score >= 15 ? 'var(--support)' : score <= -15 ? 'var(--contradict)' : 'var(--ink-3)'
  return (
    <span className="align-pill" style={{ color, boxShadow: `inset 0 0 0 1px ${color}55` }} title={alignmentWord(score)}>
      {score === null ? '—' : `${score > 0 ? '+' : ''}${score}`}
    </span>
  )
}

/**
 * What you will and will not own. Pick what you care about; every company on
 * the map gets scored against it, and the ones that work against something
 * core are raised for a decision rather than quietly held.
 */
export default function ValuesScreen() {
  const view = useValuesView()
  const portfolio = usePortfolio()
  const nodes = useHorizon((s) => s.nodes)
  const willNotHold = useHorizon((s) => s.willNotHold)
  const setValueWeight = useHorizon((s) => s.setValueWeight)
  const toggleWillNotHold = useHorizon((s) => s.toggleWillNotHold)

  const held = new Map<string, number>()
  for (const s of portfolio.sleeves) for (const p of s.positions) held.set(p.companyId, (held.get(p.companyId) ?? 0) + p.valueUsd)

  const companies = nodes
    .filter((n) => n.kind === 'company' && !n.archived)
    .map((n) => ({ n, a: view.byCompany[n.id], heldUsd: held.get(n.id) ?? 0 }))
    .sort((x, y) => (y.a?.score ?? -999) - (x.a?.score ?? -999))

  return (
    <div className="page" style={{ maxWidth: 1000 }}>
      <div className="page-head">
        <div className="page-head-text">
          <h1>Values</h1>
          <p className="lede">
            Investing in your worldview includes the parts that are not about returns. Say what you care about;
            everything on the map gets scored against it, and anything that works against something core is raised
            for a decision rather than quietly held.
          </p>
        </div>
      </div>

      <section className="card stack stack-md" style={{ marginBottom: 28 }}>
        <div className="row row-wrap" style={{ gap: 40 }}>
          <div className="stack stack-xs">
            <span className="label">What you hold</span>
            <div className="row" style={{ gap: 12, alignItems: 'baseline' }}>
              <span className="num" style={{ fontSize: 34, color: view.portfolioScore !== null && view.portfolioScore < 0 ? 'var(--contradict)' : 'var(--ink)' }}>
                {view.portfolioScore === null ? '—' : `${view.portfolioScore > 0 ? '+' : ''}${view.portfolioScore}`}
              </span>
              <span className="meta">{alignmentWord(view.portfolioScore)}, on a −100 to +100 scale</span>
            </div>
          </div>
          <div className="stack stack-xs">
            <span className="label">Core values</span>
            <span className="num" style={{ fontSize: 34 }}>{view.coreCount}</span>
          </div>
          <div className="stack stack-xs">
            <span className="label">Conflicts on the map</span>
            <span className="num" style={{ fontSize: 34, color: view.conflicts.length ? 'var(--contradict)' : 'var(--ink)' }}>
              {view.conflicts.length}
            </span>
          </div>
        </div>
        <p className="meta" style={{ margin: 0, maxWidth: '70ch' }}>
          Company scores are one reader's judgements written for this prototype — starting points to argue with, not
          research.
        </p>
      </section>

      <section className="stack stack-sm" style={{ marginBottom: 36 }}>
        <h3>What you care about</h3>
        <div className="stack">
          {seedValues.map((v) => {
            const w = view.weights[v.id] ?? 0
            return (
              <div key={v.id} className="row row-between row-wrap" style={{ gap: 12, padding: '12px 0', borderBottom: '1px solid var(--rule)' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 500 }}>{v.label}</div>
                  <div className="meta">{v.blurb}</div>
                </div>
                <div className="weight-picker" role="group" aria-label={`How much ${v.label} matters`}>
                  {([0, 1, 2] as ValueWeight[]).map((k) => (
                    <button key={k} type="button" className={k === 2 ? 'is-core' : undefined} aria-pressed={w === k} onClick={() => setValueWeight(v.id, k)}>
                      {WEIGHT_LABEL[k]}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="stack stack-sm">
        <h3>Every company on the map, by alignment</h3>
        <div className="scroll-x">
          <table className="table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Advances</th>
                <th>Works against</th>
                <th className="right">Held</th>
                <th className="right">Score</th>
                <th className="right">Hold?</th>
              </tr>
            </thead>
            <tbody>
              {companies.map(({ n, a, heldUsd }) => {
                const banned = willNotHold.includes(n.id)
                return (
                  <tr key={n.id} style={banned ? { opacity: 0.6 } : undefined}>
                    <td>
                      <Link to={`/beliefs/${n.id}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>
                        {n.label}
                      </Link>{' '}
                      <span className="num meta">{n.ticker}</span>
                      {a?.hardConflict && !banned && (
                        <span className="chip chip-contradict" style={{ marginLeft: 8 }}>
                          against a core value
                        </span>
                      )}
                      {a?.softConflict && !a.hardConflict && !banned && (
                        <span className="chip chip-outline" style={{ marginLeft: 8 }}>
                          at odds with a core value
                        </span>
                      )}
                    </td>
                    <td className="meta" style={{ maxWidth: 220 }}>
                      {a?.advances.map((x) => x.value.label).join(', ') || '—'}
                    </td>
                    <td className="meta" style={{ maxWidth: 220, color: a?.conflicts.length ? 'var(--contradict)' : undefined }}>
                      {a?.conflicts.map((x) => x.value.label).join(', ') || '—'}
                    </td>
                    <td className="right num meta">{heldUsd ? formatUsd(heldUsd, { compact: true }) : '—'}</td>
                    <td className="right">
                      <AlignPill score={a?.score ?? null} />
                    </td>
                    <td className="right">
                      <button type="button" className={`btn btn-sm${banned ? '' : ' btn-ghost'}`} onClick={() => toggleWillNotHold(n.id)}>
                        {banned ? 'Will not hold' : 'Fine'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
