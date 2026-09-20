import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatDate, relativeTime } from '../../components/ui'
import { bestEpoch } from '../../os/lab'
import type { Experiment } from '../../os/types'
import { useOS } from '../../store/useOS'

/**
 * The lab: datasets you own, experiments the scheduler trains, curves as they
 * come. The chart is one axis, two series in fixed colours, a legend, and a
 * crosshair — nothing more.
 */
export default function LabScreen() {
  const experiments = useOS((s) => s.experiments)
  const datasets = useOS((s) => s.datasets)
  const initiatives = useOS((s) => s.initiatives)
  const { promoteExperiment } = useOS.getState()
  const [params, setParams] = useSearchParams()
  const filter = params.get('initiative')
  const shown = useMemo(() => (filter ? experiments.filter((e) => e.initiativeId === filter) : experiments), [experiments, filter])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const sel = shown.find((e) => e.id === selectedId) ?? shown.find((e) => e.status === 'running') ?? shown[0]
  const titleOf = (id?: string) => initiatives.find((i) => i.id === id)?.title

  return (
    <div className="page page-wide">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Lab</h1>
          <p className="lede">
            Data you own, experiments the machine trains one at a time, curves as they arrive. A run is promoted
            to "the model" by you, against a number chosen before training.
          </p>
        </div>
        <div className="row row-wrap" style={{ gap: 6 }}>
          <button type="button" className={`btn btn-sm${!filter ? ' btn-primary' : ''}`} onClick={() => setParams({})}>All</button>
          {initiatives.filter((i) => experiments.some((e) => e.initiativeId === i.id)).map((i) => (
            <button key={i.id} type="button" className={`btn btn-sm${filter === i.id ? ' btn-primary' : ''}`} onClick={() => setParams({ initiative: i.id })}>{i.title}</button>
          ))}
        </div>
      </div>

      <div className="desk is-map">
        <div className="stack stack-md">
          {sel ? (
            <section className="card stack stack-md">
              <div className="row row-between row-wrap" style={{ gap: 10 }}>
                <div>
                  <span className="label">{sel.status} · {sel.device} · {sel.metrics.length}/{sel.epochs} epochs{sel.initiativeId ? ` · ${titleOf(sel.initiativeId)}` : ''}</span>
                  <h2 style={{ marginTop: 4 }}>{sel.name}</h2>
                </div>
                {sel.status === 'done' && (
                  <button type="button" className="btn btn-primary" onClick={() => promoteExperiment(sel.id)}>Promote to the model</button>
                )}
                {sel.status === 'promoted' && <span className="chip chip-accent">the model</span>}
              </div>
              <p className="prose-sm" style={{ margin: 0 }}>{sel.hypothesis}</p>
              <TrainingChart e={sel} />
              <div className="row row-wrap" style={{ gap: 22 }}>
                {bestEpoch(sel) && (
                  <span className="meta">Best <strong style={{ fontWeight: 500, color: 'var(--ink)' }}>{sel.metricName}</strong> <span className="num" style={{ color: 'var(--ink)' }}>{bestEpoch(sel)!.metric.toFixed(3)}</span> at epoch {bestEpoch(sel)!.epoch}</span>
                )}
                <span className="meta">Dataset: {datasets.find((d) => d.id === sel.datasetId)?.name ?? '—'}</span>
                <span className="meta">Started {relativeTime(sel.createdAt)}{sel.finishedAt ? `, finished ${relativeTime(sel.finishedAt)}` : ''}</span>
              </div>
              <details>
                <summary className="meta" style={{ cursor: 'pointer' }}>Config and table</summary>
                <div className="row row-wrap" style={{ gap: 12, margin: '8px 0' }}>
                  {Object.entries(sel.config).map(([k, v]) => <span key={k} className="chip chip-outline mono">{k}={String(v)}</span>)}
                </div>
                <div className="scroll-x">
                  <table className="table">
                    <thead><tr><th>Epoch</th><th className="right">Train loss</th><th className="right">Val loss</th><th className="right">{sel.metricName}</th></tr></thead>
                    <tbody>{sel.metrics.map((m) => <tr key={m.epoch}><td className="num">{m.epoch}</td><td className="right num">{m.trainLoss.toFixed(3)}</td><td className="right num">{m.valLoss.toFixed(3)}</td><td className="right num">{m.metric.toFixed(3)}</td></tr>)}</tbody>
                  </table>
                </div>
              </details>
              {sel.notes && <p className="meta" style={{ margin: 0 }}>{sel.notes}</p>}
            </section>
          ) : (
            <div className="empty"><h4>No experiments yet</h4><span className="meta">The Experiment stage of an initiative queues a baseline and the idea.</span></div>
          )}

          <section className="stack stack-sm">
            <span className="label">Datasets</span>
            <div className="scroll-x">
              <table className="table">
                <thead><tr><th>Name</th><th>Provenance</th><th className="right">Items</th><th className="right">Size</th><th className="right">Labelled</th></tr></thead>
                <tbody>
                  {(filter ? datasets.filter((d) => d.initiativeId === filter) : datasets).map((d) => (
                    <tr key={d.id}><td>{d.name}<div className="meta mono">{d.path}</div></td><td className="meta" style={{ maxWidth: 280 }}>{d.provenance}</td><td className="right num">{d.items.toLocaleString()}</td><td className="right num">{d.sizeMb >= 1000 ? `${(d.sizeMb / 1000).toFixed(1)} GB` : `${d.sizeMb} MB`}</td><td className="right">{d.labelled ? 'yes' : 'no'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="meta" style={{ margin: 0 }}>Everything on local disk. Provenance is recorded because ownership starts with the data.</p>
          </section>
        </div>

        <div className="stack stack-sm">
          <span className="label">Experiments</span>
          {shown.map((e) => {
            const best = bestEpoch(e)
            return (
              <button key={e.id} type="button" className="card stack stack-xs" style={{ textAlign: 'left', cursor: 'pointer', padding: '12px 14px', borderColor: sel?.id === e.id ? 'var(--accent)' : undefined }} onClick={() => setSelectedId(e.id)}>
                <div className="row row-between"><span style={{ fontWeight: 500, fontSize: 14 }}>{e.name}</span><span className={`chip${e.status === 'running' ? ' chip-accent' : e.status === 'promoted' ? ' chip-support' : ' chip-outline'}`}>{e.status}</span></div>
                <div className="progress" style={{ height: 4 }}><div className="progress-fill" style={{ width: `${(e.metrics.length / e.epochs) * 100}%` }} /></div>
                <span className="meta">{best ? `best ${best.metric.toFixed(3)} · ` : ''}{formatDate(e.createdAt)}{e.initiativeId ? ` · ${titleOf(e.initiativeId)}` : ''}</span>
              </button>
            )
          })}
          <p className="meta" style={{ margin: 0 }}>Experiments come from the <Link to="/initiatives">Experiment stage</Link> of an initiative. One trains at a time.</p>
        </div>
      </div>
    </div>
  )
}

/** Loss curves. One y-axis; two series in fixed order; legend; crosshair on hover. */
function TrainingChart({ e }: { e: Experiment }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 640
  const H = 220
  const PAD = { l: 40, r: 12, t: 10, b: 26 }
  const pts = e.metrics
  const xs = (i: number) => PAD.l + ((i + 1) / Math.max(1, e.epochs)) * (W - PAD.l - PAD.r)
  const all = pts.flatMap((m) => [m.trainLoss, m.valLoss])
  const max = Math.max(0.5, ...all) * 1.05
  const ys = (v: number) => H - PAD.b - (v / max) * (H - PAD.t - PAD.b)
  const path = (key: 'trainLoss' | 'valLoss') => pts.map((m, i) => `${i === 0 ? 'M' : 'L'}${xs(i).toFixed(1)},${ys(m[key]).toFixed(1)}`).join('')
  const ticks = [0, max / 2, max]
  const h = hover !== null ? pts[hover] : null
  return (
    <div className="stack stack-xs">
      <div className="row" style={{ gap: 16 }}>
        <span className="row meta" style={{ gap: 6 }}><span style={{ width: 14, height: 2, background: 'var(--chart-1)' }} />train loss</span>
        <span className="row meta" style={{ gap: 6 }}><span style={{ width: 14, height: 2, background: 'var(--chart-2)' }} />validation loss</span>
        {h && <span className="meta num" style={{ marginLeft: 'auto' }}>epoch {h.epoch} · train {h.trainLoss.toFixed(3)} · val {h.valLoss.toFixed(3)} · {e.metricName} {h.metric.toFixed(3)}</span>}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img"
        aria-label={`Training and validation loss over ${pts.length} epochs`}
        onMouseMove={(ev) => {
          const r = ev.currentTarget.getBoundingClientRect()
          const x = ((ev.clientX - r.left) / r.width) * W
          let best = 0
          let bd = Infinity
          pts.forEach((_, i) => { const d = Math.abs(xs(i) - x); if (d < bd) { bd = d; best = i } })
          setHover(pts.length ? best : null)
        }}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={ys(t)} y2={ys(t)} stroke="var(--rule)" strokeWidth={1} />
            <text x={PAD.l - 6} y={ys(t) + 3} textAnchor="end" style={{ fontFamily: 'var(--mono)', fontSize: 9, fill: 'var(--ink-3)' }}>{t.toFixed(1)}</text>
          </g>
        ))}
        <text x={W - PAD.r} y={H - 8} textAnchor="end" style={{ fontFamily: 'var(--mono)', fontSize: 9, fill: 'var(--ink-3)' }}>epoch {e.epochs}</text>
        <text x={PAD.l} y={H - 8} style={{ fontFamily: 'var(--mono)', fontSize: 9, fill: 'var(--ink-3)' }}>1</text>
        {pts.length > 0 && (
          <>
            <path d={path('trainLoss')} fill="none" stroke="var(--chart-1)" strokeWidth={2} strokeLinejoin="round" />
            <path d={path('valLoss')} fill="none" stroke="var(--chart-2)" strokeWidth={2} strokeLinejoin="round" />
          </>
        )}
        {h && hover !== null && (
          <g>
            <line x1={xs(hover)} x2={xs(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--ink-4)" strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={xs(hover)} cy={ys(h.trainLoss)} r={4} fill="var(--chart-1)" stroke="var(--paper-raised)" strokeWidth={2} />
            <circle cx={xs(hover)} cy={ys(h.valLoss)} r={4} fill="var(--chart-2)" stroke="var(--paper-raised)" strokeWidth={2} />
          </g>
        )}
        {pts.length === 0 && <text x={W / 2} y={H / 2} textAnchor="middle" style={{ fontFamily: 'var(--sans)', fontSize: 12, fill: 'var(--ink-3)' }}>Queued. Curves appear as it trains.</text>}
      </svg>
    </div>
  )
}
