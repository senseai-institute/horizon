import { useState } from 'react'
import { addMonths, daysBetween, longDay } from '../../finance/calendar'
import { monthlyNeeded } from '../../finance/engine'
import { parseHorizon } from '../../finance/parser'
import { useFinance } from '../../store/useFinance'
import { usd } from './shared'

/**
 * This year's horizon: things you mean to buy. Each one gets a price, a date
 * and a monthly set-aside, so a purchase is a plan instead of a surprise. Big
 * ones cool off for thirty days first — if you still want it then, buy it.
 */
export default function PurchasesScreen() {
  const ledger = useFinance((s) => s.ledger)
  const proposeCommand = useFinance((s) => s.proposeCommand)
  const updatePurchase = useFinance((s) => s.updatePurchase)
  const [form, setForm] = useState({ title: '', price: '', by: '' })
  const [error, setError] = useState<string | null>(null)
  const planned = ledger.purchases.filter((p) => p.status === 'planned').sort((a, b) => a.wantBy.localeCompare(b.wantBy))
  const done = ledger.purchases.filter((p) => p.status !== 'planned')

  const plan = () => {
    const price = Number(form.price.replace(/[$,\s]/g, ''))
    if (!form.title.trim() || !(price > 0)) return setError('A name and a price, please.')
    const wantBy = form.by ? parseHorizon(form.by, ledger.asOf) : null
    if (form.by && !wantBy) return setError('By when? Try "april 2027", "6mo" or "2027".')
    const r = proposeCommand({ kind: 'plan', title: form.title.trim(), price, wantBy: wantBy ?? addMonths(ledger.asOf, 6) })
    setError(r.kind === 'error' ? r.message : null)
    if (r.kind === 'proposal') setForm({ title: '', price: '', by: '' })
  }

  return (
    <div className="page fin-page">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Purchases</h1>
          <p className="lede">Plan it, set money aside for it, then buy it with a code — from money that was waiting for it.</p>
        </div>
      </div>

      <ul className="fin-purchases">
        {planned.map((p) => {
          const months = Math.max(0, Math.round(daysBetween(ledger.asOf, p.wantBy) / 30.4))
          const landing = p.saved + p.monthly * months
          const onTrack = landing >= p.price - 0.5
          const need = monthlyNeeded(p.price, p.saved, ledger.asOf, p.wantBy)
          const cooling = p.coolOffUntil && p.coolOffUntil > ledger.asOf
          return (
            <li key={p.id} className="card stack stack-sm">
              <div className="row row-between" style={{ alignItems: 'baseline' }}>
                <strong>{p.title}</strong>
                <span className="num">{usd(p.price)}</span>
              </div>
              <div className="fin-progress">
                <div style={{ width: `${Math.min(100, (p.saved / p.price) * 100)}%` }} />
              </div>
              <div className="row row-between row-wrap meta num" style={{ gap: 8 }}>
                <span>
                  {usd(p.saved)} set aside · {usd(p.monthly)}/mo · by {longDay(p.wantBy)}
                </span>
                <span className={onTrack ? 'is-up' : 'is-down'}>{onTrack ? 'on track' : `short ${usd(p.price - landing)} — ${usd(need)}/mo gets there`}</span>
              </div>
              {cooling && <span className="fin-flag">Cooling off until {longDay(p.coolOffUntil!)}. If you still want it then, it's yours.</span>}
              {p.note && <p className="prose-sm" style={{ margin: 0 }}>{p.note}</p>}
              <div className="row row-wrap" style={{ gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  disabled={Boolean(cooling)}
                  onClick={() => {
                    const r = proposeCommand({ kind: 'buy', query: p.title })
                    setError(r.kind === 'error' ? r.message : null)
                  }}
                >
                  Buy…
                </button>
                {!onTrack && (
                  <button type="button" className="btn btn-sm" onClick={() => updatePurchase(p.id, { monthly: need })}>
                    Set aside {usd(need)}/mo
                  </button>
                )}
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => updatePurchase(p.id, { status: 'dropped' })}>
                  Don't want it any more
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      <form
        className="card stack stack-sm"
        style={{ marginTop: 16 }}
        onSubmit={(e) => {
          e.preventDefault()
          plan()
        }}
      >
        <span className="label">Plan something</span>
        <div className="fin-form-row">
          <input className="input" placeholder="Road bike" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-label="What" />
          <input className="input" placeholder="$1,400" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} aria-label="Price" />
          <input className="input" placeholder="by april 2027" value={form.by} onChange={(e) => setForm({ ...form, by: e.target.value })} aria-label="By when" />
          <button type="submit" className="btn btn-primary">
            Plan…
          </button>
        </div>
        {error && <p className="fin-error">{error}</p>}
      </form>

      {done.length > 0 && (
        <section className="stack stack-sm" style={{ marginTop: 20 }}>
          <span className="label">Done with</span>
          <ul className="fin-list">
            {done.map((p) => (
              <li key={p.id}>
                <span style={{ flex: 1 }}>{p.title}</span>
                <span className="meta">{p.status === 'bought' ? `bought ${longDay(p.boughtOn!)}` : 'dropped — the money went back to cash'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

