import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { seedGoals } from '../data/seed'
import { seedAgents } from '../os/agents'
import { BioSimulator, flowLevel } from '../os/bio'
import { LocalProvider, makeRuntimeProvider, type BrainContext, type ModelProvider } from '../os/brain'
import { inboxScore, seedInbox } from '../os/inbox'
import { piecesForGoal, roadmapTotal, settlePieces } from '../os/planner'
import type {
  Agent,
  BioSample,
  ChatMsg,
  ChatWindow,
  Download,
  FlowLevel,
  FlowSession,
  InboxItem,
  JourneyPiece,
  Run,
  RunEffect,
  Scope,
  Thread,
} from '../os/types'
import { useHorizon } from './useHorizon'

export const OS_STORAGE_KEY = 'horizon.os.v1'

const nowIso = () => new Date().toISOString()
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const money = (n: number) => `$${Math.round(Math.abs(n)).toLocaleString('en-US')}`

/* ------------------------------------------------------------------ */
/* Seed                                                                */
/* ------------------------------------------------------------------ */

function seedPieces(): JourneyPiece[] {
  const out: JourneyPiece[] = []
  for (const goal of seedGoals) {
    if (goal.status !== 'active') continue
    const drafts = piecesForGoal(goal)
    drafts.forEach((d, i) => {
      out.push({
        ...d,
        id: `${goal.id}:${d.title}`,
        status: 'locked',
        createdAt: goal.createdAt,
        // Pretend the first couple of pieces on the oldest goals are already done.
        ...(goal.id === 'g-house' && i < 2 ? { status: 'done', doneAt: '2026-02-10T10:00:00Z' } : {}),
        ...(goal.id === 'g-toollib' && i < 1 ? { status: 'done', doneAt: '2026-05-02T10:00:00Z' } : {}),
      } as JourneyPiece)
    })
  }
  return settlePieces(out)
}

const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()

function seedRuns(): Run[] {
  return [
    {
      id: 'run-trim-etn',
      agentId: 'ag-trader',
      title: 'Trim Eaton by $4,100',
      intent: 'Grid Deficit is 2.8 points over target. Sell $4,100 of Eaton, the largest and most over-cap position, bringing the sleeve to 18.3% and freeing cash for the house deposit.',
      status: 'awaiting_review',
      steps: [
        { id: 's1', label: 'Check sleeve drift', toolId: 't-drift', status: 'done', log: 'Grid Deficit +2.8pt, $11,700 over.', at: ago(3.2) },
        { id: 's2', label: 'Choose position', status: 'done', log: 'Eaton: 4.4% of book against a 5% cap, 23% of sleeve.', at: ago(3.1) },
        { id: 's3', label: 'Prepare order', toolId: 't-trade', status: 'done', log: 'SELL ETN $4,100 — prepared, not sent.', at: ago(3) },
        { id: 's4', label: 'Human review', status: 'todo' },
        { id: 's5', label: 'Queue for execution', status: 'todo' },
      ],
      effect: { kind: 'trade', sleeveId: 'sl-grid', companyId: 'co-etn', deltaUsd: -4100 },
      createdAt: ago(3.3),
      updatedAt: ago(3),
      progress: 0.6,
    },
    {
      id: 'run-roadmap-toollib',
      agentId: 'ag-planner',
      title: 'Roadmap and cost for the tool library',
      intent: 'Break the tool library into a costed roadmap and raise the goal target to match.',
      status: 'awaiting_review',
      steps: [
        { id: 's1', label: 'Read the goal', status: 'done', at: ago(9.5) },
        { id: 's2', label: 'Draft lines', toolId: 't-roadmap', status: 'done', log: 'Six lines, $27,900, 27 weeks.', at: ago(9.2) },
        { id: 's3', label: 'Human review', status: 'todo' },
        { id: 's4', label: 'Update the goal target', status: 'todo' },
      ],
      effect: {
        kind: 'roadmap',
        goalId: 'g-toollib',
        lines: [
          { label: 'Design and spec', costUsd: 1800, weeks: 2 },
          { label: 'First working version', costUsd: 9600, weeks: 8 },
          { label: 'Tools and racking', costUsd: 7400, weeks: 3 },
          { label: 'Insurance, legal, registration', costUsd: 1600, weeks: 2 },
          { label: 'Three months of running costs', costUsd: 4200, weeks: 12 },
          { label: 'Contingency (15%)', costUsd: 3300, weeks: 0 },
        ],
      },
      createdAt: ago(9.6),
      updatedAt: ago(9),
      progress: 0.5,
    },
    {
      id: 'run-triage',
      agentId: 'ag-desk',
      title: 'Morning inbox triage',
      intent: 'Score everything that arrived overnight and surface what needs a person.',
      status: 'done',
      steps: [
        { id: 's1', label: 'Read new mail', toolId: 't-triage', status: 'done', log: '14 items. 3 need you.', at: ago(6) },
        { id: 's2', label: 'Score', status: 'done', log: 'Landlord flagged urgent — lease decision.', at: ago(5.9) },
      ],
      createdAt: ago(6.1),
      updatedAt: ago(5.9),
      progress: 1,
    },
  ]
}

function seedThreads(): Thread[] {
  return [
    {
      id: 'th-horizon',
      agentId: 'ag-horizon',
      title: 'Horizon',
      createdAt: ago(48),
      updatedAt: ago(0.5),
      messages: [
        { id: 'm1', from: 'agent', text: 'Morning. Inbox is at 31 — mostly the landlord and a trade waiting for you. Two open journey pieces are the kind you can finish before lunch. What do you want to do first?', at: ago(0.5) },
      ],
    },
    {
      id: 'th-planner',
      agentId: 'ag-planner',
      title: 'Tool library roadmap',
      createdAt: ago(10),
      updatedAt: ago(9),
      messages: [
        { id: 'm1', from: 'me', text: 'Plan out the tool library so I know what it actually costs.', at: ago(10) },
        { id: 'm2', from: 'agent', text: 'Six lines, $27,900 over 27 weeks. It is $3,900 over the current target. The biggest line is the first working version at $9,600 — that assumes you build it, not hire it. I have sent it to the review queue; approve it there and the goal target updates.', at: ago(9) },
      ],
    },
  ]
}

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export interface OSState {
  agents: Agent[]
  threads: Thread[]
  windows: ChatWindow[]
  runs: Run[]
  inbox: InboxItem[]
  pieces: JourneyPiece[]
  downloads: Download[]
  bio: BioSample[]
  bioSource: 'simulator' | string
  flow: FlowLevel
  focus: boolean
  session: FlowSession | null
  runtimeUrl: string
  useRuntime: boolean
  pending: Record<string, boolean>
  lastError: string | null

  // chats
  openChat: (agentId: string, threadId?: string) => string
  closeWindow: (threadId: string) => void
  minimiseWindow: (threadId: string, on: boolean) => void
  moveWindow: (threadId: string, patch: Partial<Pick<ChatWindow, 'x' | 'y' | 'w' | 'h'>>) => void
  focusWindow: (threadId: string) => void
  send: (threadId: string, text: string, downloadId?: string) => Promise<void>
  applyAction: (threadId: string, msgId: string, actionId: string) => void

  // runs
  createRun: (agentId: string, title: string, intent: string, effect?: RunEffect, threadId?: string) => string
  decideRun: (runId: string, approve: boolean) => void
  tick: () => void

  // inbox
  markRead: (id: string) => void
  markDone: (id: string, how?: string) => void
  reply: (id: string, text: string) => void

  // journey
  startPiece: (id: string) => void
  completePiece: (id: string) => void
  addPiece: (p: Omit<JourneyPiece, 'id' | 'createdAt' | 'status'>) => string
  regeneratePieces: () => void

  // stream
  addDownload: (d: Omit<Download, 'id' | 'at' | 'tags'> & { tags?: string[] }) => string
  routeDownload: (id: string, to: 'scribe' | 'piece' | 'goal', goalId?: string) => void

  // agents
  setScope: (agentId: string, scope: Scope, on: boolean) => void
  setAgentEnabled: (agentId: string, on: boolean) => void

  // flow
  pushBio: (s: BioSample) => void
  setBioSource: (s: string) => void
  setFocus: (on: boolean) => void
  startSession: (pieceId?: string) => void
  endSession: () => void

  // system
  setRuntime: (url: string, use: boolean) => void
  resetOS: () => void
}

const sim = new BioSimulator()
export const bioSimulator = sim

function seedState() {
  return {
    agents: seedAgents.map((a) => ({ ...a, scopes: [...a.scopes], tools: a.tools.map((t) => ({ ...t })) })),
    threads: seedThreads(),
    windows: [] as ChatWindow[],
    runs: seedRuns(),
    inbox: seedInbox.map((i) => ({ ...i })),
    pieces: seedPieces(),
    downloads: [
      { id: 'dl-1', kind: 'text' as const, content: 'Tool library could co-locate with a trade depot — evenings and weekends when the bays are empty. Ask Mara.', at: ago(30), tags: ['toollib'], routedTo: { goalId: 'g-toollib' } },
      { id: 'dl-2', kind: 'voice' as const, content: 'Remember to give the landlord an answer before the thirtieth. Lean towards not renewing if the deposit projection holds.', at: ago(20), tags: ['house'], routedTo: { goalId: 'g-house' } },
    ] as Download[],
    bio: [] as BioSample[],
    bioSource: 'simulator' as const,
    flow: 'settling' as FlowLevel,
    focus: false,
    session: null as FlowSession | null,
    runtimeUrl: 'http://localhost:8787',
    useRuntime: false,
    pending: {} as Record<string, boolean>,
    lastError: null as string | null,
  }
}

function provider(state: OSState): ModelProvider {
  return state.useRuntime && state.runtimeUrl ? makeRuntimeProvider(state.runtimeUrl) : LocalProvider
}

/** Applies a structured effect to the rest of the OS. The only place the agentic layer writes into life data. */
function applyEffect(effect: RunEffect, agentName: string): string {
  const h = useHorizon.getState()
  switch (effect.kind) {
    case 'trade': {
      const sleeve = h.sleeves.find((s) => s.id === effect.sleeveId)
      if (!sleeve) return 'Sleeve not found.'
      const positions = sleeve.positions.map((p) => (p.companyId === effect.companyId ? { ...p, valueUsd: Math.max(0, p.valueUsd + effect.deltaUsd) } : p))
      const known = positions.some((p) => p.companyId === effect.companyId)
      useHorizon.setState({
        sleeves: h.sleeves.map((s) => (s.id === sleeve.id ? { ...s, positions: known ? positions : [...positions, { companyId: effect.companyId, valueUsd: Math.max(0, effect.deltaUsd) }] } : s)),
        cashUsd: h.cashUsd - effect.deltaUsd,
      })
      h.addNote(`${agentName}: ${effect.deltaUsd < 0 ? 'sold' : 'bought'} ${money(effect.deltaUsd)} in ${sleeve.name}`, 'Queued for execution. In this build the order stops here.')
      return `Order queued: ${effect.deltaUsd < 0 ? 'sell' : 'buy'} ${money(effect.deltaUsd)}.`
    }
    case 'earmark':
      h.earmarkToGoal(effect.goalId, effect.usd, effect.reason)
      return `Earmarked ${money(effect.usd)}.`
    case 'roadmap': {
      const total = roadmapTotal(effect.lines)
      const goal = h.goals.find((g) => g.id === effect.goalId)
      if (goal && total > goal.targetUsd) h.updateGoal(effect.goalId, { targetUsd: total })
      h.addNote(`${agentName}: roadmap for ${goal?.title ?? 'a goal'}`, effect.lines.map((l) => `${l.label} — ${money(l.costUsd)}, ${l.weeks} weeks`).join('; ') + `. Total ${money(total)}.`, undefined)
      return `Roadmap accepted, ${money(total)}.`
    }
    case 'report':
      h.addNote(effect.title, effect.body)
      return 'Report filed to the journal.'
    case 'note':
      h.addNote(`${agentName}: note`, effect.text)
      return 'Kept.'
    case 'pieces':
      return 'Pieces added.'
  }
}

export const useOS = create<OSState>()(
  persist(
    (set, get) => ({
      ...seedState(),

      openChat: (agentId, threadId) => {
        const s = get()
        let id = threadId ?? s.threads.find((t) => t.agentId === agentId)?.id
        const agent = s.agents.find((a) => a.id === agentId)
        if (!id) {
          id = uid('th')
          const t: Thread = {
            id,
            agentId,
            title: agent?.name ?? 'Chat',
            createdAt: nowIso(),
            updatedAt: nowIso(),
            messages: agent ? [{ id: uid('m'), from: 'agent', text: agent.greeting, at: nowIso() }] : [],
          }
          set({ threads: [...s.threads, t] })
        }
        const existing = get().windows.find((w) => w.threadId === id)
        const z = Math.max(0, ...get().windows.map((w) => w.z)) + 1
        if (existing) {
          set({ windows: get().windows.map((w) => (w.threadId === id ? { ...w, minimised: false, z } : w)) })
          return id
        }
        const n = get().windows.length
        const w = 380
        const h = Math.round(w * 1.618)
        set({
          windows: [
            ...get().windows,
            { threadId: id, x: Math.max(8, (typeof window !== 'undefined' ? window.innerWidth : 1200) - w - 300 - n * 36), y: 80 + n * 36, w, h: Math.min(h, 560), minimised: false, z },
          ],
        })
        return id
      },
      closeWindow: (threadId) => set((s) => ({ windows: s.windows.filter((w) => w.threadId !== threadId) })),
      minimiseWindow: (threadId, on) => set((s) => ({ windows: s.windows.map((w) => (w.threadId === threadId ? { ...w, minimised: on } : w)) })),
      moveWindow: (threadId, patch) => set((s) => ({ windows: s.windows.map((w) => (w.threadId === threadId ? { ...w, ...patch } : w)) })),
      focusWindow: (threadId) =>
        set((s) => {
          const z = Math.max(0, ...s.windows.map((w) => w.z)) + 1
          return { windows: s.windows.map((w) => (w.threadId === threadId ? { ...w, z } : w)) }
        }),

      send: async (threadId, text, downloadId) => {
        const s = get()
        const thread = s.threads.find((t) => t.id === threadId)
        const agent = thread && s.agents.find((a) => a.id === thread.agentId)
        if (!thread || !agent) return
        const mine: ChatMsg = { id: uid('m'), from: 'me', text, at: nowIso(), downloadId }
        set({
          threads: s.threads.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, mine], updatedAt: nowIso() } : t)),
          pending: { ...s.pending, [threadId]: true },
          agents: s.agents.map((a) => (a.id === agent.id ? { ...a, presence: 'working' } : a)),
        })
        const h = useHorizon.getState()
        const totalUsd = h.cashUsd + h.sleeves.reduce((a, sl) => a + sl.positions.reduce((x, p) => x + p.valueUsd, 0), 0)
        const ctx: BrainContext = {
          agent,
          history: thread.messages,
          goals: h.goals,
          sleeves: h.sleeves.map((sl) => {
            const v = sl.positions.reduce((x, p) => x + p.valueUsd, 0)
            const driftPct = (v / totalUsd) * 100 - sl.targetPct
            return { id: sl.id, name: sl.name, driftPct, driftUsd: (driftPct / 100) * totalUsd }
          }),
          freeCashUsd: Math.max(0, h.cashUsd - h.goals.reduce((a, g) => a + g.earmarkedUsd, 0)),
          inboxScore: inboxScore(s.inbox),
        }
        try {
          const reply = await provider(get()).reply(text, ctx)
          const msg: ChatMsg = { id: uid('m'), from: 'agent', text: reply.text, at: nowIso(), actions: reply.actions }
          set({
            threads: get().threads.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, msg], updatedAt: nowIso() } : t)),
            lastError: null,
          })
        } catch (e) {
          const msg: ChatMsg = { id: uid('m'), from: 'agent', text: `I could not reach the runtime (${(e as Error).message}). Switch to the local provider in System, or start the runtime.`, at: nowIso() }
          set({ threads: get().threads.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, msg] } : t)), lastError: (e as Error).message })
        } finally {
          set({
            pending: { ...get().pending, [threadId]: false },
            agents: get().agents.map((a) => (a.id === agent.id ? { ...a, presence: 'online' } : a)),
          })
        }
      },

      applyAction: (threadId, msgId, actionId) => {
        const s = get()
        const thread = s.threads.find((t) => t.id === threadId)
        const msg = thread?.messages.find((m) => m.id === msgId)
        const action = msg?.actions?.find((a) => a.id === actionId)
        if (!thread || !msg || !action || action.applied) return
        const agent = s.agents.find((a) => a.id === thread.agentId)
        const mark = () =>
          set({
            threads: get().threads.map((t) =>
              t.id === threadId
                ? { ...t, messages: t.messages.map((m) => (m.id === msgId ? { ...m, actions: m.actions?.map((a) => (a.id === actionId ? { ...a, applied: true } : a)) } : m)) }
                : t,
            ),
          })
        const say = (text: string) =>
          set({ threads: get().threads.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, { id: uid('m'), from: 'agent', text, at: nowIso() }] } : t)) })

        const e = action.effect
        if (e.kind === 'goal') {
          const id = useHorizon.getState().addGoal({ title: e.title, why: e.why, kind: 'save', horizon: e.horizon, targetUsd: e.targetUsd, monthlyUsd: 0, earmarkedUsd: 0 })
          const goal = useHorizon.getState().goals.find((g) => g.id === id)
          if (goal) for (const d of piecesForGoal(goal)) get().addPiece(d)
          mark()
          say(`On the board. Planner laid ${piecesForGoal(goal!).length} pieces on the journey for it.`)
          return
        }
        if (e.kind === 'run') {
          mark()
          return
        }
        if (e.kind === 'note' || e.kind === 'pieces') {
          if (e.kind === 'pieces') for (const p of e.pieces) get().addPiece(p)
          else applyEffect(e, agent?.name ?? 'Agent')
          mark()
          say(e.kind === 'note' ? 'Kept in the journal.' : 'On the journey.')
          return
        }
        // Everything that touches money goes through a run and the review queue.
        const runId = get().createRun(thread.agentId, action.label, msg.text, e, threadId)
        mark()
        say(`Sent to the review queue as a run. Nothing moves until you approve it there — it is on the Desk and under Agents.`)
        set({
          inbox: [
            {
              id: uid('ib'),
              kind: 'approval',
              from: { name: agent?.name ?? 'Agent', agentId: thread.agentId, importance: 2 },
              subject: `Run waiting for review: ${action.label}`,
              body: msg.text,
              urgent: false,
              at: nowIso(),
              read: false,
              done: false,
              runId,
              scope: 'personal',
            },
            ...get().inbox,
          ],
        })
      },

      createRun: (agentId, title, intent, effect, threadId) => {
        const id = uid('run')
        const needsReview = !!effect && effect.kind !== 'note' && effect.kind !== 'report'
        const run: Run = {
          id,
          agentId,
          threadId,
          title,
          intent,
          status: needsReview ? 'awaiting_review' : 'approved',
          steps: [
            { id: 's1', label: 'Plan', status: 'done', at: nowIso() },
            { id: 's2', label: 'Prepare', status: 'done', at: nowIso() },
            { id: 's3', label: 'Human review', status: needsReview ? 'todo' : 'skipped' },
            { id: 's4', label: 'Apply', status: 'todo' },
          ],
          effect,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          progress: 0.5,
        }
        set((s) => ({ runs: [run, ...s.runs] }))
        return id
      },

      decideRun: (runId, approve) => {
        const s = get()
        const run = s.runs.find((r) => r.id === runId)
        if (!run || run.status !== 'awaiting_review') return
        const at = nowIso()
        set({
          runs: s.runs.map((r) =>
            r.id === runId
              ? {
                  ...r,
                  status: approve ? 'approved' : 'rejected',
                  updatedAt: at,
                  steps: r.steps.map((st) => (st.label === 'Human review' ? { ...st, status: 'done', log: approve ? 'Approved.' : 'Rejected.', at } : st)),
                }
              : r,
          ),
          inbox: s.inbox.map((i) => (i.runId === runId ? { ...i, done: true, read: true } : i)),
        })
        useHorizon.getState().addNote(`${approve ? 'Approved' : 'Rejected'} run: ${run.title}`, run.intent)
      },

      /** The scheduler. Advances approved runs one step at a time. Called on an interval by the shell. */
      tick: () => {
        const s = get()
        let changed = false
        const runs = s.runs.map((r) => {
          if (r.status === 'approved') {
            changed = true
            return { ...r, status: 'running' as const, updatedAt: nowIso(), steps: r.steps.map((st) => (st.status === 'todo' && st.label !== 'Human review' ? { ...st, status: 'doing' as const } : st)) }
          }
          if (r.status === 'running') {
            changed = true
            const idx = r.steps.findIndex((st) => st.status === 'doing')
            const steps = r.steps.map((st, i) => (i === idx ? { ...st, status: 'done' as const, at: nowIso(), log: st.log ?? 'Done.' } : st))
            const remaining = steps.some((st) => st.status === 'todo' || st.status === 'doing')
            if (!remaining) {
              let outcome = 'Completed.'
              if (r.effect) {
                if (r.effect.kind === 'pieces') for (const p of r.effect.pieces) get().addPiece(p)
                else outcome = applyEffect(r.effect, s.agents.find((a) => a.id === r.agentId)?.name ?? 'Agent')
              }
              const agent = s.agents.find((a) => a.id === r.agentId)
              set({
                inbox: [
                  { id: uid('ib'), kind: 'message', from: { name: agent?.name ?? 'Agent', agentId: r.agentId, importance: 1 }, subject: `Done: ${r.title}`, body: outcome, urgent: false, at: nowIso(), read: false, done: false, runId: r.id, scope: 'personal' },
                  ...get().inbox,
                ],
              })
              return { ...r, steps, status: 'done' as const, progress: 1, updatedAt: nowIso() }
            }
            const next = steps.findIndex((st) => st.status === 'todo')
            const stepped = steps.map((st, i) => (i === next ? { ...st, status: 'doing' as const } : st))
            return { ...r, steps: stepped, progress: stepped.filter((st) => st.status === 'done').length / stepped.length, updatedAt: nowIso() }
          }
          return r
        })
        if (changed) set({ runs })
      },

      markRead: (id) => set((s) => ({ inbox: s.inbox.map((i) => (i.id === id ? { ...i, read: true } : i)) })),
      markDone: (id, how) => {
        const s = get()
        const item = s.inbox.find((i) => i.id === id)
        if (!item) return
        set({ inbox: s.inbox.map((i) => (i.id === id ? { ...i, done: true, read: true } : i)) })
        if (item.runId && how === 'approve') get().decideRun(item.runId, true)
        if (item.runId && how === 'reject') get().decideRun(item.runId, false)
      },
      reply: (id, text) => {
        const s = get()
        const item = s.inbox.find((i) => i.id === id)
        if (!item) return
        set({ inbox: s.inbox.map((i) => (i.id === id ? { ...i, done: true, read: true } : i)) })
        useHorizon.getState().addNote(`Replied to ${item.from.name}: ${item.subject}`, text)
      },

      startPiece: (id) => set((s) => ({ pieces: s.pieces.map((p) => (p.id === id && p.status === 'open' ? { ...p, status: 'doing' } : p)) })),
      completePiece: (id) => {
        const s = get()
        const piece = s.pieces.find((p) => p.id === id)
        if (!piece) return
        const pieces = settlePieces(s.pieces.map((p) => (p.id === id ? { ...p, status: 'done', doneAt: nowIso() } : p)))
        set({ pieces })
        const h = useHorizon.getState()
        h.addNote(`Journey: ${piece.title}`, `${piece.detail} Weight ${piece.weight}.`, undefined)
        if (piece.title === 'Reach it' && piece.goalId) h.setGoalStatus(piece.goalId, 'reached')
      },
      addPiece: (p) => {
        const id = uid('pc')
        set((s) => ({ pieces: settlePieces([...s.pieces, { ...p, id, status: p.dependsOn.length ? 'locked' : 'open', createdAt: nowIso() }]) }))
        return id
      },
      regeneratePieces: () => {
        const goals = useHorizon.getState().goals
        const s = get()
        const have = new Set(s.pieces.map((p) => p.goalId))
        const fresh: JourneyPiece[] = []
        for (const g of goals) {
          if (g.status !== 'active' || have.has(g.id)) continue
          for (const d of piecesForGoal(g)) fresh.push({ ...d, id: `${g.id}:${d.title}`, status: 'locked', createdAt: nowIso() })
        }
        if (fresh.length) set({ pieces: settlePieces([...s.pieces, ...fresh]) })
      },

      addDownload: (d) => {
        const id = uid('dl')
        set((s) => ({ downloads: [{ ...d, id, at: nowIso(), tags: d.tags ?? [] }, ...s.downloads] }))
        return id
      },
      routeDownload: (id, to, goalId) => {
        const s = get()
        const d = s.downloads.find((x) => x.id === id)
        if (!d) return
        if (to === 'scribe') {
          const threadId = get().openChat('ag-scribe')
          set({ downloads: get().downloads.map((x) => (x.id === id ? { ...x, routedTo: { threadId } } : x)) })
          void get().send(threadId, d.kind === 'drawing' ? '[drawing attached] Make something of this.' : d.content, id)
        } else if (to === 'piece') {
          const pieceId = get().addPiece({ title: d.content.slice(0, 72) || 'From a drawing', detail: `Captured ${d.kind === 'voice' ? 'by voice' : d.kind === 'drawing' ? 'as a drawing' : 'by hand'}.`, weight: 2, dependsOn: [], goalId })
          set({ downloads: get().downloads.map((x) => (x.id === id ? { ...x, routedTo: { pieceId, goalId } } : x)) })
        } else if (to === 'goal' && goalId) {
          useHorizon.getState().addNote(`Download → ${useHorizon.getState().goals.find((g) => g.id === goalId)?.title ?? 'goal'}`, d.content, undefined)
          set({ downloads: get().downloads.map((x) => (x.id === id ? { ...x, routedTo: { goalId } } : x)) })
        }
      },

      setScope: (agentId, scope, on) =>
        set((s) => ({
          agents: s.agents.map((a) => (a.id === agentId ? { ...a, scopes: on ? Array.from(new Set([...a.scopes, scope])) : a.scopes.filter((x) => x !== scope) } : a)),
        })),
      setAgentEnabled: (agentId, on) =>
        set((s) => ({ agents: s.agents.map((a) => (a.id === agentId ? { ...a, enabled: on, presence: on ? 'online' : 'away' } : a)) })),

      pushBio: (sample) => {
        const s = get()
        const bio = [...s.bio.slice(-179), sample]
        const level = flowLevel(sample)
        const session = s.session && (level === 'flow' || level === 'deep') ? { ...s.session, flowMinutes: s.session.flowMinutes + 1 / 30, peak: level === 'deep' || s.session.peak === 'deep' ? 'deep' as const : 'flow' as const } : s.session
        set({ bio, flow: level, session })
      },
      setBioSource: (src) => set({ bioSource: src }),
      setFocus: (on) => {
        sim.setMode(on ? 'focus' : 'rest')
        set((s) => ({ focus: on, windows: on ? s.windows.map((w) => ({ ...w, minimised: true })) : s.windows }))
      },
      startSession: (pieceId) => {
        sim.setMode('focus')
        set({ session: { id: uid('fs'), startedAt: nowIso(), pieceId, flowMinutes: 0, peak: 'settling' }, focus: true })
        if (pieceId) get().startPiece(pieceId)
      },
      endSession: () => {
        const s = get()
        if (!s.session) return
        sim.setMode('rest')
        const ended = { ...s.session, endedAt: nowIso() }
        const piece = ended.pieceId ? s.pieces.find((p) => p.id === ended.pieceId) : undefined
        useHorizon.getState().addNote(
          `Focus session${piece ? `: ${piece.title}` : ''}`,
          `${Math.round((Date.now() - Date.parse(ended.startedAt)) / 60_000)} minutes, ${Math.round(ended.flowMinutes)} of them in flow. Peak: ${ended.peak}.`,
        )
        set({ session: null, focus: false })
      },

      setRuntime: (url, use) => set({ runtimeUrl: url, useRuntime: use, lastError: null }),
      resetOS: () => set({ ...seedState() }),
    }),
    {
      name: OS_STORAGE_KEY,
      version: 1,
      partialize: (s) => ({ ...s, bio: [], pending: {}, lastError: null }) as OSState,
    },
  ),
)
