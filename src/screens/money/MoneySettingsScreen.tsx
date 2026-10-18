import { useState } from 'react'
import { ConfirmButton } from '../../components/ui'
import type { Theme } from '../../finance/types'
import { useFinance } from '../../store/useFinance'
import { usd } from './shared'

function NumberField({ label, value, onChange, step = 1, min, max, hint }: { label: string; value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number; hint?: string }) {
  return (
    <label className="fin-field">
      <span>{label}</span>
      <input
        className="input num"
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value)
          if (Number.isFinite(n)) onChange(n)
        }}
      />
      {hint && <span className="meta">{hint}</span>}
    </label>
  )
}

export default function MoneySettingsScreen() {
  const ledger = useFinance((s) => s.ledger)
  const status = useFinance((s) => s.status)
  const update = useFinance((s) => s.updateSettings)
  const updateTheme = useFinance((s) => s.updateTheme)
  const addTheme = useFinance((s) => s.addTheme)
  const removeTheme = useFinance((s) => s.removeTheme)
  const forward = useFinance((s) => s.forward)
  const reset = useFinance((s) => s.resetFinance)
  const st = ledger.settings
  const [filter, setFilter] = useState('')
  const [draft, setDraft] = useState({ key: '', symbol: '' })
  const themes = st.themes.filter((t) => !filter || `${t.key} ${t.symbol} ${t.aliases.join(' ')}`.toLowerCase().includes(filter.toLowerCase()))
  const weightSum = st.coreTargets.reduce((a, t) => a + t.weight, 0)

  return (
    <div className="page fin-page">
      <div className="page-head">
        <div className="page-head-text">
          <h1>Money settings</h1>
        </div>
      </div>

      <section className="card stack stack-sm" style={{ marginBottom: 16 }}>
        <span className="label">Guardrails</span>
        <div className="fin-grid">
          <NumberField
            label="Thesis sleeve, % of everything"
            value={st.sleevePct}
            min={0}
            max={50}
            onChange={(n) => update({ sleevePct: Math.max(0, Math.min(50, n)), corePct: Math.max(0, 100 - Math.max(0, Math.min(50, n))) })}
            hint={`Core target follows: ${st.corePct}%`}
          />
          <NumberField label="Largest single bet, $" value={st.perBetCap} step={50} min={10} onChange={(n) => update({ perBetCap: Math.max(10, n) })} />
          <NumberField
            label="Default auto-exit for down bets, %"
            value={st.defaultAutoExitPct}
            step={10}
            max={-10}
            min={-100}
            onChange={(n) => update({ defaultAutoExitPct: -Math.min(100, Math.max(10, Math.abs(n))) })}
            hint="−100 closes once you've lost what you put in"
          />
          <NumberField label="Borrow fee on down bets, %/yr" value={st.borrowFeePct} step={0.5} min={0} onChange={(n) => update({ borrowFeePct: Math.max(0, n) })} hint="Mock. The real broker sets this." />
          <NumberField label="Cooling-off above, $" value={st.coolOffAboveUsd} step={50} min={0} onChange={(n) => update({ coolOffAboveUsd: Math.max(0, n) })} hint={`${st.coolOffDays} days before a purchase can be bought`} />
          <NumberField label="Monthly transfer in, $" value={st.monthlyDepositUsd} step={50} min={0} onChange={(n) => update({ monthlyDepositUsd: Math.max(0, n) })} hint="On the first market day of each month" />
        </div>
        <p className="meta" style={{ margin: 0 }}>Codes last two minutes and work once. Quantities are always worked out from dollars. Those two don't have settings.</p>
      </section>

      <section className="card stack stack-sm" style={{ marginBottom: 16 }}>
        <span className="label">Core mix {weightSum !== 100 && <span className="is-down">· adds up to {weightSum}%, should be 100</span>}</span>
        {st.coreTargets.map((t, i) => (
          <div key={t.symbol} className="row" style={{ gap: 10 }}>
            <strong className="mono" style={{ width: 56 }}>
              {t.symbol}
            </strong>
            <span style={{ flex: 1 }} className="meta">
              {t.label}
            </span>
            <input
              className="input num"
              type="number"
              style={{ width: 80 }}
              value={t.weight}
              onChange={(e) => update({ coreTargets: st.coreTargets.map((x, j) => (j === i ? { ...x, weight: Number(e.target.value) || 0 } : x)) })}
              aria-label={`${t.symbol} weight`}
            />
            <span className="meta">%</span>
          </div>
        ))}
      </section>

      <section className="card stack stack-sm" style={{ marginBottom: 16 }}>
        <span className="label">Themes → funds · {st.themes.length}</span>
        <p className="meta" style={{ margin: 0 }}>
          What a word in a sentence buys. Edit a ticker, add aliases (comma-separated), or add a theme. Check a ticker trades at your broker before going live.
        </p>
        <input className="input" placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <div className="fin-themes">
          {themes.map((t) => (
            <ThemeRow key={t.key} theme={t} onChange={(p) => updateTheme(t.key, p)} onRemove={() => removeTheme(t.key)} />
          ))}
        </div>
        <form
          className="row row-wrap"
          style={{ gap: 6 }}
          onSubmit={(e) => {
            e.preventDefault()
            const key = draft.key.trim().toLowerCase()
            const symbol = draft.symbol.trim().toUpperCase()
            if (!key || !/^[A-Z.]{1,6}$/.test(symbol)) return
            addTheme({ key, label: key.charAt(0).toUpperCase() + key.slice(1), symbol, aliases: [], drift: 0.05, vol: 0.25, base: 40 })
            setDraft({ key: '', symbol: '' })
          }}
        >
          <input className="input" style={{ flex: 2, minWidth: 140 }} placeholder="theme, e.g. cocoa" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} />
          <input className="input mono" style={{ flex: 1, minWidth: 80 }} placeholder="TICKER" value={draft.symbol} onChange={(e) => setDraft({ ...draft, symbol: e.target.value })} />
          <button type="submit" className="btn btn-sm">
            Add theme
          </button>
        </form>
      </section>

      <section className="card stack stack-sm" style={{ marginBottom: 16 }}>
        <span className="label">Connections</span>
        <dl className="fin-card-lines">
          <div>
            <dt>Broker</dt>
            <dd>{status.broker === 'mock' ? 'MockBroker — fills at simulated closes' : `${status.broker} — selected, not wired yet`}</dd>
          </div>
          <div>
            <dt>Bank</dt>
            <dd>{status.bank === 'mock' ? 'MockBank — deposits arrive instantly' : `${status.bank} — selected, not wired yet`}</dd>
          </div>
          <div>
            <dt>Parser</dt>
            <dd>{status.parser === 'claude' ? 'Claude, with the offline grammar first' : 'Offline grammar only (set ANTHROPIC_API_KEY on the server for Claude)'}</dd>
          </div>
          <div>
            <dt>Passcode</dt>
            <dd>{status.passcode ? 'On — set by PASSCODE on the server' : status.known ? 'Off — set PASSCODE on the server to lock the app' : 'No server (local dev)'}</dd>
          </div>
        </dl>
        <p className="meta" style={{ margin: 0 }}>BROKER=mock|alpaca and BANK=mock|plaid on the server choose the adapter. The adapters live in src/finance/adapters.ts.</p>
      </section>

      <section className="card stack stack-sm">
        <span className="label">Simulator</span>
        <div className="row row-wrap" style={{ gap: 6 }}>
          <button type="button" className="btn btn-sm" onClick={() => forward(21)}>
            Fast-forward 30 days
          </button>
          <button type="button" className="btn btn-sm" onClick={() => forward(63)}>
            90 days
          </button>
          <button type="button" className="btn btn-sm" onClick={() => forward(252)}>
            A year
          </button>
          <ConfirmButton className="btn btn-sm btn-ghost" confirmLabel="Yes, back to the sample" onConfirm={reset}>
            Reset money to the sample
          </ConfirmButton>
        </div>
        <p className="meta" style={{ margin: 0 }}>
          Starting balance in the sample: {usd(10_000)}. The simulated day also moves on its own each market day you open the app.
        </p>
      </section>
    </div>
  )
}

function ThemeRow({ theme, onChange, onRemove }: { theme: Theme; onChange: (p: Partial<Theme>) => void; onRemove: () => void }) {
  const [aliases, setAliases] = useState(theme.aliases.join(', '))
  return (
    <div className="fin-theme-row">
      <span className="truncate">{theme.label}</span>
      <input className="input mono" value={theme.symbol} onChange={(e) => onChange({ symbol: e.target.value.toUpperCase().slice(0, 6) })} aria-label={`${theme.label} ticker`} />
      <input
        className="input"
        value={aliases}
        onChange={(e) => setAliases(e.target.value)}
        onBlur={() => onChange({ aliases: aliases.split(',').map((a) => a.trim().toLowerCase()).filter(Boolean) })}
        aria-label={`${theme.label} aliases`}
        placeholder="aliases"
      />
      <button type="button" className="btn btn-sm btn-ghost" onClick={onRemove} aria-label={`Remove ${theme.label}`}>
        ✕
      </button>
    </div>
  )
}
