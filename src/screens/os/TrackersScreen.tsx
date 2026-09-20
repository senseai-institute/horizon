import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ConfirmButton, Field } from '../../components/ui'
import { todayKey } from '../../os/day'
import { dayKeys, markKey, trackerDayProgress, trackerDue, WEEKDAY_SHORT, weekdayOf } from '../../os/everyday'
import type { Tracker } from '../../os/types'
import { useOS } from '../../store/useOS'

/**
 * Trackers. The piece of paper on the fridge — names down the side, days
 * across the top, a box per dose — given a home. The interface is the whole
 * feature: a grid you can read in one glance and tick with one tap.
 */
export default function TrackersScreen() {
  const trackers = useOS((s) => s.trackers)
  const { toggleMark, addTracker, updateTracker } = useOS.getState()
  const [params, setParams] = useSearchParams()
  const [creating, setCreating] = useState(params.get('new') === '1')
  const [title, setTitle] = useState('')
  const [rows, setRows] = useState('')
  const [slots, setSlots] = useState('')
  const [cadence, setCadence] = useState<Tracker['cadence']>('daily')
  const [weekday, setWeekday] = useState(0)
  const [note, setNote] = useState('')
  const live = trackers.filter((t) => !t.archived)
  const days = dayKeys(14)
  const today = todayKey()

  return (
    <div className="page page-wide">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Trackers</h1>
          <p className="lede">
            The piece of paper on the fridge. Names down the side, days across the top, a box per dose. Cat medicine,
            plants, the mat. Tick it here or from the Morning; it is the same paper.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setCreating((v) => !v)}>
          {creating ? 'Cancel' : 'New tracker'}
        </button>
      </div>

      {creating && (
        <section className="card stack stack-md" style={{ background: 'var(--paper-sunken)', marginBottom: 26 }}>
          <h3>A new piece of paper</h3>
          <div className="grid-2">
            <Field label="Title"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Cat medicine" /></Field>
            <Field label="Cadence">
              <div className="row" style={{ gap: 8 }}>
                <select className="select" value={cadence} onChange={(e) => setCadence(e.target.value as Tracker['cadence'])}>
                  <option value="daily">Every day</option>
                  <option value="weekdays">Weekdays</option>
                  <option value="weekly">Once a week</option>
                </select>
                {cadence === 'weekly' && (
                  <select className="select" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
                    {WEEKDAY_SHORT.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                )}
              </div>
            </Field>
            <Field label="Rows — the names, comma separated"><input className="input" value={rows} onChange={(e) => setRows(e.target.value)} placeholder="Pixel, Mochi" /></Field>
            <Field label="Boxes per day — leave empty for one"><input className="input" value={slots} onChange={(e) => setSlots(e.target.value)} placeholder="AM, PM" /></Field>
          </div>
          <Field label="A note at the top of the paper"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Half a tablet in food, twice a day until the 30th." /></Field>
          <div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!title.trim() || !rows.trim()}
              onClick={() => {
                const id = addTracker({
                  title: title.trim(),
                  note: note.trim() || undefined,
                  rows: rows.split(',').map((r) => r.trim()).filter(Boolean),
                  slots: slots.trim() ? slots.split(',').map((x) => x.trim()).filter(Boolean) : [''],
                  cadence,
                  weekday: cadence === 'weekly' ? weekday : undefined,
                })
                setTitle(''); setRows(''); setSlots(''); setNote(''); setCreating(false)
                setParams({ id })
              }}
            >
              Put it on the fridge
            </button>
          </div>
        </section>
      )}

      <div className="stack stack-lg">
        {live.length === 0 && <div className="empty"><span className="meta">No trackers. Make one for whatever you keep forgetting.</span></div>}
        {live.map((t) => {
          const due = days.filter((d) => trackerDue(t, d))
          const shown = due.slice(-10)
          const streak = (() => { let n = 0; for (const d of [...due].reverse()) { if (d === today) continue; const p = trackerDayProgress(t, d); if (p.done === p.total) n++; else break } return n })()
          const todayP = trackerDue(t, today) ? trackerDayProgress(t, today) : null
          const born = t.createdAt.slice(0, 10)
          return (
            <section key={t.id} className="paper stack stack-sm" id={t.id}>
              <div className="row row-between row-wrap" style={{ gap: 8 }}>
                <div>
                  <h2 style={{ fontSize: 22 }}>{t.title}</h2>
                  {t.note && <p className="meta" style={{ margin: '2px 0 0', fontStyle: 'italic' }}>{t.note}</p>}
                </div>
                <div className="row" style={{ gap: 14 }}>
                  <span className="meta">{t.cadence === 'daily' ? 'every day' : t.cadence === 'weekdays' ? 'weekdays' : `${WEEKDAY_SHORT[t.weekday ?? 0]}s`}</span>
                  {streak > 0 && <span className="meta"><span className="num" style={{ color: 'var(--ink)' }}>{streak}</span> in a row</span>}
                  {todayP && <span className="meta">today <span className="num" style={{ color: 'var(--ink)' }}>{todayP.done}/{todayP.total}</span></span>}
                </div>
              </div>
              <div className="scroll-x">
                <table className="tracker">
                  <thead>
                    <tr>
                      <th />
                      {shown.map((d) => (
                        <th key={d} colSpan={t.slots.length} className={d === today ? 'is-today' : ''}>
                          <span className="meta" style={{ display: 'block' }}>{WEEKDAY_SHORT[weekdayOf(d)]}</span>
                          <span className="num">{Number(d.slice(-2))}</span>
                        </th>
                      ))}
                    </tr>
                    {t.slots.length > 1 && (
                      <tr className="slots">
                        <th />
                        {shown.map((d) => t.slots.map((s) => <th key={d + s} className={d === today ? 'is-today' : ''}><span className="meta">{s}</span></th>))}
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {t.rows.map((r) => (
                      <tr key={r}>
                        <th scope="row">{r}</th>
                        {shown.map((d) =>
                          t.slots.map((s) => {
                            const on = Boolean(t.marks[d]?.[markKey(r, s)])
                            const past = d < today && d >= born
                            return (
                              <td key={d + s} className={d === today ? 'is-today' : ''}>
                                <button
                                  type="button"
                                  className={`box${on ? ' is-on' : ''}${!on && past ? ' is-missed' : ''}`}
                                  aria-label={`${r}${s ? ' ' + s : ''} on ${d}: ${on ? 'done' : 'not done'}`}
                                  aria-pressed={on}
                                  onClick={() => toggleMark(t.id, d, r, s)}
                                >
                                  {on ? '✓' : ''}
                                </button>
                              </td>
                            )
                          }),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="row row-between row-wrap" style={{ gap: 8 }}>
                <span className="meta">A missed box stays empty. Nothing nags; the paper just shows what happened.</span>
                <ConfirmButton confirmLabel="Take it off the fridge" onConfirm={() => updateTracker(t.id, { archived: true })}>Archive</ConfirmButton>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
