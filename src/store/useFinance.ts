import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { makeBank, makeBroker, type BankName, type BrokerName } from '../finance/adapters'
import { sentenceToday, todayLocal } from '../finance/calendar'
import * as engine from '../finance/engine'
import { parseCommand, withTheme } from '../finance/parser'
import { defaultSettings, seedLedger } from '../finance/seed'
import type { BetSpec, Command, Ledger, Purchase, Settings, Subscription, Theme } from '../finance/types'
import { useHorizon } from './useHorizon'
import { useOS } from './useOS'

export const FINANCE_STORAGE_KEY = 'horizon.finance.v1'

/** What the server says about itself: which adapters, whether Claude parses. */
export interface ServerStatus {
  broker: BrokerName
  bank: BankName
  parser: 'claude' | 'regex'
  passcode: boolean
  /** False until /api/status has answered (or failed, as it does under `vite dev`). */
  known: boolean
}

export type SubmitResult =
  | { kind: 'proposal'; proposalId: string; via: 'regex' | 'claude' }
  | { kind: 'choose'; message: string; suggestions: Theme[]; partial: Omit<BetSpec, 'themeKey'> }
  | { kind: 'error'; message: string }
  | { kind: 'done'; message: string }

interface FinanceState {
  ledger: Ledger
  status: ServerStatus
  /** The card on screen. One at a time. */
  activeId: string | null

  loadStatus: () => Promise<void>
  catchUp: () => number
  forward: (days: number) => void
  submit: (text: string) => Promise<SubmitResult>
  proposeCommand: (cmd: Exclude<Command, { kind: 'forward' }>) => SubmitResult
  chooseTheme: (partial: Omit<BetSpec, 'themeKey'>, theme: Theme) => SubmitResult
  confirm: (proposalId: string, code: string) => Promise<{ ok: boolean; message: string }>
  dismiss: (proposalId: string) => void
  setCancelRedirect: (proposalId: string, redirect: Subscription['redirectTo']) => void
  addNote: (betId: string, text: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  updateTheme: (key: string, patch: Partial<Theme>) => void
  addTheme: (theme: Theme) => void
  removeTheme: (key: string) => void
  updatePurchase: (id: string, patch: Partial<Pick<Purchase, 'monthly' | 'wantBy' | 'note' | 'status'>>) => void
  resetFinance: () => void
}

const fresh = () => seedLedger(todayLocal())

/** Asks the server's Claude parser to rewrite free text into the grammar. */
async function claudeRewrite(text: string, ledger: Ledger): Promise<string | null> {
  try {
    const r = await fetch('/api/parse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text,
        today: sentenceToday(ledger.asOf),
        themes: ledger.settings.themes.map((t) => t.key),
        subscriptions: ledger.subscriptions.filter((s) => s.status === 'active').map((s) => s.name),
        purchases: ledger.purchases.filter((p) => p.status === 'planned').map((p) => p.title),
        bets: ledger.bets.filter((b) => b.status === 'open').map((b) => b.themeKey),
      }),
    })
    if (!r.ok) return null
    const data = (await r.json()) as { canonical?: string | null }
    return data.canonical ?? null
  } catch {
    return null
  }
}

export const useFinance = create<FinanceState>()(
  persist(
    (set, get) => {
      const broker = () => makeBroker(get().status.broker, () => get().ledger)
      const bank = () => makeBank(get().status.bank, () => get().ledger)

      const fromPropose = (r: engine.ProposeResult): SubmitResult => {
        if (!r.ok) return { kind: 'error', message: r.message }
        set({ ledger: r.ledger, activeId: r.proposal.id })
        return { kind: 'proposal', proposalId: r.proposal.id, via: 'regex' }
      }

      return {
        ledger: fresh(),
        status: { broker: 'mock', bank: 'mock', parser: 'regex', passcode: false, known: false },
        activeId: null,

        loadStatus: async () => {
          try {
            const r = await fetch('/api/status')
            if (!r.ok) throw new Error(String(r.status))
            const s = (await r.json()) as Partial<ServerStatus>
            set({
              status: {
                broker: s.broker === 'alpaca' ? 'alpaca' : 'mock',
                bank: s.bank === 'plaid' ? 'plaid' : 'mock',
                parser: s.parser === 'claude' ? 'claude' : 'regex',
                passcode: Boolean(s.passcode),
                known: true,
              },
            })
          } catch {
            /* No server (vite dev, a static host): everything stays mock and offline. */
            set((st) => ({ status: { ...st.status, known: true } }))
          }
        },

        catchUp: () => {
          const { ledger, days } = engine.catchUp(get().ledger, todayLocal())
          if (days) set({ ledger })
          return days
        },

        forward: (days) => set({ ledger: engine.advance(get().ledger, days) }),

        submit: async (text) => {
          const { ledger, status } = get()
          const today = sentenceToday(ledger.asOf)
          let parsed = parseCommand(text, { themes: ledger.settings.themes, today })
          let via: 'regex' | 'claude' = 'regex'
          if (!parsed.ok && parsed.reason === 'malformed' && status.parser === 'claude') {
            const canonical = await claudeRewrite(text, ledger)
            if (canonical) {
              const again = parseCommand(canonical, { themes: ledger.settings.themes, today })
              if (again.ok || again.reason === 'unknown-theme') {
                parsed = again
                via = 'claude'
                /* The bet keeps the words you actually typed. */
                if (parsed.ok && parsed.command.kind === 'bet') parsed.command.sentence = text.trim()
                if (!parsed.ok && parsed.reason === 'unknown-theme') parsed.partial.sentence = text.trim()
              }
            }
          }
          if (!parsed.ok) {
            if (parsed.reason === 'unknown-theme') return { kind: 'choose', message: parsed.message, suggestions: parsed.suggestions, partial: parsed.partial }
            return { kind: 'error', message: parsed.message }
          }
          const cmd = parsed.command
          if (cmd.kind === 'forward') {
            get().forward(cmd.days)
            return { kind: 'done', message: `Fast-forwarded ${cmd.days} market days to ${get().ledger.asOf}.` }
          }
          const r = get().proposeCommand(cmd)
          return r.kind === 'proposal' ? { ...r, via } : r
        },

        proposeCommand: (cmd) => fromPropose(engine.propose(get().ledger, cmd, Date.now())),

        chooseTheme: (partial, theme) => fromPropose(engine.propose(get().ledger, withTheme(partial, theme), Date.now())),

        confirm: async (proposalId, code) => {
          const r = await engine.confirm(get().ledger, proposalId, code, Date.now(), broker(), bank())
          set({ ledger: r.ledger })
          if (!r.ok) return { ok: false, message: r.message }
          /* The card stays up to say it worked, then closes itself. */
          /* The rest of Horizon hears about it: a to-do, a line in the journal. */
          for (const e of r.effects) {
            if (e.kind === 'todo') useOS.getState().addTodo(e.text)
            if (e.kind === 'note') useHorizon.getState().addNote(e.title, e.detail)
          }
          return { ok: true, message: r.message }
        },

        dismiss: (proposalId) => set({ ledger: engine.dismiss(get().ledger, proposalId), activeId: null }),

        setCancelRedirect: (proposalId, redirect) => set({ ledger: engine.setCancelRedirect(get().ledger, proposalId, redirect) }),

        addNote: (betId, text) => {
          if (!text.trim()) return
          set({ ledger: engine.addJournal(get().ledger, betId, text) })
        },

        updateSettings: (patch) => set((s) => ({ ledger: { ...s.ledger, settings: { ...s.ledger.settings, ...patch } } })),

        updateTheme: (key, patch) =>
          set((s) => ({ ledger: { ...s.ledger, settings: { ...s.ledger.settings, themes: s.ledger.settings.themes.map((t) => (t.key === key ? { ...t, ...patch } : t)) } } })),

        addTheme: (theme) =>
          set((s) => ({ ledger: { ...s.ledger, settings: { ...s.ledger.settings, themes: [...s.ledger.settings.themes.filter((t) => t.key !== theme.key), theme] } } })),

        removeTheme: (key) => set((s) => ({ ledger: { ...s.ledger, settings: { ...s.ledger.settings, themes: s.ledger.settings.themes.filter((t) => t.key !== key) } } })),

        updatePurchase: (id, patch) => set((s) => ({ ledger: { ...s.ledger, purchases: s.ledger.purchases.map((p) => (p.id === id ? { ...p, ...patch } : p)) } })),

        resetFinance: () => set({ ledger: fresh(), activeId: null }),
      }
    },
    {
      name: FINANCE_STORAGE_KEY,
      version: 1,
      partialize: (s) => ({ ledger: s.ledger }),
      /* Saved state from an older or broken build: a ledger that doesn't fit is replaced with the sample, never crashed on. */
      merge: (persisted, current) => {
        const l = (persisted as { ledger?: Partial<Ledger> } | null)?.ledger
        const lists = ['days', 'holdings', 'bets', 'journal', 'orders', 'deposits', 'snapshots', 'subscriptions', 'purchases', 'transactions', 'proposals'] as const
        const fits =
          l &&
          l.version === 1 &&
          typeof l.asOf === 'string' &&
          typeof l.account?.cash === 'number' &&
          l.prices !== null &&
          typeof l.prices === 'object' &&
          Array.isArray(l.settings?.themes) &&
          lists.every((k) => Array.isArray(l[k]))
        if (!fits) return current
        const defaults = defaultSettings()
        return { ...current, ledger: { ...(l as Ledger), settings: { ...defaults, ...l.settings } } }
      },
    },
  ),
)
