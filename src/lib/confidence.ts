import type { Evidence, GraphEdge, GraphNode } from './types'

/**
 * Confidence is always computed, never typed in by hand.
 *
 * A node's confidence has at most two ingredients:
 *
 *   direct    the node's own prior, moved by every piece of evidence attached
 *             directly to it. Supporting passages push it up, contradicting
 *             passages push it down, scaled by how much weight the reader gave
 *             them.
 *
 *   inherited the weighted average of the confidences of everything hanging
 *             underneath the node.
 *
 * Nodes that have both blend them, weighted towards what hangs underneath —
 * a belief is mostly worth what the things below it are worth. That blend is
 * what makes a single contradicting filing on one company travel all the way
 * up to a pillar.
 */

/** Points of movement per unit of evidence strength. */
export const POINTS_PER_STRENGTH = 5
/** Where a node sits once it has evidence but the evidence nets out to nothing. */
export const EVIDENCE_BASE = 50
/** The furthest evidence alone can move a node away from the base. */
export const MAX_SHIFT = 40
/**
 * Net evidence is squashed before it is applied, so the tenth supporting
 * filing moves a node less than the first did. Without this, any node with a
 * handful of agreeing passages pins itself at the top of the scale and stops
 * carrying information.
 */
export const SATURATION_SCALE = 40
export const MIN_CONFIDENCE = 3
export const MAX_CONFIDENCE = 97

/** How much of a node's confidence comes from its own evidence rather than its children. */
const DIRECT_WEIGHT: Record<GraphNode['kind'], number> = {
  pillar: 0.3,
  thesis: 0.35,
  category: 0.25,
  company: 1,
}

export interface EvidenceContribution {
  evidenceId: string
  title: string
  stance: Evidence['stance']
  strength: number
  points: number
}

export interface ChildContribution {
  nodeId: string
  label: string
  kind: GraphNode['kind']
  weight: number
  /** Share of the inherited value this child accounts for, 0-1. */
  share: number
  confidence: number
}

export interface Breakdown {
  nodeId: string
  value: number
  prior: number
  /** Raw sum of evidence points before squashing. */
  netPoints: number
  /** What the squash actually applied to the base. */
  appliedShift: number
  /** Confidence from this node's own evidence alone, or null when it has none. */
  direct: number | null
  /** Confidence inherited from children, or null when it has none. */
  inherited: number | null
  /** Weight given to `direct` in the blend, 0-1. */
  directWeight: number
  evidence: EvidenceContribution[]
  children: ChildContribution[]
  supportCount: number
  contradictCount: number
}

export type ConfidenceMap = Record<string, number>
export type BreakdownMap = Record<string, Breakdown>

export function clampConfidence(n: number): number {
  return Math.max(MIN_CONFIDENCE, Math.min(MAX_CONFIDENCE, n))
}

export function evidencePoints(e: Evidence): number {
  return (e.stance === 'supports' ? 1 : -1) * e.strength * POINTS_PER_STRENGTH
}

/** Net evidence points, squashed, applied to the base. */
export function applyEvidence(netPoints: number): { shift: number; value: number } {
  const shift = MAX_SHIFT * Math.tanh(netPoints / SATURATION_SCALE)
  return { shift, value: clampConfidence(EVIDENCE_BASE + shift) }
}

export interface GraphIndex {
  nodeById: Map<string, GraphNode>
  /** parent id -> edges whose `to` is that parent (i.e. its children). */
  childEdges: Map<string, GraphEdge[]>
  /** child id -> edges whose `from` is that child (i.e. its parents). */
  parentEdges: Map<string, GraphEdge[]>
  evidenceByTarget: Map<string, Evidence[]>
}

export function indexGraph(nodes: GraphNode[], edges: GraphEdge[], evidence: Evidence[]): GraphIndex {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  const childEdges = new Map<string, GraphEdge[]>()
  const parentEdges = new Map<string, GraphEdge[]>()
  for (const e of edges) {
    const child = nodeById.get(e.from)
    if (child?.archived) continue
    if (!nodeById.has(e.from) || !nodeById.has(e.to)) continue
    if (!childEdges.has(e.to)) childEdges.set(e.to, [])
    childEdges.get(e.to)!.push(e)
    if (!parentEdges.has(e.from)) parentEdges.set(e.from, [])
    parentEdges.get(e.from)!.push(e)
  }
  const evidenceByTarget = new Map<string, Evidence[]>()
  for (const ev of evidence) {
    if (!evidenceByTarget.has(ev.targetId)) evidenceByTarget.set(ev.targetId, [])
    evidenceByTarget.get(ev.targetId)!.push(ev)
  }
  return { nodeById, childEdges, parentEdges, evidenceByTarget }
}

/**
 * Computes confidence for every node, bottom-up, along with the breakdown that
 * the thesis detail screen shows. Cycles are guarded against, so a malformed
 * map degrades rather than hanging.
 */
export function computeConfidence(
  nodes: GraphNode[],
  edges: GraphEdge[],
  evidence: Evidence[],
): { confidence: ConfidenceMap; breakdowns: BreakdownMap; index: GraphIndex } {
  const index = indexGraph(nodes, edges, evidence)
  const breakdowns: BreakdownMap = {}
  const confidence: ConfidenceMap = {}
  const inFlight = new Set<string>()

  function resolve(nodeId: string): number {
    if (confidence[nodeId] !== undefined) return confidence[nodeId]
    const node = index.nodeById.get(nodeId)
    if (!node) return 50
    if (inFlight.has(nodeId)) return clampConfidence(node.prior)
    inFlight.add(nodeId)

    const ownEvidence = index.evidenceByTarget.get(nodeId) ?? []
    const contributions: EvidenceContribution[] = ownEvidence.map((e) => ({
      evidenceId: e.id,
      title: e.title,
      stance: e.stance,
      strength: e.strength,
      points: evidencePoints(e),
    }))
    const netPoints = contributions.reduce((s, c) => s + c.points, 0)
    const applied = applyEvidence(netPoints)
    const direct = ownEvidence.length > 0 ? applied.value : null

    const kids = (index.childEdges.get(nodeId) ?? []).filter(
      (e) => !index.nodeById.get(e.from)?.archived,
    )
    let inherited: number | null = null
    const childContribs: ChildContribution[] = []
    if (kids.length > 0) {
      const totalWeight = kids.reduce((s, e) => s + e.weight, 0) || 1
      let acc = 0
      for (const edge of kids) {
        const childValue = resolve(edge.from)
        const share = edge.weight / totalWeight
        acc += share * childValue
        const child = index.nodeById.get(edge.from)!
        childContribs.push({
          nodeId: child.id,
          label: child.label,
          kind: child.kind,
          weight: edge.weight,
          share,
          confidence: childValue,
        })
      }
      inherited = acc
    }

    const dw = DIRECT_WEIGHT[node.kind]
    let value: number
    if (direct !== null && inherited !== null) value = dw * direct + (1 - dw) * inherited
    else if (direct !== null) value = direct
    else if (inherited !== null) value = inherited
    else value = clampConfidence(node.prior)

    value = clampConfidence(value)
    inFlight.delete(nodeId)
    confidence[nodeId] = value
    breakdowns[nodeId] = {
      nodeId,
      value,
      prior: node.prior,
      netPoints,
      appliedShift: ownEvidence.length > 0 ? applied.shift : 0,
      direct,
      inherited,
      directWeight: direct !== null && inherited !== null ? dw : direct !== null ? 1 : 0,
      evidence: contributions,
      children: childContribs.sort((a, b) => b.share - a.share),
      supportCount: ownEvidence.filter((e) => e.stance === 'supports').length,
      contradictCount: ownEvidence.filter((e) => e.stance === 'contradicts').length,
    }
    return value
  }

  for (const node of nodes) resolve(node.id)
  return { confidence, breakdowns, index }
}

/**
 * Shortest path of node ids from `fromId` up to `toId`, following parent edges.
 * Used to build the reasoning chain shown in the review queue.
 */
export function pathUpwards(index: GraphIndex, fromId: string, toId: string): string[] | null {
  if (fromId === toId) return [fromId]
  const queue: string[][] = [[fromId]]
  const seen = new Set([fromId])
  while (queue.length) {
    const path = queue.shift()!
    const tail = path[path.length - 1]
    for (const edge of index.parentEdges.get(tail) ?? []) {
      if (seen.has(edge.to)) continue
      const next = [...path, edge.to]
      if (edge.to === toId) return next
      seen.add(edge.to)
      queue.push(next)
    }
  }
  return null
}

/** Every node at or beneath `rootId`. */
export function descendants(index: GraphIndex, rootId: string): string[] {
  const out: string[] = []
  const seen = new Set<string>([rootId])
  const stack = [rootId]
  while (stack.length) {
    const id = stack.pop()!
    out.push(id)
    for (const edge of index.childEdges.get(id) ?? []) {
      if (seen.has(edge.from)) continue
      seen.add(edge.from)
      stack.push(edge.from)
    }
  }
  return out
}

/** Every ancestor of `nodeId`, nearest first. */
export function ancestors(index: GraphIndex, nodeId: string): string[] {
  const out: string[] = []
  const seen = new Set<string>([nodeId])
  let frontier = [nodeId]
  while (frontier.length) {
    const next: string[] = []
    for (const id of frontier) {
      for (const edge of index.parentEdges.get(id) ?? []) {
        if (seen.has(edge.to)) continue
        seen.add(edge.to)
        out.push(edge.to)
        next.push(edge.to)
      }
    }
    frontier = next
  }
  return out
}
