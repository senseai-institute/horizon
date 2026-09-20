import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { todayKey } from '../../os/day'
import { markKey, trackerDayProgress, trackerDue } from '../../os/everyday'
import { AwayWidget, DigestWidget, TodosWidget } from '../../os/widgets'
import { useOS } from '../../store/useOS'

/**
 * The Morning. Wake up, check Horizon — one page, read top to bottom, then
 * "start the day". It is the front door before the Desk opens, and it ends.
 * Nothing on it refreshes, counts up, or asks you back.
 */
export default function MorningScreen() {
  const trackers = useOS((s) => s.trackers)
  const blocks = useOS((s) => s.blocks)
  const morningDoneDay = useOS((s) => s.morningDoneDay)
  const runs = useOS((s) => s.runs)
  const { toggleMark, finishMorning } = useOS.getState()
  const navigate = useNavigate()
  const today = todayKey()
  const due = trackers.filter((t) => !t.archived && trackerDue(t, today))
  const todayBlocks = blocks.filter((b) => b.day === today).sort((a, b) => a.start.localeCompare(b.start))
  const waiting = runs.filter((r) => r.status === 'awaiting_review').length
  const done = morningDoneDay === today
  const [intent, setIntent] = useState('')
  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="page-head">
        <div className="page-head-text">
          <span className="label">{now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <h1>{greeting}.</h1>
          <p className="lede">
            {done
              ? 'You have already started today. This page is the same until tomorrow.'
              : 'Read this once, top to bottom. Tick what you can. Then start the day and the Desk opens.'}
          </p>
        </div>
      </div>

      <div className="stack stack-lg">
        <section className="card widget"><AwayWidget /></section>

        {due.length > 0 && (
          <section className="card stack stack-sm">
            <div className="row row-between"><span className="label">Due today</span><Link to="/trackers" className="link-button" style={{ fontSize: 12.5 }}>The fridge</Link></div>
            {due.map((t) => {
              const p = trackerDayProgress(t, today)
              return (
                <div key={t.id} className="stack stack-xs">
                  <div className="row row-between"><span style={{ fontWeight: 500, fontSize: 14.5 }}>{t.title}</span><span className="meta num">{p.done}/{p.total}</span></div>
                  <div className="row row-wrap" style={{ gap: 6 }}>
                    {t.rows.map((r) =>
                      t.slots.map((s) => {
                        const on = Boolean(t.marks[today]?.[markKey(r, s)])
                        return (
                          <button key={r + s} type="button" className={`box-chip${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => toggleMark(t.id, today, r, s)}>
                            <span className="box">{on ? '✓' : ''}</span>
                            {r}{s ? ` · ${s}` : ''}
                          </button>
                        )
                      }),
                    )}
                  </div>
                </div>
              )
            })}
          </section>
        )}

        <section className="card widget"><TodosWidget /></section>

        <section className="card stack stack-sm">
          <div className="row row-between"><span className="label">Today</span><Link to="/desk" className="link-button" style={{ fontSize: 12.5 }}>The day</Link></div>
          {todayBlocks.length === 0 && <p className="meta" style={{ margin: 0 }}>The day is planned when the Desk opens.</p>}
          <ul className="day-list">
            {todayBlocks.slice(0, 5).map((b) => (
              <li key={b.id} className={`day-block k-${b.kind}${b.done ? ' is-done' : ''}`}>
                <span className="mono meta" style={{ width: 42 }}>{b.start}</span>
                <span className="truncate" style={{ flex: 1 }}>{b.title}</span>
                <span className="meta num" style={{ flex: 'none' }}>{b.minutes}m</span>
              </li>
            ))}
          </ul>
          {waiting > 0 && <p className="meta" style={{ margin: 0 }}>{waiting} run{waiting === 1 ? '' : 's'} waiting for your review on the Desk.</p>}
        </section>

        <section className="card widget"><DigestWidget /></section>

        {!done ? (
          <section className="card stack stack-md" style={{ background: 'var(--paper-sunken)' }}>
            <span className="label">One thing today</span>
            <input className="input" value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="If only one thing happens today, it is…" />
            <div className="row row-wrap" style={{ gap: 8 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (intent.trim()) useOS.getState().addTodo(intent.trim(), { due: today })
                  finishMorning()
                  navigate('/desk')
                }}
              >
                Start the day
              </button>
              <span className="meta">The Desk opens; this page rests until tomorrow.</span>
            </div>
          </section>
        ) : (
          <div className="row" style={{ gap: 8 }}>
            <Link to="/desk" className="btn btn-primary">To the Desk</Link>
          </div>
        )}
      </div>
    </div>
  )
}
