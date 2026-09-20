import {
  computeConfidence,
  pathUpwards,
  type ConfidenceMap,
} from '../lib/confidence'
import { stanceWord } from '../lib/types'
import type {
  ChainLink,
  Evidence,
  GraphEdge,
  GraphNode,
  JournalEntry,
  ReviewItem,
  Sleeve,
} from '../lib/types'

/** A pillar has to move at least this much before the queue asks about it. */
const PILLAR_ATTENTION = 2

export interface Trigger {
  /** Short description of what the user just did. */
  label: string
  /** Where the change entered the map. */
  nodeId?: string
  evidenceId?: string
  evidenceTitle?: string
  evidenceSource?: string
  stance?: Evidence['stance']
  strength?: number
}

export interface Snapshot {
  nodes: GraphNode[]
  edges: GraphEdge[]
  evidence: Evidence[]
}

export function confidenceOf(s: Snapshot): ConfidenceMap {
  return computeConfidence(s.nodes, s.edges, s.evidence).confidence
}

const round1 = (n: number) => Math.round(n * 10) / 10
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(round1(n))}`

function kindToChainKind(kind: GraphNode['kind']): ChainLink['kind'] {
  return kind
}

/**
 * Builds the chain of reasoning from wherever a change entered the map up to
 * the node that ended up affected — the "this filing contradicted this thesis,
 * which lowered confidence in this pillar" narration the review queue shows.
 */
function buildChain(
  before: ConfidenceMap,
  after: ConfidenceMap,
  nodes: GraphNode[],
  edges: GraphEdge[],
  evidence: Evidence[],
  trigger: Trigger,
  targetId: string,
  sleeve?: Sleeve,
): ChainLink[] {
  const chain: ChainLink[] = []
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const { index } = computeConfidence(nodes, edges, evidence)

  if (trigger.evidenceId && trigger.evidenceTitle) {
    chain.push({
      kind: 'evidence',
      label: trigger.evidenceTitle,
      detail: [
        trigger.evidenceSource,
        trigger.stance ? `Marked ${stanceWord(trigger.stance)}` : null,
        trigger.strength ? `at strength ${trigger.strength}` : null,
      ]
        .filter(Boolean)
        .join('. ')
        .concat('.'),
      evidenceId: trigger.evidenceId,
    })
  }

  const start = trigger.nodeId
  const path = start ? pathUpwards(index, start, targetId) ?? [start] : [targetId]
  for (const id of path) {
    const node = byId.get(id)
    if (!node) continue
    const delta = (after[id] ?? 0) - (before[id] ?? 0)
    chain.push({
      kind: kindToChainKind(node.kind),
      label: node.label,
      detail:
        Math.abs(delta) < 0.05
          ? `Unchanged at ${round1(after[id] ?? 0)}.`
          : `Confidence moved ${signed(delta)} to ${round1(after[id] ?? 0)}.`,
      nodeId: id,
      delta: round1(delta),
    })
  }

  if (sleeve) {
    chain.push({
      kind: 'rule',
      label: `Exit rule: flag below ${sleeve.exitBelow}`,
      detail: `Branch confidence is now ${round1(after[sleeve.rootId] ?? 0)}, which is under the threshold set when the sleeve was opened.`,
      sleeveId: sleeve.id,
    })
  }
  return chain
}

export interface ReconcileResult {
  reviewItems: ReviewItem[]
  journal: JournalEntry[]
}

/**
 * Compares the map before and after a change and decides what needs a human.
 * Horizon never acts on its own — everything this produces lands in the review
 * queue and waits.
 */
export function reconcile(
  beforeSnap: Snapshot,
  afterSnap: Snapshot,
  sleeves: Sleeve[],
  existing: ReviewItem[],
  trigger: Trigger,
  now: string,
): ReconcileResult {
  const before = confidenceOf(beforeSnap)
  const after = confidenceOf(afterSnap)
  const byId = new Map(afterSnap.nodes.map((n) => [n.id, n]))
  const reviewItems: ReviewItem[] = []
  const journal: JournalEntry[] = []
  const pendingKeys = new Set(
    existing.filter((r) => r.status === 'pending').map((r) => `${r.kind}:${r.nodeId ?? ''}:${r.sleeveId ?? ''}`),
  )
  const claim = (key: string) => {
    if (pendingKeys.has(key)) return false
    pendingKeys.add(key)
    return true
  }
  const uid = (prefix: string) => `${prefix}-${Date.parse(now).toString(36)}-${Math.random().toString(36).slice(2, 7)}`

  /* Sleeve exit rules. */
  for (const sleeve of sleeves) {
    const was = before[sleeve.rootId]
    const is = after[sleeve.rootId]
    if (was === undefined || is === undefined) continue
    if (is < sleeve.exitBelow && was >= sleeve.exitBelow) {
      const root = byId.get(sleeve.rootId)
      if (!claim(`flag:${sleeve.rootId}:${sleeve.id}`)) continue
      reviewItems.push({
        id: uid('rv'),
        createdAt: now,
        status: 'pending',
        kind: 'flag',
        title: `${sleeve.name} tripped its exit rule`,
        summary: `${root?.label ?? sleeve.rootId} fell from ${round1(was)} to ${round1(
          is,
        )}, below the ${sleeve.exitBelow} threshold set when the sleeve was opened. ${trigger.label}`,
        proposal: `Decide whether the branch still deserves its ${sleeve.targetPct}% target. Either lower the target and let the drift close, or re-read the claim and confirm the threshold is the thing that is wrong.`,
        sleeveId: sleeve.id,
        nodeId: sleeve.rootId,
        chain: buildChain(before, after, afterSnap.nodes, afterSnap.edges, afterSnap.evidence, trigger, sleeve.rootId, sleeve),
      })
    }
  }

  /* Pillars that moved enough to be worth re-reading. */
  for (const node of afterSnap.nodes) {
    if (node.kind !== 'pillar' || node.archived) continue
    const delta = (after[node.id] ?? 0) - (before[node.id] ?? 0)
    if (Math.abs(delta) < PILLAR_ATTENTION) continue
    if (!claim(`review-thesis:${node.id}:`)) continue
    const down = delta < 0
    reviewItems.push({
      id: uid('rv'),
      createdAt: now,
      status: 'pending',
      kind: 'review-thesis',
      title: `${node.label} moved ${signed(delta)}`,
      summary: `${trigger.label} Confidence in the pillar went from ${round1(before[node.id])} to ${round1(
        after[node.id],
      )}.`,
      proposal: down
        ? 'Re-read the claim and its falsifiers. If one of them has been met, archive the pillar rather than arguing with it. If none has, record why the move does not change the claim.'
        : 'Confirm the move is evidence rather than agreement with yourself. If it holds, consider whether the branch deserves a larger target.',
      nodeId: node.id,
      chain: buildChain(before, after, afterSnap.nodes, afterSnap.edges, afterSnap.evidence, trigger, node.id),
    })
  }

  /* Journal every confidence move the user would notice. */
  const moved = afterSnap.nodes
    .filter((n) => n.kind === 'pillar' || n.kind === 'thesis')
    .map((n) => ({ n, delta: (after[n.id] ?? 0) - (before[n.id] ?? 0) }))
    .filter((x) => Math.abs(x.delta) >= 1)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  if (moved.length) {
    const top = moved[0]
    journal.push({
      id: uid('jr'),
      at: now,
      type: 'confidence',
      title: `${top.n.label} ${top.delta < 0 ? 'fell' : 'rose'} to ${round1(after[top.n.id])}`,
      detail:
        moved.length > 1
          ? `${trigger.label} ${moved.length - 1} other ${
              moved.length === 2 ? 'belief' : 'beliefs'
            } moved with it: ${moved
              .slice(1, 4)
              .map((m) => `${m.n.label} ${signed(m.delta)}`)
              .join(', ')}.`
          : trigger.label,
      nodeId: top.n.id,
      delta: round1(top.delta),
    })
  }

  return { reviewItems, journal }
}
