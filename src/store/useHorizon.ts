import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  SEED_CASH_USD,
  seedDiscovery,
  seedEdges,
  seedEvidence,
  seedJournal,
  seedNodes,
  seedReviewItems,
  seedSleeves,
} from '../data/seed'
import type {
  Candidate,
  CandidateStatus,
  Evidence,
  GraphEdge,
  GraphNode,
  JournalEntry,
  NodePosition,
  ReviewItem,
  ReviewStatus,
  Sleeve,
  Stance,
} from '../lib/types'
import { stanceWord } from '../lib/types'
import { reconcile, type Snapshot, type Trigger } from './reconcile'

export const STORAGE_KEY = 'horizon.notebook.v1'

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
  decideReview: (id: string, status: Exclude<ReviewStatus, 'pending'>) => void

  setNodePosition: (id: string, pos: NodePosition) => void
  unpinNode: (id: string) => void
  unpinAll: () => void

  completeOnboarding: (draft: Draft) => { pillarId: string; thesisId: string }
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
    reviewItems: seedReviewItems.map((r) => ({ ...r })),
    journal: seedJournal.map((j) => ({ ...j })),
    candidateStatus: {} as Record<string, CandidateStatus>,
    layout: {} as Record<string, NodePosition>,
    cashUsd: SEED_CASH_USD,
    onboarded: false,
    firstDraft: null as Draft | null,
  }
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

        completeOnboarding: (draft) => {
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
            onboarded: true,
            firstDraft: draft,
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
    },
  ),
)
