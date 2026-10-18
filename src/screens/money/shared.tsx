import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { longDay } from '../../finance/calendar'
import type { BetSpec, Proposal, Theme } from '../../finance/types'
import { useFinance, type SubmitResult } from '../../store/useFinance'

export const usd = (n: number) => `${n < 0 ? '−' : ''}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`
export const usd2 = (n: number) => `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const signedUsd = (n: number, cents = false) => `${n >= 0 ? '+' : '−'}${(cents ? usd2 : usd)(Math.abs(n))}`
export const pct = (n: number, digits = 1) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(digits)}%`
export const tone = (n: number) => (n > 0.005 ? 'is-up' : n < -0.005 ? 'is-down' : '')

/** The persistent banner. Stays until a real broker is wired. */
export function SimBanner() {
  const status = useFinance((s) => s.status)
  const asOf = useFinance((s) => s.ledger.asOf)
  if (status.broker !== 'mock')
    return (
      <div className="fin-banner is-live">
        {status.broker.toUpperCase()} selected · that adapter is not wired yet, so orders will be refused · <Link to="/money/settings">Settings</Link>
      </div>
    )
  return (
    <div className="fin-banner">
      <strong>SIMULATED</strong> · made-up prices and fills · as of {longDay(asOf)}
    </div>
  )
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [])
  const left = Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000))
  return <span className={`num${left < 20 ? ' is-down' : ''}`}>{left ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : 'expired'}</span>
}

/**
 * The proposal card: what will happen, in plain English, and the code that
 * makes it happen. Rendered once, by the Money layout, over whatever screen
 * asked for it.
 */
export function ProposalSheet() {
  const activeId = useFinance((s) => s.activeId)
  const proposal = useFinance((s) => s.ledger.proposals.find((p) => p.id === s.activeId))
  if (!activeId || !proposal) return null
  return <ProposalCard key={proposal.id} proposal={proposal} />
}

function ProposalCard({ proposal }: { proposal: Proposal }) {
  const confirm = useFinance((s) => s.confirm)
  const dismiss = useFinance((s) => s.dismiss)
  const setRedirect = useFinance((s) => s.setCancelRedirect)
  const purchases = useFinance((s) => s.ledger.purchases)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const needsCode = Boolean(proposal.code)

  useEffect(() => {
    input.current?.focus({ preventScroll: true })
  }, [])

  const go = async () => {
    setBusy(true)
    setError(null)
    const r = await confirm(proposal.id, code)
    setBusy(false)
    if (r.ok) setDone(r.message)
    else setError(r.message)
  }

  if (done) return <Toastlike text={done} />

  const live = proposal.status === 'pending'
  return (
    <div className="fin-sheet-scrim" onClick={() => dismiss(proposal.id)}>
      <section className="fin-sheet" role="dialog" aria-label={proposal.title} onClick={(e) => e.stopPropagation()}>
        <div className="fin-sheet-head">
          <span className="label">{needsCode ? 'Proposal · nothing has happened yet' : 'Plan · no money moves'}</span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => dismiss(proposal.id)} aria-label="Dismiss">
            ✕
          </button>
        </div>
        <dl className="fin-card-lines">
          {proposal.lines.map((l) => (
            <div key={l.label}>
              <dt>{l.label}</dt>
              <dd>{l.value}</dd>
            </div>
          ))}
        </dl>
        {proposal.payload.kind === 'cancel' && live && (
          <label className="fin-field">
            <span>Send the freed money to</span>
            <select
              className="select"
              value={proposal.payload.redirect?.kind === 'purchase' ? proposal.payload.redirect.purchaseId : 'cash'}
              onChange={(e) => setRedirect(proposal.id, e.target.value === 'cash' ? { kind: 'cash' } : { kind: 'purchase', purchaseId: e.target.value })}
            >
              <option value="cash">Keep it as cash</option>
              {purchases
                .filter((p) => p.status === 'planned')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
            </select>
          </label>
        )}
        {needsCode ? (
          <form
            className="fin-code"
            onSubmit={(e) => {
              e.preventDefault()
              void go()
            }}
          >
            <div className="fin-code-show">
              <span className="meta">Type this code to {proposal.kind === 'bet' ? 'place it' : 'confirm'}</span>
              <span className="fin-code-value mono">{proposal.code}</span>
              <span className="meta">
                <Countdown expiresAt={proposal.expiresAt} />
              </span>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <input
                ref={input}
                className="input mono fin-code-input"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="code"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                inputMode="text"
                aria-label="Confirmation code"
              />
              <button type="submit" className="btn btn-primary" disabled={busy || code.length < 6}>
                Confirm
              </button>
            </div>
          </form>
        ) : (
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn btn-primary" onClick={() => void go()} disabled={busy}>
              Save the plan
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => dismiss(proposal.id)}>
              Not now
            </button>
          </div>
        )}
        {error && <p className="fin-error">{error}</p>}
      </section>
    </div>
  )
}

function Toastlike({ text }: { text: string }) {
  useEffect(() => {
    const t = setTimeout(() => useFinance.setState({ activeId: null }), 2600)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="fin-sheet-scrim is-light" onClick={() => useFinance.setState({ activeId: null })}>
      <section className="fin-sheet fin-done" role="status">
        <span className="fin-done-mark">✓</span>
        <p style={{ margin: 0 }}>{text}</p>
      </section>
    </div>
  )
}

const EXAMPLES = ['short coffee, 18mo, $100', 'cancel disney+', 'save for a road bike, $1400, by april', 'add $500', 'rebalance', 'ff 30']

/**
 * One line for every horizon. Sits at the bottom of the Money home; the same
 * sentence typed in ⌘K lands here.
 */
export function CommandBox({ initial, onResult }: { initial?: string; onResult?: (r: SubmitResult) => void }) {
  const submit = useFinance((s) => s.submit)
  const chooseTheme = useFinance((s) => s.chooseTheme)
  const parser = useFinance((s) => s.status.parser)
  const [text, setText] = useState(initial ?? '')
  const [busy, setBusy] = useState(false)
  const [reply, setReply] = useState<SubmitResult | null>(null)
  const fired = useRef(false)

  const run = async (t: string) => {
    if (!t.trim()) return
    setBusy(true)
    const r = await submit(t)
    setBusy(false)
    setReply(r.kind === 'proposal' ? null : r)
    if (r.kind === 'proposal' || r.kind === 'done') setText('')
    onResult?.(r)
  }

  useEffect(() => {
    if (initial && !fired.current) {
      fired.current = true
      void run(initial)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial])

  const pick = (partial: Omit<BetSpec, 'themeKey'>, t: Theme) => {
    const r = chooseTheme(partial, t)
    setReply(r.kind === 'proposal' ? null : r)
    if (r.kind === 'proposal') setText('')
  }

  return (
    <div className="fin-command">
      {reply && reply.kind !== 'proposal' && (
        <div className={`fin-reply${reply.kind === 'done' ? ' is-ok' : ''}`}>
          <p style={{ margin: 0 }}>{reply.message}</p>
          {reply.kind === 'choose' && (
            <div className="row row-wrap" style={{ gap: 6, marginTop: 8 }}>
              {reply.suggestions.map((t) => (
                <button key={t.key} type="button" className="chip chip-outline fin-chip" onClick={() => pick(reply.partial, t)}>
                  {t.label} <span className="mono meta">{t.symbol}</span>
                </button>
              ))}
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setReply(null)}>
                None of these
              </button>
            </div>
          )}
        </div>
      )}
      <form
        className="fin-command-row"
        onSubmit={(e) => {
          e.preventDefault()
          void run(text)
        }}
      >
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="short coffee, 18mo, $100"
          aria-label="Say what you want to do with money"
          autoComplete="off"
          enterKeyHint="go"
        />
        <button type="submit" className="btn btn-primary" disabled={busy || !text.trim()}>
          {busy ? '…' : 'Go'}
        </button>
      </form>
      <div className="fin-examples">
        {EXAMPLES.map((e) => (
          <button key={e} type="button" onClick={() => setText(e)}>
            {e}
          </button>
        ))}
        <span className="meta">{parser === 'claude' ? 'Claude reads anything the grammar misses' : 'offline parser'}</span>
      </div>
    </div>
  )
}

export function StatusPill({ status }: { status: 'open' | 'win' | 'loss' | 'flat' }) {
  return <span className={`fin-pill is-${status}`}>{status}</span>
}

export function Arrow({ direction }: { direction: 'up' | 'down' }) {
  return (
    <span className={`fin-arrow ${direction === 'up' ? 'is-up' : 'is-down'}`} aria-label={direction === 'up' ? 'up bet' : 'down bet'}>
      {direction === 'up' ? '↑' : '↓'}
    </span>
  )
}

export function daysLeftLabel(today: string, deadline: string): string {
  const d = Math.round((Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
  return d <= 0 ? 'due' : d < 60 ? `${d}d` : `${Math.round(d / 30.4)}mo`
}
