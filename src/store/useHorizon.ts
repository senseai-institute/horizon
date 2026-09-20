import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  SEED_CASH_USD,
  seedDiscovery,
  seedEdges,
  seedEvidence,
  seedGoals,
  seedHabits,
  seedJournal,
  seedJournalGoals,
  seedNodes,
  seedReviewGoals,
  seedReviewItems,
  seedSleeves,
  seedValues,
  seedValueWeights,
} from '../data/seed'
import { alignCompany, monthKey, projectGoal, viewHabit } from '../lib/goals'
import type {
  Candidate,
  CandidateStatus,
  Evidence,
  Goal,
  GraphEdge,
  GraphNode,
  Habit,
  JournalEntry,
  NodePosition,
  ReviewItem,
  ReviewStatus,
  Sleeve,
  Stance,
  ValueWeight,
} from '../lib/types'
import { stanceWord } from '../lib/types'
import { reconcile, type Snapshot, type Trigger } from './reconcile'

export const STORAGE_KEY = 'horizon.notebook.v2'

interface Draft {
  belief: string
  claim: string
  horizonYears: number
  falsifiers: string[]
}

export interface HorizonState {
  nodes: GraphNode[]
  edges: GraphEdge[]
  evidence: Evidence[]
  sleeves: Sleeve[]
  reviewItems: ReviewItem[]
  journal: JournalEntry[]
  candidateStatus: Record<string, CandidateStatus>
  layout: Record<string, NodePosition>
  cashUsd: number
  onboarded: boolean
  /** Kept so a returning user can see what they wrote on their first visit. */
  firstDraft: Draft | null
  goals: Goal[]
  habits: Habit[]
  valueWeights: Record<string, ValueWeight>
  /** Companies the reader has decided not to own, whatever the map says. */
  willNotHold: string[]

  addGoal: (input: Omit<Goal, 'id' | 'createdAt' | 'status' | 'linkedSleeveIds'> & { linkedSleeveIds?: string[] }) => string
  updateGoal: (id: string, patch: Partial<Goal>) => void
  earmarkToGoal: (id: string, usd: number, reason: string) => void
  setGoalStatus: (id: string, status: Goal['status']) => void
  addHabit: (input: Omit<Habit, 'id' | 'createdAt' | 'months'>) => string
  logHabitMonth: (habitId: string, month: string, spentUsd: number) => void
  updateHabit: (id: string, patch: Partial<Pick<Habit, 'title' | 'targetMonthlyUsd' | 'baselineMonthlyUsd' | 'redirectToGoalId' | 'note'>>) => void
  removeHabit: (id: string) => void
  setValueWeight: (valueId: string, weight: ValueWeight) => void
  toggleWillNotHold: (nodeId: string) => void

  setEvidenceStance: (id: string, stance: Stance) => void
  setEvidenceStrength: (id: string, strength: number) => void
  setEvidenceNote: (id: string, note: string) => void
  setEvidenceTarget: (id: string, targetId: string) => void
  addEvidence: (input: Omit<Evidence, 'id' | 'addedAt'>) => string
  removeEvidence: (id: string) => void

  updateNode: (id: string, patch: Partial<GraphNode>) => void
  archiveNode: (id: string) => void
  restoreNode: (id: string) => void
  setEdgeWeight: (id: string, weight: number) => void

  acceptCandidate: (seedName: string, candidate: Candidate) => string
  setCandidateStatus: (candidateId: string, status: CandidateStatus) => void

  updateSleeve: (id: string, patch: Partial<Pick<Sleeve, 'targetPct' | 'cadence' | 'exitBelow' | 'rules' | 'note' | 'name'>>) => void
  addSleeve: (input: Pick<Sleeve, 'name' | 'rootId' | 'targetPct' | 'exitBelow'> & Partial<Pick<Sleeve, 'rules' | 'cadence' | 'note'>>) => string
  decideReview: (id: string, status: Exclude<ReviewStatus, 'pending'>) => void

  setNodePosition: (id: string, pos: NodePosition) => void
  unpinNode: (id: string) => void
  unpinAll: () => void

  addBelief: (draft: Draft) => { pillarId: string; thesisId: string }
  completeOnboarding: () => void
  skipOnboarding: () => void
  addNote: (title: string, detail: string, nodeId?: string) => void
  resetNotebook: () => void
}

const nowIso = () => new Date().toISOString()

/**
 * Turns what someone typed into a short name for the map. Drops the hedge at
 * the front and cuts on a word boundary so a node never reads mid-syllable.
 */
export function beliefToLabel(belief: string, maxChars = 44): string {
  const cleaned = belief
    .trim()
    .replace(/^(i\s+(think|believe|reckon|suspect|expect)\s+(that\s+)?)/i, '')
    .replace(/\.$/, '')
    .trim()
  const titled = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  if (titled.length <= maxChars) return titled
  const cut = titled.slice(0, maxChars)
  const at = cut.lastIndexOf(' ')
  return `${(at > maxChars * 0.5 ? cut.slice(0, at) : cut).replace(/[,;:]$/, '')}…`
}
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

function seedState() {
  return {
    nodes: seedNodes.map((n) => ({ ...n })),
    edges: seedEdges.map((e) => ({ ...e })),
    evidence: seedEvidence.map((e) => ({ ...e })),
    sleeves: seedSleeves.map((s) => ({ ...s, positions: s.positions.map((p) => ({ ...p })) })),
    reviewItems: [...seedReviewGoals, ...seedReviewItems].map((r) => ({ ...r })),
    journal: [...seedJournal, ...seedJournalGoals].map((j) => ({ ...j })),
    candidateStatus: {} as Record<string, CandidateStatus>,
    layout: {} as Record<string, NodePosition>,
    cashUsd: SEED_CASH_USD,
    onboarded: false,
    firstDraft: null as Draft | null,
    goals: seedGoals.map((g) => ({ ...g, linkedSleeveIds: [...g.linkedSleeveIds] })),
    habits: seedHabits.map((h) => ({ ...h, months: h.months.map((m) => ({ ...m })) })),
    valueWeights: { ...seedValueWeights },
    willNotHold: [] as string[],
  }
}

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`

/**
 * Looks at every active goal with a date and raises one item per goal that
 * is going to land short at the current rate. Points at an over-allocated
 * sleeve when there is one, because that is money nobody has decided to keep.
 */
function goalItems(state: Pick<HorizonState, 'goals' | 'habits' | 'sleeves' | 'reviewItems' | 'cashUsd'>, now: string): ReviewItem[] {
  const out: ReviewItem[] = []
  const pending = new Set(state.reviewItems.filter((r) => r.status === 'pending' && r.kind === 'goal').map((r) => r.goalId))
  const sleeveValue = (id: string) => state.sleeves.find((s) => s.id === id)?.positions.reduce((a, p) => a + p.valueUsd, 0) ?? 0
  const totalUsd = state.cashUsd + state.sleeves.reduce((a, s) => a + sleeveValue(s.id), 0)
  const released = (goalId: string) =>
    state.habits.filter((h) => h.redirectToGoalId === goalId).reduce((a, h) => a + viewHabit(h).releasedUsd, 0)
  const over = state.sleeves
    .map((s) => ({ s, driftUsd: (sleeveValue(s.id) / totalUsd) * 100 - s.targetPct }))
    .map((x) => ({ ...x, usd: (x.driftUsd / 100) * totalUsd }))
    .filter((x) => x.driftUsd > 1)
    .sort((a, b) => b.usd - a.usd)[0]
  for (const goal of state.goals) {
    if (goal.status !== 'active' || !goal.targetDate || pending.has(goal.id)) continue
    const p = projectGoal(goal, sleeveValue, released(goal.id), new Date(now))
    if (p.shortfallUsd < 250) continue
    const uid = `rv-goal-${goal.id}-${Date.parse(now).toString(36)}`
    const chain: ReviewItem['chain'] = [
      { kind: 'goal', label: goal.title, detail: `Target ${money(goal.targetUsd)}${goal.targetDate ? ` by ${new Date(goal.targetDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}. Funded ${money(p.fundedUsd)}, plus ${money(goal.monthlyUsd)} a month.`, goalId: goal.id },
      { kind: 'rule', label: 'Projection', detail: `${p.monthsToDate} monthly contributions left. Lands at ${money(p.fundedUsd + goal.monthlyUsd * (p.monthsToDate ?? 0))}, ${money(p.shortfallUsd)} short.`, goalId: goal.id },
    ]
    if (over) chain.push({ kind: 'sleeve', label: over.s.name, detail: `Currently ${over.driftUsd.toFixed(1)} points over its target — about ${money(over.usd)} nobody has decided to keep.`, sleeveId: over.s.id })
    out.push({
      id: uid,
      createdAt: now,
      status: 'pending',
      kind: 'goal',
      title: `${goal.title} is ${money(p.shortfallUsd)} short`,
      summary: `At ${money(goal.monthlyUsd)} a month it lands ${money(p.shortfallUsd)} under the ${money(goal.targetUsd)} target on its date.`,
      proposal: over
        ? `Trim ${over.s.name} back to target and earmark the ${money(Math.min(over.usd, p.shortfallUsd))} for this goal${p.neededMonthlyUsd && p.neededMonthlyUsd > goal.monthlyUsd ? `, or raise the monthly contribution to ${money(p.neededMonthlyUsd)}` : ''}.`
        : p.neededMonthlyUsd
          ? `Raise the monthly contribution to ${money(p.neededMonthlyUsd)}, or move the date.`
          : 'Move the date, or lower the target.',
      goalId: goal.id,
      sleeveId: over?.s.id,
      chain,
    })
  }
  return out
}

/** One item per company on the map that works against a core value. */
function valueItems(state: Pick<HorizonState, 'nodes' | 'valueWeights' | 'reviewItems' | 'willNotHold'>, now: string): ReviewItem[] {
  const out: ReviewItem[] = []
  const pending = new Set(state.reviewItems.filter((r) => r.status === 'pending' && r.kind === 'values').map((r) => r.nodeId))
  for (const node of state.nodes) {
    if (node.kind !== 'company' || node.archived || pending.has(node.id) || state.willNotHold.includes(node.id)) continue
    const a = alignCompany(node, state.valueWeights, seedValues)
    if (!a.hardConflict) continue
    const worst = a.conflicts[0]
    out.push({
      id: `rv-values-${node.id}-${Date.parse(now).toString(36)}`,
      createdAt: now,
      status: 'pending',
      kind: 'values',
      title: `${node.label} works against a core value`,
      summary: `${worst.value.label} is marked core. ${node.label} scores ${worst.score} on it: ${worst.reason}`,
      proposal: 'Keep it on the map as a measurement device and mark it "will not hold", or decide the value is not core after all.',
      nodeId: node.id,
      chain: [
        { kind: 'value', label: `${worst.value.label} — core`, detail: 'Weighted 2 of 2 on the values screen.' },
        { kind: 'company', label: node.label, detail: a.conflicts.map((c) => `${c.value.label} ${c.score}`).join(', ') + '.', nodeId: node.id },
      ],
    })
  }
  return out
}

export const useHorizon = create<HorizonState>()(
  persist(
    (set, get) => {
      /**
       * Every change that can move confidence goes through here, so the
       * propagation, the journal and the review queue can never drift apart
       * from each other.
       */
      const commit = (
        mutate: (s: HorizonState) => Partial<Pick<HorizonState, 'nodes' | 'edges' | 'evidence'>>,
        trigger: Trigger,
        extraJournal?: Omit<JournalEntry, 'id' | 'at'>,
      ) => {
        const s = get()
        const before: Snapshot = { nodes: s.nodes, edges: s.edges, evidence: s.evidence }
        const patch = mutate(s)
        const after: Snapshot = {
          nodes: patch.nodes ?? s.nodes,
          edges: patch.edges ?? s.edges,
          evidence: patch.evidence ?? s.evidence,
        }
        const at = nowIso()
        const { reviewItems, journal } = reconcile(before, after, s.sleeves, s.reviewItems, trigger, at)
        const extras: JournalEntry[] = extraJournal ? [{ id: uid('jr'), at, ...extraJournal }] : []
        set({
          ...after,
          reviewItems: [...reviewItems, ...s.reviewItems],
          journal: [...extras, ...journal, ...s.journal],
        })
      }

      return {
        ...seedState(),

        setEvidenceStance: (id, stance) => {
          const e = get().evidence.find((x) => x.id === id)
          if (!e || e.stance === stance) return
          commit(
            (s) => ({ evidence: s.evidence.map((x) => (x.id === id ? { ...x, stance } : x)) }),
            {
              label: `"${e.title}" was re-marked as ${stanceWord(stance)}.`,
              nodeId: e.targetId,
              evidenceId: e.id,
              evidenceTitle: e.title,
              evidenceSource: `${e.source.company}, ${e.source.form}, ${e.source.section}`,
              stance,
              strength: e.strength,
            },
            {
              type: 'evidence',
              title: `Re-marked "${e.title}" as ${stanceWord(stance)}`,
              detail: `${e.source.company} ${e.source.form}, ${e.source.section}. Strength ${e.strength}.`,
              nodeId: e.targetId,
            },
          )
        },

        setEvidenceStrength: (id, strength) => {
          const e = get().evidence.find((x) => x.id === id)
          if (!e || e.strength === strength) return
          commit(
            (s) => ({ evidence: s.evidence.map((x) => (x.id === id ? { ...x, strength } : x)) }),
            {
              label: `"${e.title}" was re-weighted from ${e.strength} to ${strength}.`,
              nodeId: e.targetId,
              evidenceId: e.id,
              evidenceTitle: e.title,
              evidenceSource: `${e.source.company}, ${e.source.form}, ${e.source.section}`,
              stance: e.stance,
              strength,
            },
            {
              type: 'evidence',
              title: `Re-weighted "${e.title}" to ${strength}`,
              detail: `Was ${e.strength}. ${e.source.company} ${e.source.form}.`,
              nodeId: e.targetId,
            },
          )
        },

        setEvidenceNote: (id, note) =>
          set((s) => ({ evidence: s.evidence.map((x) => (x.id === id ? { ...x, note } : x)) })),

        setEvidenceTarget: (id, targetId) => {
          const s = get()
          const e = s.evidence.find((x) => x.id === id)
          if (!e || e.targetId === targetId) return
          const from = s.nodes.find((n) => n.id === e.targetId)
          const to = s.nodes.find((n) => n.id === targetId)
          commit(
            (st) => ({ evidence: st.evidence.map((x) => (x.id === id ? { ...x, targetId } : x)) }),
            {
              label: `"${e.title}" was re-filed from ${from?.label ?? 'nowhere'} to ${to?.label ?? targetId}.`,
              nodeId: targetId,
              evidenceId: e.id,
              evidenceTitle: e.title,
              evidenceSource: `${e.source.company}, ${e.source.form}, ${e.source.section}`,
              stance: e.stance,
              strength: e.strength,
            },
            {
              type: 'evidence',
              title: `Re-filed "${e.title}" under ${to?.label ?? targetId}`,
              detail: `Was attached to ${from?.label ?? 'nothing'}. Both beliefs have been recomputed.`,
              nodeId: targetId,
            },
          )
        },

        addEvidence: (input) => {
          const id = uid('ev')
          const e: Evidence = { ...input, id, addedAt: nowIso() }
          const target = get().nodes.find((n) => n.id === e.targetId)
          commit(
            (s) => ({ evidence: [...s.evidence, e] }),
            {
              label: `"${e.title}" was attached to ${target?.label ?? e.targetId} as ${stanceWord(e.stance)}.`,
              nodeId: e.targetId,
              evidenceId: id,
              evidenceTitle: e.title,
              evidenceSource: `${e.source.company}, ${e.source.form}, ${e.source.section}`,
              stance: e.stance,
              strength: e.strength,
            },
            {
              type: 'evidence',
              title: `Attached "${e.title}" to ${target?.label ?? 'the map'}`,
              detail: `${e.source.company} ${e.source.form}, ${e.source.section}. Marked ${stanceWord(e.stance)} at strength ${e.strength}.`,
              nodeId: e.targetId,
            },
          )
          return id
        },

        removeEvidence: (id) => {
          const e = get().evidence.find((x) => x.id === id)
          if (!e) return
          commit(
            (s) => ({ evidence: s.evidence.filter((x) => x.id !== id) }),
            { label: `"${e.title}" was detached.`, nodeId: e.targetId },
            {
              type: 'evidence',
              title: `Detached "${e.title}"`,
              detail: `${e.source.company} ${e.source.form}. It no longer counts toward any confidence score.`,
              nodeId: e.targetId,
            },
          )
        },

        updateNode: (id, patch) => {
          const node = get().nodes.find((n) => n.id === id)
          if (!node) return
          const changedFields = Object.keys(patch).filter(
            (k) => (patch as Record<string, unknown>)[k] !== (node as unknown as Record<string, unknown>)[k],
          )
          if (!changedFields.length) return
          commit(
            (s) => ({ nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }),
            { label: `${node.label} was edited.`, nodeId: id },
            {
              type: 'belief',
              title: `Edited ${node.label}`,
              detail: `Changed ${changedFields.join(', ')}.`,
              nodeId: id,
            },
          )
        },

        archiveNode: (id) => {
          const node = get().nodes.find((n) => n.id === id)
          if (!node) return
          commit(
            (s) => ({ nodes: s.nodes.map((n) => (n.id === id ? { ...n, archived: true } : n)) }),
            { label: `${node.label} was archived.`, nodeId: id },
            {
              type: 'belief',
              title: `Archived ${node.label}`,
              detail: 'It stays in the record but no longer contributes to anything above it.',
              nodeId: id,
            },
          )
        },

        restoreNode: (id) => {
          const node = get().nodes.find((n) => n.id === id)
          if (!node) return
          commit(
            (s) => ({ nodes: s.nodes.map((n) => (n.id === id ? { ...n, archived: false } : n)) }),
            { label: `${node.label} was restored.`, nodeId: id },
            { type: 'belief', title: `Restored ${node.label}`, detail: 'Back in the map and counting again.', nodeId: id },
          )
        },

        setEdgeWeight: (id, weight) => {
          const edge = get().edges.find((e) => e.id === id)
          if (!edge) return
          const nodes = get().nodes
          const from = nodes.find((n) => n.id === edge.from)
          const to = nodes.find((n) => n.id === edge.to)
          commit(
            (s) => ({ edges: s.edges.map((e) => (e.id === id ? { ...e, weight } : e)) }),
            { label: `The link from ${from?.label} to ${to?.label} was re-weighted to ${weight.toFixed(2)}.`, nodeId: edge.from },
            {
              type: 'belief',
              title: `Re-weighted ${from?.label} → ${to?.label}`,
              detail: `From ${edge.weight.toFixed(2)} to ${weight.toFixed(2)}.`,
              nodeId: edge.to,
            },
          )
        },

        acceptCandidate: (seedName, candidate) => {
          const s = get()
          const existing = candidate.existingNodeId
            ? s.nodes.find((n) => n.id === candidate.existingNodeId)
            : s.nodes.find((n) => n.ticker === candidate.ticker)
          const nodeId = existing?.id ?? uid('co')
          const at = nowIso()
          const newNode: GraphNode = {
            id: nodeId,
            kind: 'company',
            label: candidate.name,
            ticker: candidate.ticker,
            exchange: candidate.exchange,
            marketCapB: candidate.marketCapB,
            prior: 50,
            sicCode: candidate.sicCode,
            sicLabel: candidate.sicLabel,
            businessDescription: candidate.description,
            createdAt: at,
          }
          const alreadyLinked = s.edges.some((e) => e.from === nodeId && e.to === candidate.suggestedParentId)
          const newEdge: GraphEdge = {
            id: `e-${nodeId}-${candidate.suggestedParentId}`,
            from: nodeId,
            to: candidate.suggestedParentId,
            weight: Math.max(0.3, Math.min(0.85, candidate.score / 110)),
            rationale: `Accepted from discovery on ${seedName}. ${candidate.reasons[0]?.detail ?? ''}`,
            createdAt: at,
          }
          const parentLabel = s.nodes.find((n) => n.id === candidate.suggestedParentId)?.label ?? 'the map'
          set({ candidateStatus: { ...s.candidateStatus, [candidate.id]: 'accepted' } })
          commit(
            (st) => ({
              nodes: existing ? st.nodes : [...st.nodes, newNode],
              edges: alreadyLinked ? st.edges : [...st.edges, newEdge],
            }),
            { label: `${candidate.name} was accepted from discovery on ${seedName}.`, nodeId },
            {
              type: 'discovery',
              title: `Accepted ${candidate.name} (${candidate.ticker})`,
              detail: `Matched ${seedName} at ${candidate.score}. Filed under ${parentLabel}. ${
                candidate.reasons[0]?.label ?? ''
              }.`,
              nodeId,
            },
          )
          return nodeId
        },

        setCandidateStatus: (candidateId, status) => {
          const s = get()
          const seed = seedDiscovery.find((d) => d.candidates.some((c) => c.id === candidateId))
          const cand = seed?.candidates.find((c) => c.id === candidateId)
          set({
            candidateStatus: { ...s.candidateStatus, [candidateId]: status },
            journal:
              cand && seed
                ? [
                    {
                      id: uid('jr'),
                      at: nowIso(),
                      type: 'discovery',
                      title: `${status === 'rejected' ? 'Rejected' : 'Set aside'} ${cand.name}`,
                      detail:
                        status === 'rejected'
                          ? `From the ${seed.name} results. Rejected candidates are remembered and will not be suggested again.`
                          : `From the ${seed.name} results. Kept for later without adding it to the map.`,
                    },
                    ...s.journal,
                  ]
                : s.journal,
          })
        },

        updateSleeve: (id, patch) => {
          const s = get()
          const sleeve = s.sleeves.find((x) => x.id === id)
          if (!sleeve) return
          const sleeves = s.sleeves.map((x) => (x.id === id ? { ...x, ...patch } : x))
          const notes: string[] = []
          if (patch.targetPct !== undefined && patch.targetPct !== sleeve.targetPct)
            notes.push(`target ${sleeve.targetPct}% → ${patch.targetPct}%`)
          if (patch.exitBelow !== undefined && patch.exitBelow !== sleeve.exitBelow)
            notes.push(`exit threshold ${sleeve.exitBelow} → ${patch.exitBelow}`)
          if (patch.cadence && patch.cadence !== sleeve.cadence) notes.push(`revisit ${sleeve.cadence} → ${patch.cadence}`)
          if (patch.rules && patch.rules.maxSinglePositionPct !== sleeve.rules.maxSinglePositionPct)
            notes.push(`position cap ${sleeve.rules.maxSinglePositionPct}% → ${patch.rules.maxSinglePositionPct}%`)
          if (patch.rules && patch.rules.minMarketCapM !== sleeve.rules.minMarketCapM)
            notes.push(`minimum size $${sleeve.rules.minMarketCapM}m → $${patch.rules.minMarketCapM}m`)
          set({
            sleeves,
            journal: notes.length
              ? [
                  {
                    id: uid('jr'),
                    at: nowIso(),
                    type: 'sleeve',
                    title: `Changed the ${sleeve.name} sleeve`,
                    detail: `${notes.join('; ')}.`,
                  },
                  ...s.journal,
                ]
              : s.journal,
          })
        },

        addSleeve: (input) => {
          const s = get()
          const id = uid('sl')
          const at = nowIso()
          const sleeve: Sleeve = {
            id,
            name: input.name,
            rootId: input.rootId,
            targetPct: input.targetPct,
            rules: input.rules ?? { maxSinglePositionPct: 3, minMarketCapM: 1_000 },
            cadence: input.cadence ?? 'on-confidence-change',
            exitBelow: input.exitBelow,
            positions: [],
            createdAt: at,
            note: input.note,
          }
          const root = s.nodes.find((n) => n.id === input.rootId)
          set({
            sleeves: [...s.sleeves, sleeve],
            journal: [
              { id: uid('jr'), at, type: 'sleeve', title: `Opened the ${input.name} sleeve`, detail: `Pointed at ${root?.label ?? input.rootId}. Target ${input.targetPct}%, exit rule below ${input.exitBelow}. No positions yet.` },
              ...s.journal,
            ],
          })
          return id
        },

        decideReview: (id, status) => {
          const s = get()
          const item = s.reviewItems.find((r) => r.id === id)
          if (!item || item.status !== 'pending') return
          const at = nowIso()
          set({
            reviewItems: s.reviewItems.map((r) => (r.id === id ? { ...r, status, decidedAt: at } : r)),
            journal: [
              {
                id: uid('jr'),
                at,
                type: 'decision',
                title: `${status === 'approved' ? 'Approved' : 'Rejected'}: ${item.title}`,
                detail:
                  status === 'approved'
                    ? `${item.proposal} Queued — nothing is sent anywhere in this build.`
                    : `Declined. ${item.summary}`,
                nodeId: item.nodeId,
              },
              ...s.journal,
            ],
          })
        },

        setNodePosition: (id, pos) => set((s) => ({ layout: { ...s.layout, [id]: pos } })),
        unpinNode: (id) =>
          set((s) => {
            const current = s.layout[id]
            if (!current) return {}
            return { layout: { ...s.layout, [id]: { x: current.x, y: current.y, fx: null, fy: null } } }
          }),
        unpinAll: () => set({ layout: {} }),

        addGoal: (input) => {
          const s = get()
          const id = uid('g')
          const at = nowIso()
          const goal: Goal = { ...input, id, createdAt: at, status: 'active', linkedSleeveIds: input.linkedSleeveIds ?? [] }
          const journal: JournalEntry[] = [
            { id: uid('jr'), at, type: 'goal', title: `New goal: ${goal.title}`, detail: `${money(goal.targetUsd)}, ${goal.horizon}. ${goal.why}`, goalId: id },
            ...s.journal,
          ]
          const next = { goals: [...s.goals, goal], journal }
          set({ ...next, reviewItems: [...goalItems({ ...s, ...next }, at), ...s.reviewItems] })
          return id
        },

        updateGoal: (id, patch) => {
          const s = get()
          const goal = s.goals.find((g) => g.id === id)
          if (!goal) return
          const at = nowIso()
          const goals = s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g))
          const changed = Object.keys(patch).filter((k) => (patch as Record<string, unknown>)[k] !== (goal as unknown as Record<string, unknown>)[k])
          if (!changed.length) return
          const journal: JournalEntry[] = [
            { id: uid('jr'), at, type: 'goal', title: `Changed ${goal.title}`, detail: `Updated ${changed.join(', ')}.`, goalId: id },
            ...s.journal,
          ]
          set({ goals, journal, reviewItems: [...goalItems({ ...s, goals }, at), ...s.reviewItems] })
        },

        earmarkToGoal: (id, usd, reason) => {
          const s = get()
          const goal = s.goals.find((g) => g.id === id)
          if (!goal || !usd) return
          const at = nowIso()
          const goals = s.goals.map((g) => (g.id === id ? { ...g, earmarkedUsd: Math.max(0, g.earmarkedUsd + usd) } : g))
          set({
            goals,
            journal: [
              { id: uid('jr'), at, type: 'goal', title: `${usd > 0 ? 'Set aside' : 'Released'} ${money(Math.abs(usd))} ${usd > 0 ? 'for' : 'from'} ${goal.title}`, detail: reason, goalId: id },
              ...s.journal,
            ],
          })
        },

        setGoalStatus: (id, status) => {
          const s = get()
          const goal = s.goals.find((g) => g.id === id)
          if (!goal || goal.status === status) return
          const at = nowIso()
          set({
            goals: s.goals.map((g) => (g.id === id ? { ...g, status, reachedAt: status === 'reached' ? at : g.reachedAt } : g)),
            journal: [
              {
                id: uid('jr'),
                at,
                type: 'goal',
                title: status === 'reached' ? `Reached: ${goal.title}` : status === 'paused' ? `Paused ${goal.title}` : `Resumed ${goal.title}`,
                detail: status === 'reached' ? goal.why : status === 'paused' ? 'Contributions stop. The earmark stays where it is.' : 'Contributions start again.',
                goalId: id,
              },
              ...s.journal,
            ],
          })
        },

        addHabit: (input) => {
          const s = get()
          const id = uid('h')
          const at = nowIso()
          const goal = s.goals.find((g) => g.id === input.redirectToGoalId)
          const habit: Habit = { ...input, id, createdAt: at, months: [] }
          set({
            habits: [...s.habits, habit],
            journal: [
              {
                id: uid('jr'),
                at,
                type: 'habit',
                title: `Started tracking ${input.category.toLowerCase()}`,
                detail: `Baseline ${money(input.baselineMonthlyUsd)} a month, aiming for ${money(input.targetMonthlyUsd)}. Whatever is not spent goes to ${goal?.title ?? 'a goal'}.`,
                goalId: goal?.id,
              },
              ...s.journal,
            ],
          })
          return id
        },

        logHabitMonth: (habitId, month, spentUsd) => {
          const s = get()
          const habit = s.habits.find((h) => h.id === habitId)
          if (!habit) return
          const at = nowIso()
          const existing = habit.months.find((m) => m.month === month)
          const months = existing
            ? habit.months.map((m) => (m.month === month ? { ...m, spentUsd } : m))
            : [...habit.months, { month, spentUsd }]
          const habits = s.habits.map((h) => (h.id === habitId ? { ...h, months } : h))
          const goal = s.goals.find((g) => g.id === habit.redirectToGoalId)
          const released = Math.max(0, habit.baselineMonthlyUsd - spentUsd)
          const isCurrent = month === monthKey(new Date(at))
          const under = spentUsd <= habit.targetMonthlyUsd
          const label = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1).toLocaleDateString('en-GB', { month: 'long' })
          const journal: JournalEntry[] = [
            {
              id: uid('jr'),
              at,
              type: 'habit',
              title: isCurrent
                ? `${label} so far: ${money(spentUsd)} on ${habit.category.toLowerCase()}`
                : under
                  ? `${label}: under target on ${habit.category.toLowerCase()}`
                  : `${label}: ${money(spentUsd)} on ${habit.category.toLowerCase()}`,
              detail: isCurrent
                ? `On course to release ${money(released)} to ${goal?.title ?? 'the goal'} when the month closes.`
                : released > 0
                  ? `${money(released)} released to ${goal?.title ?? 'the goal'}${under ? '. Target was ' + money(habit.targetMonthlyUsd) + ' — met.' : '.'}`
                  : `Over the ${money(habit.baselineMonthlyUsd)} baseline. Nothing released this month; nothing lost either.`,
              goalId: goal?.id,
              delta: isCurrent ? undefined : released || undefined,
            },
            ...s.journal,
          ]
          set({ habits, journal, reviewItems: [...goalItems({ ...s, habits }, at), ...s.reviewItems] })
        },

        updateHabit: (id, patch) =>
          set((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)) })),

        removeHabit: (id) => {
          const s = get()
          const habit = s.habits.find((h) => h.id === id)
          if (!habit) return
          set({
            habits: s.habits.filter((h) => h.id !== id),
            journal: [
              { id: uid('jr'), at: nowIso(), type: 'habit', title: `Stopped tracking ${habit.category.toLowerCase()}`, detail: 'The months already released stay with their goal.' },
              ...s.journal,
            ],
          })
        },

        setValueWeight: (valueId, weight) => {
          const s = get()
          if ((s.valueWeights[valueId] ?? 0) === weight) return
          const at = nowIso()
          const valueWeights = { ...s.valueWeights, [valueId]: weight }
          const value = seedValues.find((v) => v.id === valueId)
          const journal: JournalEntry[] = [
            {
              id: uid('jr'),
              at,
              type: 'values',
              title: `${value?.label ?? valueId}: ${weight === 2 ? 'core' : weight === 1 ? 'matters' : 'not a consideration'}`,
              detail: weight === 2 ? 'Companies that work against this will be raised for review.' : 'Alignment scores have been recomputed.',
            },
            ...s.journal,
          ]
          set({ valueWeights, journal, reviewItems: [...valueItems({ ...s, valueWeights }, at), ...s.reviewItems] })
        },

        toggleWillNotHold: (nodeId) => {
          const s = get()
          const node = s.nodes.find((n) => n.id === nodeId)
          const on = s.willNotHold.includes(nodeId)
          set({
            willNotHold: on ? s.willNotHold.filter((id) => id !== nodeId) : [...s.willNotHold, nodeId],
            journal: [
              {
                id: uid('jr'),
                at: nowIso(),
                type: 'values',
                title: on ? `${node?.label ?? nodeId} can be held again` : `Will not hold ${node?.label ?? nodeId}`,
                detail: on ? 'The values conflict stands; the decision changed.' : 'Stays on the map as a measurement device. No sleeve will hold it.',
                nodeId,
              },
              ...s.journal,
            ],
          })
        },

        completeOnboarding: () => set({ onboarded: true }),

        addBelief: (draft) => {
          const s = get()
          const at = nowIso()
          const pillarId = uid('p')
          const thesisId = uid('t')
          const label = beliefToLabel(draft.belief) || 'My first belief'
          const pillar: GraphNode = {
            id: pillarId,
            kind: 'pillar',
            label,
            claim: draft.claim.trim(),
            horizonYears: draft.horizonYears,
            falsifiers: draft.falsifiers.filter((f) => f.trim().length > 0),
            prior: 55,
            createdAt: at,
          }
          const thesis: GraphNode = {
            id: thesisId,
            kind: 'thesis',
            label: 'First thesis — needs grounding',
            claim: `A narrower version of "${label}" that can actually be checked against a document. Written on the first day and left deliberately unfinished.`,
            horizonYears: Math.max(2, Math.round(draft.horizonYears / 2)),
            falsifiers: draft.falsifiers.slice(0, 1).filter((f) => f.trim().length > 0),
            prior: 50,
            createdAt: at,
          }
          set({
            nodes: [...s.nodes, pillar, thesis],
            edges: [
              ...s.edges,
              {
                id: `e-${thesisId}-${pillarId}`,
                from: thesisId,
                to: pillarId,
                weight: 0.7,
                rationale: 'Created during onboarding as the first narrower claim under the pillar.',
                createdAt: at,
              },
            ],
            firstDraft: s.firstDraft ?? draft,
            journal: [
              {
                id: uid('jr'),
                at,
                type: 'belief',
                title: `Wrote the pillar "${label}"`,
                detail: `${draft.falsifiers.filter((f) => f.trim()).length} falsifier${
                  draft.falsifiers.filter((f) => f.trim()).length === 1 ? '' : 's'
                } on file, over a ${draft.horizonYears}-year horizon. Nothing underneath it yet.`,
                nodeId: pillarId,
              },
              ...s.journal,
            ],
          })
          return { pillarId, thesisId }
        },

        skipOnboarding: () => set({ onboarded: true }),

        addNote: (title, detail, nodeId) =>
          set((s) => ({
            journal: [{ id: uid('jr'), at: nowIso(), type: 'note', title, detail, nodeId }, ...s.journal],
          })),

        resetNotebook: () => set({ ...seedState() }),
      }
    },
    {
      name: STORAGE_KEY,
      version: 1,
      /* Saved state from an older build: keep every key whose shape still fits, default the rest. */
      merge: (persisted, current) => {
        const p = (persisted && typeof persisted === 'object' ? persisted : {}) as Record<string, unknown>
        const out: Record<string, unknown> = { ...current }
        for (const [k, v] of Object.entries(p)) {
          const base = (current as unknown as Record<string, unknown>)[k]
          if (v === undefined || v === null) continue
          if (Array.isArray(base) && !Array.isArray(v)) continue
          if (base !== null && typeof base === 'object' && !Array.isArray(base) && (typeof v !== 'object' || Array.isArray(v))) continue
          if (typeof base === 'boolean' && typeof v !== 'boolean') continue
          out[k] = v
        }
        return out as unknown as HorizonState
      },
    },
  ),
)
