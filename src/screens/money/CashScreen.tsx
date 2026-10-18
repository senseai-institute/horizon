import { useState } from 'react'
import { longDay, shortDay } from '../../finance/calendar'
import { availableCash, setAside } from '../../finance/valuation'
import { useFinance } from '../../store/useFinance'
import { signedUsd, tone, usd, usd2 } from './shared'

/** Cash, what came in, what went out, and the button to add more. */
export default function CashScreen() {
  const ledger = useFinance((s) => s.ledger)
  const status = useFinance((s) => s.status)
  const proposeCommand = useFinance((s) => s.proposeCommand)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const txns = [...ledger.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 60)
  const deposits = [...ledger.deposits].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="page fin-page">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Cash</h1>
          <p className="lede">One balance under every horizon: bets, purchases and subscriptions all draw on it.</p>
        </div>
      </div>

      <section className="fin-horizons" style={{ marginBottom: 16 }}>
        <div className="card fin-horizon">
          <span className="label">Cash</span>
          <strong className="num">{usd2(ledger.account.cash)}</strong>
        </div>
        <div className="card fin-horizon">
          <span className="label">Free to use</span>
          <strong className="num">{usd2(availableCash(ledger))}</strong>
        </div>
        <div className="card fin-horizon">
          <span className="label">Set aside for purchases</span>
          <strong className="num">{usd2(setAside(ledger))}</strong>
        </div>
      </section>

      <form
        className="card stack stack-sm"
        style={{ marginBottom: 16 }}
        onSubmit={(e) => {
          e.preventDefault()
          const n = Number(amount.replace(/[$,\s]/g, ''))
          if (!(n > 0)) return setError('Enter an amount.')
          const r = proposeCommand({ kind: 'deposit', amount: n })
          setError(r.kind === 'error' ? r.message : null)
          if (r.kind === 'proposal') setAmount('')
        }}
      >
        <span className="label">Add money · from checking ({status.bank === 'mock' ? 'mock bank' : status.bank})</span>
        <div className="row" style={{ gap: 8 }}>
          <input className="input" inputMode="decimal" placeholder="$500" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount to add" />
          <button type="submit" className="btn btn-primary">
            Add…
          </button>
        </div>
        <span className="meta">
          Plus {usd(ledger.settings.monthlyDepositUsd)} automatically on the first market day of each month (Settings).
        </span>
        {error && <p className="fin-error">{error}</p>}
      </form>

      <section className="stack stack-sm" style={{ marginBottom: 18 }}>
        <span className="label">Deposits</span>
        <ul className="fin-list">
          {deposits.slice(0, 12).map((d) => (
            <li key={d.id}>
              <span className="meta num" style={{ width: 92 }}>
                {longDay(d.date)}
              </span>
              <span style={{ flex: 1 }} className="meta">
                {d.source}
              </span>
              <span className="num is-up">+{usd2(d.amount)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="stack stack-sm">
        <span className="label">Every movement</span>
        <ul className="fin-list">
          {txns.map((t) => (
            <li key={t.id}>
              <span className="meta num" style={{ width: 52 }}>
                {shortDay(t.date)}
              </span>
              <span className="truncate" style={{ flex: 1 }}>
                {t.label}
              </span>
              <span className={`num ${tone(t.amount)}`}>{signedUsd(t.amount, true)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
