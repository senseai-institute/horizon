import { Link, useSearchParams } from 'react-router-dom'
import LineChart from '../../components/LineChart'
import { longDay, shortDay } from '../../finance/calendar'
import { neediestPurchase, subscriptionFlags } from '../../finance/engine'
import { sleeveRoom } from '../../finance/guardrails'
import { availableCash, coreValue, monthlySubscriptions, openBets, setAside, sleeveValue, totalValue } from '../../finance/valuation'
import { useFinance } from '../../store/useFinance'
import { CommandBox, pct, signedUsd, tone, usd, usd2 } from './shared'

/**
 * Money, on a phone. The total, today's change, a month of it, the core and
 * the thesis sleeve against their targets, the three horizons in one row each,
 * and the line you type into.
 */
export default function MoneyHomeScreen() {
  const ledger = useFinance((s) => s.ledger)
  const forward = useFinance((s) => s.forward)
  const [params, setParams] = useSearchParams()
  const cmd = params.get('cmd') ?? undefined

  const total = totalValue(ledger)
  const snaps = ledger.snapshots
  const prev = snaps.length > 1 ? snaps[snaps.length - 2] : undefined
  const change = prev ? total - prev.totalValue : 0
  const month = snaps.slice(-22)
  const monthChange = month.length ? total - month[0].totalValue : 0
  const core = coreValue(ledger)
  const sleeve = sleeveValue(ledger)
  const corePct = (core / total) * 100
  const sleevePct = (sleeve / total) * 100
  const cashPct = Math.max(0, 100 - corePct - sleevePct)
  const room = sleeveRoom(ledger)
  const subs = monthlySubscriptions(ledger)
  const flags = Object.keys(subscriptionFlags(ledger)).length
  const planned = ledger.purchases.filter((p) => p.status === 'planned')
  const next = neediestPurchase(ledger) ?? planned[0]
  const open = openBets(ledger)
  const lastTx = [...ledger.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)

  return (
    <div className="page fin-page">
      <section className="fin-hero">
        <span className="label">Everything, {longDay(ledger.asOf)}</span>
        <div className="fin-total num">{usd2(total)}</div>
        <div className="row row-wrap" style={{ gap: 14 }}>
          <span className={`num ${tone(change)}`}>
            {signedUsd(change, true)} today ({pct(prev ? (change / prev.totalValue) * 100 : 0, 2)})
          </span>
          <span className={`num meta ${tone(monthChange)}`}>{signedUsd(monthChange)} over 30 days</span>
        </div>
        {month.length > 1 && (
          <LineChart
            dates={month.map((s) => s.date)}
            series={[{ label: 'Total', color: 'var(--chart-1)', values: month.map((s) => s.totalValue) }]}
            format={usd}
            height={150}
            label="Total value over the last 30 market days"
          />
        )}
      </section>

      <section className="card fin-split">
        <div className="fin-bar" aria-label={`Core ${corePct.toFixed(0)} percent, thesis ${sleevePct.toFixed(0)} percent, cash ${cashPct.toFixed(0)} percent`}>
          <div className="fin-bar-core" style={{ width: `${corePct}%` }} />
          <div className="fin-bar-sleeve" style={{ width: `${sleevePct}%` }} />
        </div>
        <div className="fin-split-rows">
          <Link to="/money/core" className="fin-split-row">
            <i className="fin-key fin-bar-core" />
            <span>Core</span>
            <span className="num">{usd(core)}</span>
            <span className="meta num">
              {corePct.toFixed(0)}% · target {ledger.settings.corePct}%
            </span>
          </Link>
          <Link to="/money/theses" className="fin-split-row">
            <i className="fin-key fin-bar-sleeve" />
            <span>Theses</span>
            <span className="num">{usd(sleeve)}</span>
            <span className="meta num">
              {sleevePct.toFixed(1)}% · {usd(room.room)} of room
            </span>
          </Link>
          <Link to="/money/cash" className="fin-split-row">
            <i className="fin-key" />
            <span>Cash</span>
            <span className="num">{usd(ledger.account.cash)}</span>
            <span className="meta num">{usd(availableCash(ledger))} free · {usd(setAside(ledger))} set aside</span>
          </Link>
        </div>
      </section>

      <section className="fin-horizons">
        <Link to="/money/subscriptions" className="card fin-horizon">
          <span className="label">This month · subscriptions</span>
          <strong className="num">{usd2(subs)}/mo</strong>
          <span className="meta">{flags ? `${flags} worth a second look` : 'nothing flagged'}</span>
        </Link>
        <Link to="/money/purchases" className="card fin-horizon">
          <span className="label">This year · purchases</span>
          <strong className="num">{planned.length} planned</strong>
          <span className="meta">{next ? `${next.title}: ${usd(next.saved)} of ${usd(next.price)}` : 'nothing planned'}</span>
        </Link>
        <Link to="/money/theses" className="card fin-horizon">
          <span className="label">Years · theses</span>
          <strong className="num">{open.length} open</strong>
          <span className="meta">
            {open.length ? `next deadline ${shortDay([...open].sort((a, b) => a.deadline.localeCompare(b.deadline))[0].deadline)}` : 'type one below'}
          </span>
        </Link>
      </section>

      <section className="stack stack-sm" style={{ marginBottom: 18 }}>
        <div className="row row-between">
          <span className="label">Lately</span>
          <Link to="/money/cash" className="link-button" style={{ fontSize: 13 }}>
            All of it
          </Link>
        </div>
        <ul className="fin-list">
          {lastTx.map((t) => (
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

      <section className="fin-sim row row-wrap">
        <span className="meta">Simulator:</span>
        <button type="button" className="btn btn-sm" onClick={() => forward(1)}>
          +1 day
        </button>
        <button type="button" className="btn btn-sm" onClick={() => forward(5)}>
          +1 week
        </button>
        <button type="button" className="btn btn-sm" onClick={() => forward(21)}>
          +30 days
        </button>
      </section>

      <div className="fin-command-dock">
        <CommandBox
          initial={cmd}
          onResult={() => {
            if (cmd) setParams({}, { replace: true })
          }}
        />
      </div>
    </div>
  )
}
