import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { seedGoals } from '../data/seed'
import { seedAgents } from '../os/agents'
import { BioSimulator, flowLevel } from '../os/bio'
import { LocalProvider, makeRuntimeProvider, type BrainContext, type ModelProvider } from '../os/brain'
import { computeConfidence as computeConfidenceFor, descendants as descendantsOf } from '../lib/confidence'
import { computeNudges, planDay, todayKey } from '../os/day'
import { inboxScore, seedInbox } from '../os/inbox'
import { piecesForGoal, roadmapFor, roadmapTotal, settlePieces } from '../os/planner'
import { chime, haptic } from '../os/senses'
import type { SenseSettings } from '../os/senses'
import { BUILTIN_WORKFLOWS, stageMeta, workflowById, type StageKind, type Workflow } from '../os/workflows'
import { seedConnections } from '../os/connections'
import { nextEpoch, seedDatasets, seedDocs, seedExperiments } from '../os/lab'
import { translate } from '../os/translate'
import type {
  Agent,
  BioSample,
  Blueprint,
  ChatMsg,
  Connection,
  Dataset,
  Doc,
  Experiment,
  RoutineBlock,
  Sheet,
  ChatWindow,
  Download,
  FlowLevel,
  FlowSession,
  InboxItem,
  Initiative,
  JourneyPiece,
  Nudge,
  Run,
  RunEffect,
  Scope,
  Thread,
  TimeBlock,
  WidgetId,
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
      id: 'run-research-altsports',
      agentId: 'ag-planner',
      title: 'Research: alternative sports participation',
      intent: 'Gather participation, facility and spend data on racquet and fitness-racing formats, and say whether there is a public-market way in.',
      status: 'done',
      steps: [
        { id: 's1', label: 'Participation data', status: 'done', log: 'Pickleball ~19m US players, padel ~30k courts globally, Hyrox 500k+ entrants.', at: ago(62) },
        { id: 's2', label: 'Facility economics', status: 'done', log: 'Indoor court utilisation >80% weekday evenings in large metros.', at: ago(61) },
        { id: 's3', label: 'Public-market route', status: 'done', log: 'Few pure plays. Equipment, facility REITs, apparel, and event operators are the adjacent listed exposure.', at: ago(60) },
      ],
      createdAt: ago(64),
      updatedAt: ago(60),
      progress: 1,
    },
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
  initiatives: Initiative[]
  /** Workflows the reader designed. Built-ins live in src/os/workflows.ts. */
  workflows: Workflow[]
  blocks: TimeBlock[]
  nudges: Nudge[]
  widgets: WidgetId[]
  senses: SenseSettings
  deskSinceMs: number
  paletteOpen: boolean
  blueprints: Blueprint[]
  connections: Connection[]
  datasets: Dataset[]
  experiments: Experiment[]
  docs: Doc[]
  sheets: Sheet[]
  routines: (RoutineBlock & { id: string; initiativeId: string })[]
  /** When the person last looked. Everything after it is "since you were away". */
  lastSeenAt: string

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

  // initiatives and workflows
  createInitiative: (workflowId: string, title: string, spark: string, sourceDownloadId?: string) => string
  advanceInitiative: (id: string) => void
  saveWorkflow: (wf: Omit<Workflow, 'id' | 'builtin'> & { id?: string }) => string
  deleteWorkflow: (id: string) => void

  // day
  ensureDay: () => void
  toggleBlock: (id: string) => void
  refreshNudges: () => void
  dismissNudge: (id: string) => void
  logWalk: () => void

  // invention
  translateInitiative: (id: string) => string | undefined
  setConnectionStatus: (id: string, status: Connection['status']) => void
  startExperiment: (input: Omit<Experiment, 'id' | 'createdAt' | 'status' | 'metrics'>) => string
  promoteExperiment: (id: string) => void
  addDataset: (d: Omit<Dataset, 'id'>) => string
  saveDoc: (doc: Partial<Doc> & { title: string; body: string; kind?: Doc['kind']; initiativeId?: string }) => string
  deleteDoc: (id: string) => void
  saveSheet: (sheet: Partial<Sheet> & { title: string; columns: string[]; numeric: boolean[]; rows: (string | number)[][]; initiativeId?: string }) => string
  markSeen: () => void

  // desk
  setWidgets: (ids: WidgetId[]) => void
  setSenses: (patch: Partial<SenseSettings>) => void
  setPalette: (open: boolean) => void

  // system
  setRuntime: (url: string, use: boolean) => void
  resetOS: () => void
}

export function allWorkflows(custom: Workflow[]): Workflow[] {
  return [...BUILTIN_WORKFLOWS, ...custom]
}

function seedInitiatives(): Initiative[] {
  return [
    {
      id: 'in-altsports',
      title: 'Alternative sports',
      spark: 'A conversation with Theo about how everyone he knows under forty plays pickleball, padel or does Hyrox, and none of them watch the NBA.',
      workflowId: 'wf-thesis',
      stageIndex: 2,
      pillarId: 'p-altsports',
      thesisId: 't-altsports-participation',
      pieceIds: [],
      runIds: ['run-research-altsports'],
      blockIds: [],
      history: [
        { at: ago(70), stage: 'spark', text: 'Captured from a conversation. Kept in the stream.' },
        { at: ago(60), stage: 'research', text: 'Planner pulled participation data and facility counts. Report on the Desk.' },
        { at: ago(20), stage: 'thesis', text: 'Written as a pillar on the map with one thesis under it. Confidence starts at the prior; nothing attached yet.' },
      ],
      createdAt: ago(70),
      updatedAt: ago(20),
    },
    {
      id: 'in-hawk',
      title: 'Hawk vision',
      spark: 'A hawk finds a mouse from a hundred metres up, at speed, against grass. Two foveae per eye, cone density five times ours, flicker fusion far above a human\u2019s. What if a detector was organised the same way — a cheap periphery that steers two expensive foveae, motion first, objectness second? A model built on that, trained on frames I captured myself, evaluated against a number chosen before training, owned end to end.',
      workflowId: 'wf-invention',
      stageIndex: 4,
      blueprintId: 'bp-in-hawk',
      experimentIds: ['ex-hawk-baseline', 'ex-hawk-fovea'],
      docIds: ['doc-hawk-translation', 'doc-hawk-spec'],
      pieceIds: [],
      runIds: [],
      blockIds: [],
      history: [
        { at: ago(130), stage: 'spark', text: 'From a field day and a paper on raptor retinas. Kept.' },
        { at: ago(120), stage: 'translate', text: 'Blueprint: five milestones, fourteen pieces, twelve connections, a routine of three blocks a week. About fifty focused hours.' },
        { at: ago(100), stage: 'connect', text: 'Nine of twelve connections ready. Labelling tool, training runner and paper search still to set up.' },
        { at: ago(80), stage: 'gather', text: 'Three datasets in the lab: 1,240 clips, 9,800 frames, a sealed held-out set of 200. Translation doc and spec written.' },
        { at: ago(3), stage: 'experiment', text: 'Baseline done at 0.57. Dual-fovea run started.' },
      ],
      createdAt: ago(130),
      updatedAt: ago(3),
    },
    {
      id: 'in-toollib',
      title: 'Tool library',
      spark: 'Every garage on the street has the same drill. A lending library for tools, evenings and weekends, out of a depot that sits empty.',
      workflowId: 'wf-product',
      stageIndex: 3,
      goalId: 'g-toollib',
      pieceIds: ['g-toollib:Write the one-page spec', 'g-toollib:Find the first ten people'],
      runIds: ['run-roadmap-toollib'],
      blockIds: [],
      history: [
        { at: ago(400), stage: 'spark', text: 'From a notebook page. Kept.' },
        { at: ago(380), stage: 'spec', text: 'One-page spec written with Scribe. Two hundred members in year one is "done".' },
        { at: ago(300), stage: 'customers', text: 'Ten names on the street and at the depot. Two pieces on the journey.' },
        { at: ago(9), stage: 'cost', text: 'Planner drafted six lines, $27,900. Waiting for review; the goal target rises when approved.' },
      ],
      createdAt: ago(400),
      updatedAt: ago(9),
    },
  ]
}

/* ------------------------------------------------------------------ */
const sim = new BioSimulator()
export const bioSimulator = sim

function seedState() {
  return {
    agents: seedAgents.map((a) => ({ ...a, scopes: [...a.scopes], tools: a.tools.map((t) => ({ ...t })) })),
    threads: seedThreads(),
    windows: [] as ChatWindow[],
    runs: seedRuns(),
    inbox: [
      {
        id: 'ib-altsports',
        kind: 'report' as const,
        from: { name: 'Planner', agentId: 'ag-planner', importance: 1 as const },
        subject: 'Research: alternative sports — participation is real, the listed exposure is adjacent',
        body: 'Pickleball, padel and fitness racing are growing at rates traditional team sports have not seen in a generation. There is no pure-play listed company; the exposure is in equipment, indoor facility landlords, apparel and event operators. Recommend writing the thesis at the participation level, not the sport level, and finding companies from there.',
        urgent: false,
        at: ago(60),
        read: true,
        done: false,
        runId: 'run-research-altsports',
        scope: 'personal' as const,
      },
      ...seedInbox.map((i) => ({ ...i })),
    ],
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
    initiatives: seedInitiatives(),
    workflows: [] as Workflow[],
    blocks: [] as TimeBlock[],
    nudges: [] as Nudge[],
    widgets: ['inbox', 'away', 'piece', 'day', 'lab', 'initiatives', 'feed', 'flow'] as WidgetId[],
    senses: { sound: false, breathTone: false, haptics: true } as SenseSettings,
    deskSinceMs: Date.now(),
    paletteOpen: false,
    blueprints: [{ ...translate('in-hawk', 'Hawk vision', 'A detector organised like a hawk\u2019s vision: a cheap periphery steering two expensive foveae, motion first, trained on own capture.', 'local'), id: 'bp-in-hawk', createdAt: ago(120) }],
    connections: seedConnections.map((c) => ({ ...c })),
    datasets: seedDatasets.map((d) => ({ ...d })),
    experiments: seedExperiments.map((e) => ({ ...e, metrics: e.metrics.map((m) => ({ ...m })) })),
    docs: seedDocs.map((d) => ({ ...d })),
    sheets: [
      {
        id: 'sh-hawk-cost',
        initiativeId: 'in-hawk',
        title: 'Hawk vision — cost and time',
        columns: ['Line', 'Hours', 'Cost ($)'],
        numeric: [false, true, true],
        rows: [
          ['Field capture (2 days, travel)', 16, 380],
          ['Labelling tool licence', 2, 0],
          ['GPU time (local, electricity)', 0, 60],
          ['Pretrained weights', 1, 0],
          ['Reading and translation', 8, 0],
          ['Implementation and runs', 40, 0],
          ['Model card, record, repo', 6, 0],
        ],
        createdAt: ago(110),
        updatedAt: ago(20),
      },
    ] as Sheet[],
    routines: translate('in-hawk', 'Hawk vision', 'model', 'local').routine.map((r, i) => ({ ...r, id: `rt-hawk-${i}`, initiativeId: 'in-hawk' })),
    lastSeenAt: ago(14),
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

        // The lab. One epoch per tick; one experiment at a time, like a single GPU.
        const exps = get().experiments
        const running = exps.find((e) => e.status === 'running')
        if (running) {
          const m = nextEpoch(running)
          const done = m.epoch >= running.epochs
          const updated = { ...running, metrics: [...running.metrics, m], status: done ? ('done' as const) : ('running' as const), finishedAt: done ? nowIso() : undefined }
          set({ experiments: exps.map((e) => (e.id === running.id ? updated : e)) })
          if (done) {
            const best = [...updated.metrics].sort((a, b) => b.metric - a.metric)[0]
            set({
              inbox: [
                { id: uid('ib'), kind: 'report', from: { name: 'Planner', agentId: 'ag-planner', importance: 2 }, subject: `Finished: ${updated.name} — best ${updated.metricName} ${best.metric.toFixed(3)}`, body: `${updated.hypothesis} Best epoch ${best.epoch}: ${updated.metricName} ${best.metric.toFixed(3)}, val loss ${best.valLoss.toFixed(3)}. Curves are in the lab. Promote it or run the next one.`, urgent: false, at: nowIso(), read: false, done: false, scope: 'personal' },
                ...get().inbox,
              ],
            })
          }
        } else {
          const queued = exps.find((e) => e.status === 'queued')
          if (queued) set({ experiments: exps.map((e) => (e.id === queued.id ? { ...e, status: 'running' } : e)) })
        }
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
        if (get().senses.sound) chime('start')
        sim.setMode('focus')
        set({ session: { id: uid('fs'), startedAt: nowIso(), pieceId, flowMinutes: 0, peak: 'settling' }, focus: true })
        if (pieceId) get().startPiece(pieceId)
      },
      endSession: () => {
        const s = get()
        if (!s.session) return
        sim.setMode('rest')
        if (s.senses.sound) chime('end')
        const ended = { ...s.session, endedAt: nowIso() }
        const piece = ended.pieceId ? s.pieces.find((p) => p.id === ended.pieceId) : undefined
        useHorizon.getState().addNote(
          `Focus session${piece ? `: ${piece.title}` : ''}`,
          `${Math.round((Date.now() - Date.parse(ended.startedAt)) / 60_000)} minutes, ${Math.round(ended.flowMinutes)} of them in flow. Peak: ${ended.peak}.`,
        )
        set({ session: null, focus: false })
      },

      createInitiative: (workflowId, title, spark, sourceDownloadId) => {
        const id = uid('in')
        const at = nowIso()
        set((s) => ({
          initiatives: [
            { id, title, spark, sourceDownloadId, workflowId, stageIndex: 0, pieceIds: [], runIds: [], blockIds: [], history: [{ at, stage: 'spark', text: 'Captured.' }], createdAt: at, updatedAt: at },
            ...s.initiatives,
          ],
        }))
        const wf = workflowById(allWorkflows(get().workflows), workflowId)
        useHorizon.getState().addNote(`Initiative: ${title}`, `${spark} Running on "${wf?.name ?? workflowId}".`)
        return id
      },

      /**
       * Moves an initiative to its workflow's next stage and runs that stage
       * kind's executor. Every kind does something real and records what it
       * left behind, so the pipeline is a list of things you can open.
       */
      advanceInitiative: (id) => {
        const s = get()
        const it = s.initiatives.find((x) => x.id === id)
        const wf = it && workflowById(allWorkflows(s.workflows), it.workflowId)
        if (!it || !wf) return
        const nextIndex = it.stageIndex + 1
        const stage = wf.stages[nextIndex]
        if (!stage) return
        const at = nowIso()
        const h = useHorizon.getState()
        const patch: Partial<Initiative> = {}
        const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`
        let text = ''
        const kind: StageKind = stage.kind

        if (kind === 'research') {
          const runId = get().createRun('ag-planner', `Research: ${it.title}`, `Gather what is already known about "${it.title}" and say whether there is a way in.`, { kind: 'report', title: `Research: ${it.title}`, body: `What is known about ${it.title}, who is already doing it, and where the money is. (Produced by the local provider; the runtime would do the reading.)` })
          patch.runIds = [...it.runIds, runId]
          text = 'Planner is researching. The report lands on the Desk when the run completes.'
        } else if (kind === 'spec') {
          const pieceId = get().addPiece({ title: `Sharpen the one-page spec for ${it.title}`, detail: 'What it is, who it is for, what done looks like. One page.', weight: 2, dependsOn: [], agentId: 'ag-scribe', goalId: it.goalId })
          const runId = get().createRun('ag-scribe', `Draft the spec for ${it.title}`, 'A first one-page spec from the spark and anything in the stream about it.', { kind: 'report', title: `Spec: ${it.title}`, body: `${it.spark} What it is: the smallest version of that. Who it is for: the first ten people who would use it before it is good. Done: they use it twice without being asked.` })
          patch.pieceIds = [...it.pieceIds, pieceId]
          patch.runIds = [...it.runIds, runId]
          text = 'Scribe is drafting the spec. A piece to sharpen it is on the journey.'
        } else if (kind === 'customers') {
          const ids = [
            get().addPiece({ title: `Name the first ten people for ${it.title}`, detail: 'Names, not personas. People who would use it before it is good.', weight: 3, dependsOn: [], agentId: 'ag-planner', goalId: it.goalId }),
            get().addPiece({ title: `Talk to three of them about ${it.title}`, detail: 'Listen. Do not explain.', weight: 3, dependsOn: [], goalId: it.goalId }),
          ]
          patch.pieceIds = [...it.pieceIds, ...ids]
          text = 'Two pieces on the journey: the ten names, and three conversations.'
        } else if (kind === 'thesis') {
          const { pillarId, thesisId } = h.addBelief({
            belief: it.title,
            claim: `${it.spark} If that holds, the spend follows the behaviour, and the businesses that serve it are worth more than the market thinks.`,
            horizonYears: 7,
            falsifiers: ['The behaviour stops growing for two consecutive years.', 'No listed business captures the spend — it stays private or local.'],
          })
          patch.pillarId = pillarId
          patch.thesisId = thesisId
          text = 'Written on the belief map as a pillar with a first thesis under it.'
        } else if (kind === 'ground') {
          const ids = [
            get().addPiece({ title: `Find five companies for ${it.title}`, detail: 'Run discovery from the seed companies the research named; accept the ones that fit under the thesis.', weight: 3, dependsOn: [], agentId: 'ag-planner' }),
            get().addPiece({ title: `Attach three filings to the ${it.title} thesis`, detail: 'At least one that argues against it.', weight: 3, dependsOn: [] }),
          ]
          patch.pieceIds = [...it.pieceIds, ...ids]
          text = 'Two pieces on the journey: companies, then filings. Discovery is under Beliefs.'
        } else if (kind === 'plan') {
          const ids = [
            get().addPiece({ title: `Build the smallest working ${it.title}`, detail: 'Whatever can be shown in a fortnight.', weight: 8, dependsOn: [], goalId: it.goalId }),
            get().addPiece({ title: `Put ${it.title} in front of the ten`, detail: 'Watch. Do not explain.', weight: 5, dependsOn: [], goalId: it.goalId }),
          ]
          patch.pieceIds = [...it.pieceIds, ...ids]
          text = 'The build and the first showing are on the journey.'
        } else if (kind === 'cost') {
          const goalId = it.goalId ?? h.addGoal({ title: it.title, why: it.spark, kind: 'build', horizon: 'later', targetUsd: 25_000, monthlyUsd: 0, earmarkedUsd: 0 })
          const goal = useHorizon.getState().goals.find((g) => g.id === goalId)
          const lines = goal ? roadmapFor(goal) : []
          const runId = get().createRun('ag-planner', `Cost ${it.title}`, 'Roadmap with lines and a total; the total becomes the goal target when approved.', goal ? { kind: 'roadmap', goalId, lines } : undefined)
          patch.goalId = goalId
          patch.runIds = [...it.runIds, runId]
          text = `A goal on the board and a costed roadmap (${money(roadmapTotal(lines))}) waiting for review.`
        } else if (kind === 'sleeve') {
          const rootId = it.pillarId ?? it.thesisId
          if (!rootId) text = 'No belief to point a sleeve at yet — add a thesis stage before this one.'
          else {
            const sleeveId = h.addSleeve({ name: it.title, rootId, targetPct: 4, exitBelow: 45, note: `Opened from the "${wf.name}" workflow. Small until the thesis is grounded.` })
            patch.sleeveId = sleeveId
            text = 'A sleeve under Money, pointed at the belief: 4% target, exit rule at 45, no positions yet.'
          }
        } else if (kind === 'trade') {
          const sleeveId = it.sleeveId
          const rootId = it.pillarId ?? it.thesisId
          if (!sleeveId || !rootId) text = 'No sleeve to trade into — add a sleeve stage before this one.'
          else {
            const { index } = computeConfidenceFor(h.nodes, h.edges, h.evidence)
            const companies = descendantsOf(index, rootId).filter((nid) => index.nodeById.get(nid)?.kind === 'company')
            if (companies.length === 0) {
              const pieceId = get().addPiece({ title: `Accept companies for ${it.title} before trading`, detail: 'The sleeve has nothing to hold. Run discovery under Beliefs and accept what fits.', weight: 2, dependsOn: [], agentId: 'ag-planner' })
              const runId = get().createRun('ag-trader', `Prepare first orders for ${it.title}`, 'Nothing under the belief yet. Trader will prepare orders once companies are accepted under it.', { kind: 'note', text: `Trader: no companies under ${it.title} yet. Orders wait on discovery.` })
              patch.pieceIds = [...it.pieceIds, pieceId]
              patch.runIds = [...it.runIds, runId]
              text = 'No companies under the belief yet. A piece and a Trader run are waiting on discovery.'
            } else {
              const total = h.cashUsd + h.sleeves.reduce((a, sl) => a + sl.positions.reduce((x, p) => x + p.valueUsd, 0), 0)
              const sleeve = h.sleeves.find((sl) => sl.id === sleeveId)!
              const budget = Math.round(((sleeve.targetPct / 100) * total) / 100) * 100
              const per = Math.round(budget / Math.min(3, companies.length) / 100) * 100
              const runIds = companies.slice(0, 3).map((cid) =>
                get().createRun('ag-trader', `Buy ${money(per)} of ${index.nodeById.get(cid)?.label} for ${it.title}`, `First position into the ${it.title} sleeve. Prepared, not sent.`, { kind: 'trade', sleeveId, companyId: cid, deltaUsd: per }),
              )
              patch.runIds = [...it.runIds, ...runIds]
              text = `${runIds.length} orders prepared into the sleeve (${money(budget)} total), waiting for review.`
            }
          }
        } else if (kind === 'translate') {
          const bpId = get().translateInitiative(it.id)
          const bp = get().blueprints.find((b) => b.id === bpId)
          text = bp ? `Blueprint: ${bp.milestones.length} milestones, ${bp.pieces.length} pieces, ${bp.connections.length} connections, a routine of ${bp.routine.length} blocks a week. About ${bp.hours} focused hours.` : 'Could not translate.'
        } else if (kind === 'connect') {
          const bp = get().blueprints.find((b) => b.initiativeId === it.id)
          const need = (bp?.connections ?? []).map((cid) => get().connections.find((c) => c.id === cid)).filter(Boolean) as Connection[]
          const missing = need.filter((c) => c.status !== 'ready')
          set({
            inbox: [
              { id: uid('ib'), kind: 'system', from: { name: 'Horizon', agentId: 'ag-horizon', importance: 2 }, subject: `Connections for ${it.title}: ${need.length - missing.length} of ${need.length} ready`, body: missing.length ? `Still to set up: ${missing.map((c) => c.name).join(', ')}. Each is under Connections; internet ones are transactional.` : 'Everything the blueprint needs is ready.', urgent: false, at, read: false, done: false, scope: 'personal' },
              ...get().inbox,
            ],
          })
          text = `${need.length - missing.length} of ${need.length} connections ready.${missing.length ? ` To set up: ${missing.map((c) => c.name).join(', ')}.` : ''}`
        } else if (kind === 'gather') {
          const docId = get().saveDoc({ initiativeId: it.id, title: `${it.title}: research notes`, kind: 'research', body: `# Sources\n(Paper search and the PDF reader fill this in.)\n\n# What the principle does\n\n# What it is for\n\n# The translation\n` })
          const dsId = get().addDataset({ initiativeId: it.id, name: `${it.title}: first capture`, path: `/data/${it.id}/capture`, items: 0, sizeMb: 0, provenance: 'Own capture — to be recorded.', labelled: false })
          patch.docIds = [...(it.docIds ?? []), docId]
          text = `A research doc and an empty dataset (${dsId.slice(0, 6)}…) registered in the lab. Fill them.`
        } else if (kind === 'experiment') {
          const ds = get().datasets.find((d) => d.initiativeId === it.id) ?? get().datasets[0]
          const base = get().startExperiment({ initiativeId: it.id, name: `Baseline for ${it.title}`, hypothesis: 'The conventional approach on the same data. This is the bar.', datasetId: ds?.id ?? '', config: { epochs: 12, floor: 0.42, ceiling: 0.55 }, epochs: 12, metricName: 'score', device: 'local gpu' })
          const idea = get().startExperiment({ initiativeId: it.id, name: `The idea: ${it.title}`, hypothesis: it.spark.slice(0, 160), datasetId: ds?.id ?? '', config: { epochs: 16, floor: 0.3, ceiling: 0.7 }, epochs: 16, metricName: 'score', device: 'local gpu' })
          patch.experimentIds = [...(it.experimentIds ?? []), base, idea]
          text = 'Two experiments queued in the lab: the baseline, then the idea. The scheduler runs them; curves arrive as they train.'
        } else if (kind === 'evaluate') {
          const exps = get().experiments.filter((e) => (it.experimentIds ?? []).includes(e.id))
          const best = exps.map((e) => ({ e, m: [...e.metrics].sort((a, b) => b.metric - a.metric)[0] })).filter((x) => x.m)
          const body = best.length ? best.map((x) => `${x.e.name}: best ${x.e.metricName} ${x.m.metric.toFixed(3)} at epoch ${x.m.epoch}`).join('. ') + '.' : 'No finished experiments yet.'
          const runId = get().createRun('ag-planner', `Evaluate ${it.title}`, 'The number on the sealed set against the threshold chosen before training.', { kind: 'report', title: `Evaluation: ${it.title}`, body })
          const pieceId = get().addPiece({ title: `Decide: did ${it.title} clear the number?`, detail: body, weight: 2, dependsOn: [] })
          patch.runIds = [...it.runIds, runId]
          patch.pieceIds = [...it.pieceIds, pieceId]
          text = `Evaluation report queued for review. ${body}`
        } else if (kind === 'protect') {
          const hash = Array.from(it.title + it.spark + at).reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0).toString(16).replace('-', '')
          const docId = get().saveDoc({ initiativeId: it.id, title: `Invention record: ${it.title}`, kind: 'disclosure', body: `# Invention record\nTitle: ${it.title}\nRecorded: ${at}\nHash: ${hash}\n\n# What was made\n${it.spark}\n\n# Evidence\nBlueprint, experiments and docs attached to this initiative at the time of recording.\n\n# Ownership\nMade on personal equipment, personal time, personal scope. No company connection was used.` })
          const card = get().saveDoc({ initiativeId: it.id, title: `Model card: ${it.title}`, kind: 'model-card', body: `# ${it.title}\n\n# What it is\n\n# Trained on\n\n# Evaluated on\n\n# Not for\n` })
          patch.docIds = [...(it.docIds ?? []), docId, card]
          text = `Invention record written and hashed (${hash}). Model card drafted. Repo stays private.`
        } else if (kind === 'launch') {
          const goalId = patch.goalId ?? it.goalId
          const runIds = [
            get().createRun('ag-ledger', `Find cash for ${it.title}`, 'Look for over-allocation and idle cash that could fund it.', goalId ? { kind: 'earmark', goalId, usd: 5_000, reason: `Seed funding for ${it.title}.` } : undefined),
            get().createRun('ag-desk', `Watch the inbox for ${it.title}`, 'Surface anything that arrives about it.'),
          ]
          patch.runIds = [...it.runIds, ...runIds]
          text = 'Two runs launched, waiting for review.'
        } else if (kind === 'calendar') {
          const day = todayKey()
          const blocks: TimeBlock[] = [
            { id: uid('blk'), day, start: '10:00', minutes: 90, title: `${it.title}: first piece`, kind: 'deep', initiativeId: it.id },
            { id: uid('blk'), day: todayKey(new Date(Date.now() + 86_400_000)), start: '09:00', minutes: 60, title: `${it.title}: review the runs`, kind: 'admin', initiativeId: it.id },
          ]
          set((st) => ({ blocks: [...st.blocks, ...blocks] }))
          patch.blockIds = [...it.blockIds, ...blocks.map((b) => b.id)]
          text = 'Time on the calendar today and tomorrow.'
        } else if (kind === 'monitor') {
          const runId = get().createRun('ag-desk', `Watch ${it.title}`, it.sleeveId ? 'The sleeve\u2019s exit rule and the thesis\u2019s evidence are watched; anything that moves comes to the Desk.' : 'Anything that arrives about it comes to the Desk.')
          patch.runIds = [...it.runIds, runId]
          text = it.sleeveId ? 'A standing watch. The sleeve flags itself if confidence drops below its exit rule.' : 'A standing watch on the Desk.'
        } else if (kind === 'decide') {
          const pieceId = get().addPiece({ title: `Decide on ${it.title}: continue, change, or stop`, detail: 'Written down, with the reason.', weight: 2, dependsOn: [], goalId: it.goalId })
          patch.pieceIds = [...it.pieceIds, pieceId]
          text = 'The decision is a piece on the journey. Write the reason when you make it.'
        } else {
          text = 'Captured.'
        }

        set({
          initiatives: get().initiatives.map((x) => (x.id === id ? { ...x, ...patch, stageIndex: nextIndex, updatedAt: at, history: [...x.history, { at, stage: stage.id, text }] } : x)),
        })
        h.addNote(`${it.title} → ${stage.label ?? stageMeta(kind).label}`, text)
      },

      saveWorkflow: (wf) => {
        const id = wf.id ?? uid('wf')
        set((s) => ({ workflows: [...s.workflows.filter((w) => w.id !== id), { ...wf, id }] }))
        useHorizon.getState().addNote(`Workflow: ${wf.name}`, `${wf.stages.length} stages: ${wf.stages.map((st) => st.label ?? stageMeta(st.kind).label).join(' → ')}.`)
        return id
      },
      deleteWorkflow: (id) => set((s) => ({ workflows: s.workflows.filter((w) => w.id !== id) })),

      ensureDay: () => {
        const s = get()
        const day = todayKey()
        if (s.blocks.some((b) => b.day === day && !b.initiativeId)) return
        const weekday = new Date().getDay()
        const routine: TimeBlock[] = s.routines.filter((r) => r.weekdays.includes(weekday)).map((r) => ({ id: `blk-${day}-${r.id}`, day, start: r.start, minutes: r.minutes, title: r.title, kind: r.kind, initiativeId: r.initiativeId }))
        set({ blocks: [...s.blocks.filter((b) => b.day >= day), ...routine, ...planDay(s.pieces, inboxScore(s.inbox), day)] })
      },
      toggleBlock: (id) => set((s) => ({ blocks: s.blocks.map((b) => (b.id === id ? { ...b, done: !b.done } : b)) })),
      refreshNudges: () => {
        const s = get()
        const fresh = computeNudges({ bio: s.bio, flow: s.flow, session: s.session, deskSinceMs: s.deskSinceMs, inbox: s.inbox, blocks: s.blocks.filter((b) => b.day === todayKey()) })
        const keep = s.nudges.filter((n) => !n.dismissed && Date.now() - Date.parse(n.at) < 30 * 60_000)
        const known = new Set(keep.map((n) => n.text))
        const added = fresh.filter((n) => !known.has(n.text)).map((n) => ({ ...n, id: uid('nd') }))
        if (added.length && s.senses.haptics) haptic()
        if (added.length || keep.length !== s.nudges.length) set({ nudges: [...keep, ...added] })
      },
      dismissNudge: (id) => set((s) => ({ nudges: s.nudges.map((n) => (n.id === id ? { ...n, dismissed: true } : n)) })),
      logWalk: () => {
        set({ deskSinceMs: Date.now(), nudges: get().nudges.map((n) => (n.kind === 'body' ? { ...n, dismissed: true } : n)) })
        sim.setMode('rest')
        useHorizon.getState().addNote('Went for a walk', 'Logged from a nudge. Desk timer reset.')
      },

      translateInitiative: (id) => {
        const s = get()
        const it = s.initiatives.find((x) => x.id === id)
        if (!it) return undefined
        const bp = translate(it.id, it.title, it.spark, s.useRuntime ? 'runtime' : 'local')
        // Pieces onto the journey with their dependencies, milestones as prefixes.
        const idByTitle = new Map<string, string>()
        for (const piece of bp.pieces) {
          const deps = piece.after.map((t) => idByTitle.get(t)).filter((x): x is string => !!x)
          const pid = get().addPiece({ title: piece.title, detail: `${piece.detail} (${piece.milestone}, about ${piece.size === 'hour' ? 'an hour' : 'a ' + piece.size}.)`, weight: piece.weight, dependsOn: deps, agentId: piece.agentId, goalId: it.goalId })
          idByTitle.set(piece.title, pid)
        }
        const routines = bp.routine.map((r, i) => ({ ...r, id: `rt-${it.id}-${i}`, initiativeId: it.id }))
        set({
          blueprints: [...get().blueprints.filter((b) => b.initiativeId !== it.id), bp],
          routines: [...get().routines.filter((r) => r.initiativeId !== it.id), ...routines],
          initiatives: get().initiatives.map((x) => (x.id === id ? { ...x, blueprintId: bp.id, pieceIds: [...x.pieceIds, ...idByTitle.values()] } : x)),
        })
        return bp.id
      },
      setConnectionStatus: (id, status) => set((s) => ({ connections: s.connections.map((c) => (c.id === id ? { ...c, status } : c)) })),
      startExperiment: (input) => {
        const id = uid('ex')
        set((s) => ({ experiments: [{ ...input, id, status: 'queued', metrics: [], createdAt: nowIso() }, ...s.experiments] }))
        return id
      },
      promoteExperiment: (id) => {
        const e = get().experiments.find((x) => x.id === id)
        if (!e) return
        set((s) => ({ experiments: s.experiments.map((x) => (x.id === id ? { ...x, status: 'promoted' } : x)) }))
        useHorizon.getState().addNote(`Promoted: ${e.name}`, `Best ${e.metricName} ${[...e.metrics].sort((a, b) => b.metric - a.metric)[0]?.metric ?? '—'}. This is the model now.`)
      },
      addDataset: (d) => {
        const id = uid('ds')
        set((s) => ({ datasets: [...s.datasets, { ...d, id }] }))
        return id
      },
      saveDoc: (doc) => {
        const at = nowIso()
        const id = doc.id ?? uid('doc')
        set((s) => {
          const existing = s.docs.find((d) => d.id === id)
          const next: Doc = existing ? { ...existing, ...doc, id, updatedAt: at } : { id, initiativeId: doc.initiativeId, title: doc.title, body: doc.body, kind: doc.kind ?? 'note', createdAt: at, updatedAt: at }
          return { docs: existing ? s.docs.map((d) => (d.id === id ? next : d)) : [next, ...s.docs] }
        })
        return id
      },
      deleteDoc: (id) => set((s) => ({ docs: s.docs.filter((d) => d.id !== id) })),
      saveSheet: (sheet) => {
        const at = nowIso()
        const id = sheet.id ?? uid('sh')
        set((s) => {
          const existing = s.sheets.find((x) => x.id === id)
          const next: Sheet = existing ? { ...existing, ...sheet, id, updatedAt: at } : { id, initiativeId: sheet.initiativeId, title: sheet.title, columns: sheet.columns, numeric: sheet.numeric, rows: sheet.rows, createdAt: at, updatedAt: at }
          return { sheets: existing ? s.sheets.map((x) => (x.id === id ? next : x)) : [next, ...s.sheets] }
        })
        return id
      },
      markSeen: () => set({ lastSeenAt: nowIso() }),

      setWidgets: (ids) => set({ widgets: ids }),
      setSenses: (patch) => set((s) => ({ senses: { ...s.senses, ...patch } })),
      setPalette: (open) => set({ paletteOpen: open }),

      setRuntime: (url, use) => set({ runtimeUrl: url, useRuntime: use, lastError: null }),
      resetOS: () => set({ ...seedState() }),
    }),
    {
      name: OS_STORAGE_KEY,
      version: 1,
      partialize: (s) => ({ ...s, bio: [], pending: {}, lastError: null, paletteOpen: false }) as OSState,
    },
  ),
)
