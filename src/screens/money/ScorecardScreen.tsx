import { Link } from 'react-router-dom'
import LineChart from '../../components/LineChart'
import { shortDay } from '../../finance/calendar'
import { betHeadline, scorecard } from '../../finance/engine'
import { useFinance } from '../../store/useFinance'
import { StatusPill, pct, signedUsd, tone } from './shared'

/**
 * Is the sleeve earning its keep? Core against theses over the same windows,
 * the record, and the lessons — the last thing you wrote on each closed bet.
 */
export default function ScorecardScreen() {
  const ledger = useFinance((s) => s.ledger)
  const updateSettings = useFinance((s) => s.updateSettings)
  const card = scorecard(ledger)
  const snaps = ledger.snapshots.slice(-130)
  /* Profit since the window opened, each bucket on its own: one axis, both in dollars. */
  const base = snaps[0]
  const coreLine = snaps.map((s) => s.coreValue - s.coreCost - (base.coreValue - base.coreCost))
  const sleeveLine = snaps.map((s) => s.sleeveValue - s.sleeveCost + s.realizedCum - (base.sleeveValue - base.sleeveCost + base.realizedCum))

  return (
    <div className="page fin-page">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Scorecard</h1>
          <p className="lede">The core is the benchmark. The theses are worth it only if they beat it, or teach you something it can't.</p>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="scroll-x">
          <table className="table fin-score">
            <thead>
              <tr>
                <th />
                <th className="right">Core</th>
                <th className="right">Theses</th>
                <th className="right">Ahead</th>
              </tr>
            </thead>
            <tbody>
              {card.periods.map((p) => {
                const lead = p.sleeveReturn - p.coreReturn
                return (
                  <tr key={p.key}>
                    <td>
                      {p.label}
                      <div className="meta">since {shortDay(p.from)}</div>
                    </td>
                    <td className={`right num ${tone(p.coreReturn)}`}>
                      {pct(p.coreReturn)}
                      <div className="meta">{signedUsd(p.corePnl)}</div>
                    </td>
                    <td className={`right num ${tone(p.sleeveReturn)}`}>
                      {pct(p.sleeveReturn)}
                      <div className="meta">{signedUsd(p.sleevePnl)}</div>
                    </td>
                    <td className="right num">{lead >= 0 ? 'theses' : 'core'} by {Math.abs(lead).toFixed(1)}pt</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="meta" style={{ margin: '8px 0 0' }}>
          Returns are profit over the money each bucket had in during the window, so new bets and rebalances don't count as gains.
        </p>
      </section>

      {snaps.length > 1 && (
        <section className="card" style={{ marginBottom: 16 }}>
          <span className="label">Profit over the last six months</span>
          <LineChart
            dates={snaps.map((s) => s.date)}
            series={[
              { label: 'Core', color: 'var(--chart-1)', values: coreLine },
              { label: 'Theses', color: 'var(--chart-2)', values: sleeveLine },
            ]}
            format={(n) => signedUsd(n)}
            height={170}
            label="Profit in dollars, core and theses, over six months"
          />
        </section>
      )}

      <section className="fin-horizons" style={{ marginBottom: 16 }}>
        <div className="card fin-horizon">
          <span className="label">Record</span>
          <strong className="num">
            {card.wins}–{card.losses}
            {card.flats ? `–${card.flats}` : ''}
          </strong>
          <span className="meta">wins–losses{card.flats ? '–flat' : ''}, closed only</span>
        </div>
        {card.best && (
          <Link to={`/money/theses/${card.best.bet.id}`} className="card fin-horizon">
            <span className="label">Best</span>
            <strong className={`num ${tone(card.best.returnPct)}`}>{pct(card.best.returnPct)}</strong>
            <span className="meta">{betHeadline(card.best.bet)}</span>
          </Link>
        )}
        {card.worst && (
          <Link to={`/money/theses/${card.worst.bet.id}`} className="card fin-horizon">
            <span className="label">Worst</span>
            <strong className={`num ${tone(card.worst.returnPct)}`}>{pct(card.worst.returnPct)}</strong>
            <span className="meta">{betHeadline(card.worst.bet)}</span>
          </Link>
        )}
      </section>

      <section className="stack stack-sm" style={{ marginBottom: 20 }}>
        <span className="label">Lessons</span>
        {card.lessons.length === 0 && <p className="meta">Lessons appear when a thesis closes and you write down what happened.</p>}
        <ul className="fin-journal">
          {card.lessons.map(({ bet, note }) => (
            <li key={bet.id}>
              <div className="row" style={{ gap: 8 }}>
                <StatusPill status={bet.verdict!} />
                <Link to={`/money/theses/${bet.id}`} style={{ color: 'var(--ink)' }}>
                  {betHeadline(bet)}
                </Link>
                <span className={`num meta ${tone(bet.realizedPnl ?? 0)}`}>{signedUsd(bet.realizedPnl ?? 0)}</span>
              </div>
              <p>{note?.note ?? 'No note yet.'}</p>
            </li>
          ))}
        </ul>
      </section>

      <label className="fin-toggle">
        <input type="checkbox" checked={ledger.settings.monthlyEmail} onChange={(e) => updateSettings({ monthlyEmail: e.target.checked })} />
        <span>
          Monthly scorecard by email
          <span className="meta"> — the choice is kept; nothing is sent until the email connection is set up</span>
        </span>
      </label>
    </div>
  )
}
