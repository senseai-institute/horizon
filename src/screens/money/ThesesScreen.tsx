import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import LineChart from '../../components/LineChart'
import { longDay, shortDay } from '../../finance/calendar'
import { betHeadline, betReturnPct } from '../../finance/engine'
import { sleeveRoom } from '../../finance/guardrails'
import { betPnl, betValue, priceOn } from '../../finance/valuation'
import { useFinance } from '../../store/useFinance'
import { Arrow, StatusPill, daysLeftLabel, pct, signedUsd, tone, usd, usd2 } from './shared'

export function ThesesScreen() {
  const ledger = useFinance((s) => s.ledger)
  const navigate = useNavigate()
  const [show, setShow] = useState<'open' | 'closed' | 'all'>('open')
  const room = sleeveRoom(ledger)
  const rows = ledger.bets
    .filter((b) => show === 'all' || b.status === show)
    .sort((a, b) => (a.status === b.status ? b.entryDate.localeCompare(a.entryDate) : a.status === 'open' ? -1 : 1))

  return (
    <div className="page fin-page">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Theses</h1>
          <p className="lede">
            One sentence each, with money behind it and a deadline. {usd(room.used)} of a {usd(room.limit)} sleeve is in open bets.
          </p>
        </div>
      </div>
      <div className="fin-tabs" role="tablist">
        {(['open', 'closed', 'all'] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={show === k} className={show === k ? 'is-on' : ''} onClick={() => setShow(k)}>
            {k}
          </button>
        ))}
      </div>
      <ul className="fin-theses">
        {rows.map((b) => {
          const now = b.status === 'open' ? betValue(ledger, b) - b.feesPaid : b.dollarsIn + (b.realizedPnl ?? 0)
          const r = betReturnPct(ledger, b)
          return (
            <li key={b.id}>
              <button type="button" onClick={() => navigate(`/money/theses/${b.id}`)}>
                <Arrow direction={b.direction} />
                <span className="fin-thesis-name">
                  <strong>{b.themeLabel}</strong>
                  <span className="meta mono">{b.symbol}</span>
                </span>
                <span className="fin-thesis-money num">
                  <span className="meta">{usd(b.dollarsIn)} →</span> {usd2(now)}
                </span>
                <span className={`num fin-thesis-pct ${tone(r)}`}>{pct(r)}</span>
                <span className="meta num fin-thesis-days">{b.status === 'open' ? daysLeftLabel(ledger.asOf, b.deadline) : shortDay(b.closeDate!)}</span>
                <StatusPill status={b.status === 'open' ? 'open' : b.verdict!} />
              </button>
            </li>
          )
        })}
        {!rows.length && <li className="meta" style={{ padding: 16 }}>Nothing here. Type a sentence on the Money home.</li>}
      </ul>
      <p className="meta" style={{ marginTop: 14 }}>
        <Link to="/money">+ New thesis</Link> — "short coffee, 18mo, $100"
      </p>
    </div>
  )
}

export function ThesisDetailScreen() {
  const { id } = useParams()
  const ledger = useFinance((s) => s.ledger)
  const addNote = useFinance((s) => s.addNote)
  const proposeCommand = useFinance((s) => s.proposeCommand)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const bet = ledger.bets.find((b) => b.id === id)
  if (!bet)
    return (
      <div className="page fin-page">
        <p>That thesis isn't here. <Link to="/money/theses">All theses</Link></p>
      </div>
    )

  const start = ledger.days.indexOf(bet.entryDate)
  const endDay = bet.closeDate ?? ledger.asOf
  const end = ledger.days.indexOf(endDay)
  const dates = ledger.days.slice(Math.max(0, start), end + 1)
  const prices = dates.map((d) => priceOn(ledger, bet.symbol, d))
  const pnl = betPnl(ledger, bet)
  const r = (pnl / bet.dollarsIn) * 100
  const notes = ledger.journal.filter((j) => j.betId === bet.id).sort((a, b) => b.at.localeCompare(a.at))
  const exitLoss = bet.autoExitPct === null ? null : (Math.abs(bet.autoExitPct) / 100) * bet.dollarsIn

  return (
    <div className="page fin-page">
      <Link to="/money/theses" className="meta">
        ← Theses
      </Link>
      <section className="fin-hero" style={{ marginTop: 10 }}>
        <div className="row" style={{ gap: 10 }}>
          <Arrow direction={bet.direction} />
          <h1 style={{ margin: 0, fontSize: 28 }}>{betHeadline(bet)}</h1>
        </div>
        <blockquote className="fin-quote">“{bet.sentence}”</blockquote>
        <div className="row row-wrap" style={{ gap: 18 }}>
          <span>
            <span className="meta">In </span>
            <span className="num">{usd(bet.dollarsIn)}</span>
          </span>
          <span>
            <span className="meta">{bet.status === 'open' ? 'Now ' : 'Out '}</span>
            <span className="num">{usd2(bet.dollarsIn + pnl)}</span>
          </span>
          <span className={`num ${tone(pnl)}`}>
            {signedUsd(pnl, true)} ({pct(r)})
          </span>
          <StatusPill status={bet.status === 'open' ? 'open' : bet.verdict!} />
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <span className="label">
          {bet.symbol} since {shortDay(bet.entryDate)}
        </span>
        <LineChart
          dates={dates}
          series={[{ label: bet.symbol, color: bet.direction === 'up' ? 'var(--chart-1)' : 'var(--chart-2)', values: prices }]}
          marker={{ value: bet.entryPrice, label: 'entry' }}
          format={usd2}
          height={170}
          label={`${bet.symbol} price since the bet was placed`}
        />
        <p className="meta" style={{ margin: '6px 0 0' }}>
          {bet.direction === 'down' ? 'A down bet gains when the line falls below the dashed entry.' : 'An up bet gains when the line rises above the dashed entry.'}
        </p>
      </section>

      <section className="card fin-facts">
        <dl className="fin-card-lines">
          <div>
            <dt>Placed</dt>
            <dd>
              {longDay(bet.entryDate)} at {usd2(bet.entryPrice)} — {bet.qty.toFixed(4)} units
            </dd>
          </div>
          <div>
            <dt>Deadline</dt>
            <dd>
              {longDay(bet.deadline)}
              {bet.status === 'open' ? ` — ${daysLeftLabel(ledger.asOf, bet.deadline)} left; it closes itself then` : ''}
            </dd>
          </div>
          <div>
            <dt>Auto-exit</dt>
            <dd>{exitLoss === null ? 'none — runs to the deadline' : `closes if you've lost ${usd(exitLoss)}`}</dd>
          </div>
          <div>
            <dt>Fees</dt>
            <dd>{bet.direction === 'down' ? `${usd2(bet.feesPaid)} so far (borrow fee, ${bet.borrowFeePct}% a year)` : 'none'}</dd>
          </div>
          {bet.status === 'closed' && (
            <div>
              <dt>Closed</dt>
              <dd>
                {longDay(bet.closeDate!)} by {bet.closeReason === 'manual' ? 'hand' : bet.closeReason === 'auto-exit' ? 'auto-exit' : 'its deadline'} at {usd2(bet.closePrice!)}. The core did{' '}
                {pct(bet.coreReturnPct ?? 0)} over the same days.
              </dd>
            </div>
          )}
        </dl>
        {bet.status === 'open' && (
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn"
              onClick={() => {
                const res = proposeCommand({ kind: 'close', query: bet.themeKey, betId: bet.id })
                setError(res.kind === 'error' ? res.message : null)
              }}
            >
              Close it
            </button>
            {error && <p className="fin-error">{error}</p>}
          </div>
        )}
      </section>

      <section className="stack stack-sm" style={{ marginTop: 18 }}>
        <span className="label">Journal</span>
        <form
          className="stack stack-xs"
          onSubmit={(e) => {
            e.preventDefault()
            addNote(bet.id, text)
            setText('')
          }}
        >
          <textarea
            className="textarea"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={bet.status === 'open' ? 'What do you see? What would make you wrong?' : 'What did you learn? Start with "Lesson:" and it leads the scorecard.'}
          />
          <div>
            <button type="submit" className="btn btn-sm btn-primary" disabled={!text.trim()}>
              Add note
            </button>
          </div>
        </form>
        <ul className="fin-journal">
          {notes.map((n) => (
            <li key={n.id} className={n.source === 'system' ? 'is-system' : ''}>
              <span className="meta num">{shortDay(n.date)}</span>
              <p>{n.note}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
