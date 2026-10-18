import { useState } from 'react'
import { longDay, shortDay } from '../../finance/calendar'
import { subscriptionFlags } from '../../finance/engine'
import { monthlySubscriptions } from '../../finance/valuation'
import { useFinance } from '../../store/useFinance'
import { usd, usd2 } from './shared'

/**
 * This month's horizon: everything that charges you again without asking.
 * Found in the bank feed; the ones not used lately, or doubled up, are
 * flagged. Cancelling is a proposal like any other — and the money it frees
 * goes somewhere you choose.
 */
export default function SubscriptionsScreen() {
  const ledger = useFinance((s) => s.ledger)
  const proposeCommand = useFinance((s) => s.proposeCommand)
  const [error, setError] = useState<string | null>(null)
  const flags = subscriptionFlags(ledger)
  const active = ledger.subscriptions.filter((s) => s.status === 'active').sort((a, b) => Number(Boolean(flags[b.id])) - Number(Boolean(flags[a.id])) || b.amount - a.amount)
  const ended = ledger.subscriptions.filter((s) => s.status !== 'active')
  const monthly = monthlySubscriptions(ledger)
  const freed = monthlySubscriptions(ledger, ['cancelling', 'cancelled'])
  const flaggedMonthly = active.filter((s) => flags[s.id]).reduce((a, s) => a + (s.cadence === 'yearly' ? s.amount / 12 : s.amount), 0)

  return (
    <div className="page fin-page">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Subscriptions</h1>
          <p className="lede">
            {usd2(monthly)} a month, {usd(monthly * 12)} a year. The flagged ones come to {usd2(flaggedMonthly)} a month.
            {freed > 0 && ` You've freed ${usd2(freed)} a month so far.`}
          </p>
        </div>
      </div>

      {error && <p className="fin-error">{error}</p>}

      <ul className="fin-subs">
        {active.map((s) => (
          <li key={s.id} className={`card${flags[s.id] ? ' is-flagged' : ''}`}>
            <div className="fin-sub-main">
              <strong>{s.name}</strong>
              <span className="meta">
                {s.category} · next {shortDay(s.nextCharge)} · {s.lastUsedDaysAgo === null ? 'use unknown' : s.lastUsedDaysAgo === 0 ? 'used today' : `used ${s.lastUsedDaysAgo}d ago`}
              </span>
              {flags[s.id] && <span className="fin-flag">Worth a look: {flags[s.id]}</span>}
            </div>
            <div className="fin-sub-side">
              <span className="num">
                {usd2(s.amount)}
                <span className="meta">/{s.cadence === 'yearly' ? 'yr' : 'mo'}</span>
              </span>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  const r = proposeCommand({ kind: 'cancel', query: s.name })
                  setError(r.kind === 'error' ? r.message : null)
                }}
              >
                Cancel…
              </button>
            </div>
          </li>
        ))}
      </ul>

      {ended.length > 0 && (
        <section className="stack stack-sm" style={{ marginTop: 20 }}>
          <span className="label">Cancelled</span>
          <ul className="fin-list">
            {ended.map((s) => {
              const r = s.redirectTo
              const to = r?.kind === 'purchase' ? ledger.purchases.find((p) => p.id === r.purchaseId)?.title : 'cash'
              return (
                <li key={s.id}>
                  <span style={{ flex: 1 }}>
                    {s.name}{' '}
                    <span className="meta">
                      {s.status === 'cancelling' ? `access until ${longDay(s.nextCharge)}` : `ended ${longDay(s.cancelledOn ?? s.nextCharge)}`} → {to}
                    </span>
                  </span>
                  <span className="num is-up">+{usd2(s.cadence === 'yearly' ? s.amount / 12 : s.amount)}/mo</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <p className="meta" style={{ marginTop: 18 }}>
        Found by the bank connection (mock today, Plaid later). Horizon can't cancel at the merchant for you yet: confirming stops it here,
        redirects the money, and puts a to-do on your Morning with exactly where to click.
      </p>
    </div>
  )
}
