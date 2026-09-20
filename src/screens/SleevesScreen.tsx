import { useState } from 'react'
import { Link } from 'react-router-dom'
import { confidenceColor } from '../lib/color'
import type { Cadence } from '../lib/types'
import { usePortfolio, useValuesView, type SleeveView } from '../store/derived'
import { AlignPill } from './ValuesScreen'
import { useHorizon } from '../store/useHorizon'
import {
  ConfidenceBar,
  Delta,
  Field,
  PercentSlider,
  Stat,
  formatDate,
  formatUsd,
} from '../components/ui'

const CADENCE_LABEL: Record<Cadence, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  'on-confidence-change': 'Whenever confidence moves',
}

export default function SleevesScreen() {
  const portfolio = usePortfolio()

  return (
    <div className="page">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Allocation</h1>
          <p className="lede">
            Each sleeve points money at one branch of your beliefs and carries its own rules. Long-horizon goals
            are funded from here. Change a target and the drift recalculates as you drag — nothing is sent anywhere.
          </p>
        </div>
      </div>

      <section className="card stack stack-md" style={{ marginBottom: 30 }}>
        <div className="row row-wrap" style={{ gap: 40 }}>
          <Stat label="Portfolio" value={formatUsd(portfolio.totalUsd)} sub="sample figures" />
          <Stat
            label="Pointed at the map"
            value={`${(100 - portfolio.cashPct).toFixed(1)}%`}
            sub={`${formatUsd(portfolio.investedUsd)} across ${portfolio.sleeves.length} sleeves`}
          />
          <Stat label="Unallocated" value={`${portfolio.cashPct.toFixed(1)}%`} sub={formatUsd(portfolio.cashUsd)} />
          <Stat
            label="Largest drift"
            value={
              <Delta
                value={
                  portfolio.sleeves.reduce(
                    (worst, s) => (Math.abs(s.driftPct) > Math.abs(worst) ? s.driftPct : worst),
                    0,
                  )
                }
                suffix="pt"
              />
            }
            sub="current minus target"
          />
        </div>

        <div className="stack stack-sm">
          <span className="label">The whole book</span>
          <div className="row" style={{ gap: 0, height: 26, borderRadius: 4, overflow: 'hidden' }}>
            {portfolio.sleeves.map((s) => (
              <div
                key={s.sleeve.id}
                title={`${s.sleeve.name} — ${s.currentPct.toFixed(1)}% now, ${s.targetPct}% target`}
                style={{
                  width: `${Math.max(2, s.currentPct)}%`,
                  background: confidenceColor(s.branchConfidence),
                  opacity: 0.82,
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  fontSize: 10.5,
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {s.currentPct > 6 ? `${s.currentPct.toFixed(1)}%` : ''}
              </div>
            ))}
            <div
              style={{
                flex: 1,
                background: 'var(--paper-deep)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 10.5,
                color: 'var(--ink-3)',
              }}
            >
              {portfolio.cashPct.toFixed(1)}% unallocated
            </div>
          </div>
          <div className="row row-wrap" style={{ gap: 16 }}>
            {portfolio.sleeves.map((s) => (
              <span key={s.sleeve.id} className="row meta" style={{ gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: confidenceColor(s.branchConfidence),
                  }}
                />
                {s.sleeve.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="stack stack-lg">
        {portfolio.sleeves.map((s) => (
          <SleeveCard key={s.sleeve.id} view={s} />
        ))}
      </div>
    </div>
  )
}

function SleeveCard({ view }: { view: SleeveView }) {
  const updateSleeve = useHorizon((s) => s.updateSleeve)
  const values = useValuesView()
  const [editingRules, setEditingRules] = useState(false)
  const s = view.sleeve
  const over = view.driftPct > 0

  return (
    <section className="card stack stack-md">
      <div className="row row-between row-wrap" style={{ gap: 18, alignItems: 'flex-start' }}>
        <div className="stack stack-xs" style={{ minWidth: 0 }}>
          <span className="label">Sleeve · opened {formatDate(s.createdAt)}</span>
          <h3>{s.name}</h3>
          <p className="meta" style={{ margin: 0 }}>
            Pointed at{' '}
            <Link to={`/beliefs/${s.rootId}`} style={{ color: 'var(--accent)' }}>
              {view.root?.label ?? s.rootId}
            </Link>{' '}
            · {view.companyCount} companies under that branch
          </p>
        </div>
        <div className="row row-wrap" style={{ gap: 34 }}>
          <Stat label="Now" value={`${view.currentPct.toFixed(1)}%`} sub={formatUsd(view.valueUsd)} />
          <Stat label="Target" value={`${view.targetPct.toFixed(1)}%`} />
          <Stat
            label="Drift"
            value={<Delta value={view.driftPct} suffix="pt" />}
            sub={`${over ? 'over' : 'under'} by ${formatUsd(Math.abs(view.driftUsd))}`}
          />
          <Stat
            label="Branch confidence"
            value={view.branchConfidence.toFixed(0)}
            color={confidenceColor(view.branchConfidence)}
            sub={view.belowExit ? `below the ${s.exitBelow} exit rule` : `exit rule at ${s.exitBelow}`}
          />
        </div>
      </div>

      {s.note && (
        <p className="prose-sm" style={{ margin: 0, maxWidth: '70ch' }}>
          {s.note}
        </p>
      )}

      {view.belowExit && (
        <div
          className="card-quiet"
          style={{ background: 'var(--contradict-soft)', borderColor: '#e0c3b7', padding: '12px 16px' }}
        >
          <p className="prose-sm" style={{ margin: 0, color: 'var(--contradict)' }}>
            Branch confidence is under this sleeve's exit threshold. A flag is waiting in the{' '}
            <Link to="/money/review" style={{ color: 'inherit' }}>
              review queue
            </Link>
            . Horizon will not act on it.
          </p>
        </div>
      )}

      <div className="grid-2">
        <div className="stack stack-sm">
          <span className="label">Target allocation</span>
          <PercentSlider
            value={s.targetPct}
            min={0}
            max={30}
            step={0.5}
            onChange={(v) => updateSleeve(s.id, { targetPct: v })}
          />
          <div className="stack stack-xs">
            <div className="row row-between">
              <span className="meta">Current {view.currentPct.toFixed(1)}%</span>
              <span className="meta">Target {s.targetPct.toFixed(1)}%</span>
            </div>
            <div className="bar" style={{ height: 8 }}>
              <div
                className="bar-fill"
                style={{
                  width: `${Math.min(100, (view.currentPct / Math.max(s.targetPct, view.currentPct, 1)) * 100)}%`,
                  background: confidenceColor(view.branchConfidence),
                  opacity: 0.75,
                }}
              />
              <div
                className="bar-tick"
                style={{
                  left: `${Math.min(100, (s.targetPct / Math.max(s.targetPct, view.currentPct, 1)) * 100)}%`,
                }}
              />
            </div>
            <span className="meta">
              {Math.abs(view.driftPct) < 0.1
                ? 'On target.'
                : `${formatUsd(Math.abs(view.driftUsd))} would ${over ? 'come out' : 'go in'} to close the drift.`}
            </span>
          </div>
        </div>

        <div className="stack stack-sm">
          <div className="row row-between">
            <span className="label">Rules</span>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditingRules((v) => !v)}>
              {editingRules ? 'Done' : 'Edit'}
            </button>
          </div>
          {editingRules ? (
            <div className="stack stack-sm">
              <Field label="Most in any one company (% of book)">
                <PercentSlider
                  value={s.rules.maxSinglePositionPct}
                  min={1}
                  max={10}
                  step={0.5}
                  onChange={(v) => updateSleeve(s.id, { rules: { ...s.rules, maxSinglePositionPct: v } })}
                />
              </Field>
              <Field label="Smallest company, by market cap ($m)">
                <input
                  className="input"
                  type="number"
                  min={0}
                  step={100}
                  value={s.rules.minMarketCapM}
                  onChange={(e) => updateSleeve(s.id, { rules: { ...s.rules, minMarketCapM: Number(e.target.value) } })}
                />
              </Field>
              <Field label="Revisit">
                <select
                  className="select"
                  value={s.cadence}
                  onChange={(e) => updateSleeve(s.id, { cadence: e.target.value as Cadence })}
                >
                  {(Object.keys(CADENCE_LABEL) as Cadence[]).map((c) => (
                    <option key={c} value={c}>
                      {CADENCE_LABEL[c]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Flag the sleeve if branch confidence drops below">
                <PercentSlider
                  value={s.exitBelow}
                  min={10}
                  max={90}
                  step={1}
                  suffix=""
                  onChange={(v) => updateSleeve(s.id, { exitBelow: v })}
                />
              </Field>
            </div>
          ) : (
            <ul className="stack stack-xs" style={{ margin: 0, paddingLeft: 18 }}>
              <li className="prose-sm" style={{ fontSize: 15 }}>
                No more than <span className="num">{s.rules.maxSinglePositionPct}%</span> of the book in any one
                company.
              </li>
              <li className="prose-sm" style={{ fontSize: 15 }}>
                Nothing below <span className="num">${s.rules.minMarketCapM.toLocaleString()}m</span> in market
                cap.
              </li>
              <li className="prose-sm" style={{ fontSize: 15 }}>
                Revisit: {CADENCE_LABEL[s.cadence].toLowerCase()}.
              </li>
              <li className="prose-sm" style={{ fontSize: 15 }}>
                Flag the sleeve if branch confidence falls below <span className="num">{s.exitBelow}</span>.
              </li>
            </ul>
          )}
          {view.breaches.length > 0 && (
            <div className="stack stack-xs" style={{ paddingTop: 6 }}>
              <span className="label" style={{ color: 'var(--contradict)' }}>
                Rules currently broken
              </span>
              {view.breaches.map((b, i) => (
                <span key={i} className="meta" style={{ color: 'var(--contradict)' }}>
                  {b}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="scroll-x">
        <table className="table">
          <thead>
            <tr>
              <th>Position</th>
              <th className="right">Value</th>
              <th className="right">Of book</th>
              <th className="right">Of sleeve</th>
              <th style={{ width: 150, paddingLeft: 16 }}>Confidence</th>
              <th className="right">Values</th>
            </tr>
          </thead>
          <tbody>
            {view.positions.map((p) => (
              <tr key={p.companyId}>
                <td>
                  <Link to={`/beliefs/${p.companyId}`} style={{ color: 'var(--ink)', textDecoration: 'none' }}>
                    {p.node?.label ?? p.companyId}
                  </Link>{' '}
                  <span className="num meta">{p.node?.ticker}</span>
                  {(p.breachesCap || p.breachesSize) && (
                    <span className="chip chip-contradict" style={{ marginLeft: 8 }}>
                      breaks a rule
                    </span>
                  )}
                </td>
                <td className="right num">{formatUsd(p.valueUsd)}</td>
                <td className="right num">{p.pctOfPortfolio.toFixed(2)}%</td>
                <td className="right num">{p.pctOfSleeve.toFixed(0)}%</td>
                <td>
                  <div className="row" style={{ gap: 8 }}>
                    <ConfidenceBar value={p.confidence} width={80} />
                    <span className="num meta" style={{ color: confidenceColor(p.confidence) }}>
                      {p.confidence.toFixed(0)}
                    </span>
                  </div>
                </td>
                <td className="right">
                  <AlignPill score={values.byCompany[p.companyId]?.score ?? null} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
