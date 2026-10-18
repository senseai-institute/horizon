import { useState } from 'react'
import { coreWeights } from '../../finance/adapters'
import { rebalancePlan } from '../../finance/engine'
import { coreCost, coreValue, priceOn, totalValue } from '../../finance/valuation'
import { useFinance } from '../../store/useFinance'
import { pct, signedUsd, tone, usd, usd2 } from './shared'

/** The boring 80%: a few funds, their weights, and how far they have drifted. */
export default function CoreScreen() {
  const ledger = useFinance((s) => s.ledger)
  const proposeCommand = useFinance((s) => s.proposeCommand)
  const [error, setError] = useState<string | null>(null)
  const weights = coreWeights(ledger)
  const value = coreValue(ledger)
  const cost = coreCost(ledger)
  const share = (value / totalValue(ledger)) * 100
  const plan = rebalancePlan(ledger)

  return (
    <div className="page fin-page">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Core</h1>
          <p className="lede">
            {usd(value)}, {share.toFixed(0)}% of everything against a {ledger.settings.corePct}% target.{' '}
            <span className={tone(value - cost)}>
              {signedUsd(value - cost)} ({pct(((value - cost) / cost) * 100)})
            </span>{' '}
            on what went in.
          </p>
        </div>
      </div>

      <ul className="fin-core">
        {weights.map((w) => {
          const h = ledger.holdings.find((x) => x.bucket === 'core' && x.symbol === w.symbol)
          const gain = h ? h.qty * (priceOn(ledger, w.symbol) - h.avgCost) : 0
          return (
            <li key={w.symbol} className="card">
              <div className="row row-between">
                <span>
                  <strong className="mono">{w.symbol}</strong> <span className="meta">{w.label}</span>
                </span>
                <span className="num">{usd2(w.value)}</span>
              </div>
              <div className="fin-weight">
                <div className="fin-weight-fill" style={{ width: `${Math.min(100, w.pct)}%` }} />
                <div className="fin-weight-target" style={{ left: `${w.target}%` }} title={`target ${w.target}%`} />
              </div>
              <div className="row row-between meta num">
                <span>
                  {w.pct.toFixed(1)}% now · {w.target}% target ·{' '}
                  <span className={Math.abs(w.drift) > 2 ? 'is-down' : ''}>
                    {w.drift >= 0 ? '+' : '−'}
                    {Math.abs(w.drift).toFixed(1)}pt
                  </span>
                </span>
                <span className={tone(gain)}>{signedUsd(gain)}</span>
              </div>
            </li>
          )
        })}
      </ul>

      <section className="card stack stack-sm" style={{ marginTop: 16 }}>
        <span className="label">Rebalance</span>
        <p className="prose-sm" style={{ margin: 0 }}>
          {plan.orders.length
            ? `${plan.orders.length} order${plan.orders.length > 1 ? 's' : ''} would bring it back to target${plan.invest ? `, putting ${usd(plan.invest)} of idle cash in` : ''}. Cash the theses might still use and money set aside for purchases stay put.`
            : 'On target, and no idle cash to put in.'}
        </p>
        <div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!plan.orders.length}
            onClick={() => {
              const r = proposeCommand({ kind: 'rebalance' })
              setError(r.kind === 'error' ? r.message : null)
            }}
          >
            Rebalance…
          </button>
        </div>
        {error && <p className="fin-error">{error}</p>}
      </section>
    </div>
  )
}
