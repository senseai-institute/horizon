import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force'
import type { GraphEdge, GraphNode } from '../lib/types'

export interface SimNode extends SimulationNodeDatum {
  id: string
  kind: GraphNode['kind']
  radius: number
  /** Radius used for collision, widened to make room for the label. */
  spacing: number
}

export interface SimLink extends SimulationLinkDatum<SimNode> {
  id: string
  weight: number
}

export const NODE_RADIUS: Record<GraphNode['kind'], number> = {
  pillar: 27,
  thesis: 18,
  category: 13,
  company: 8.5,
}

/** Pillars sit at the top, companies at the bottom. The simulation does the rest. */
const BAND: Record<GraphNode['kind'], number> = {
  pillar: -380,
  thesis: -90,
  category: 220,
  company: 500,
}

const LINK_DISTANCE: Record<string, number> = {
  'thesis>pillar': 215,
  'category>thesis': 165,
  'company>category': 84,
}

/**
 * Labels sit under their node, so nodes need more room than their radius.
 * Widening the collision circle by roughly the label's half-width is crude but
 * keeps text from stacking on text, which is the thing that actually makes a
 * graph unreadable.
 */
export function labelSpacing(kind: GraphNode['kind'], label: string): number {
  const chars = Math.min(label.length, kind === 'company' ? 6 : 30)
  const perChar = kind === 'pillar' ? 3.4 : 2.6
  return NODE_RADIUS[kind] + 22 + chars * perChar
}

function linkDistance(fromKind: GraphNode['kind'], toKind: GraphNode['kind']): number {
  return LINK_DISTANCE[`${fromKind}>${toKind}`] ?? 150
}

export function createSimulation(
  nodes: SimNode[],
  links: SimLink[],
  kindOf: (id: string) => GraphNode['kind'],
  /** Horizontal anchor for a node's branch, so each pillar keeps its own column. */
  branchX: (id: string) => number | undefined = () => undefined,
) {
  return forceSimulation<SimNode>(nodes)
    .force(
      'link',
      forceLink<SimNode, SimLink>(links)
        .id((d) => d.id)
        .distance((l) => {
          const from = typeof l.source === 'object' ? l.source.kind : kindOf(String(l.source))
          const to = typeof l.target === 'object' ? l.target.kind : kindOf(String(l.target))
          return linkDistance(from, to)
        })
        .strength((l) => 0.22 + l.weight * 0.5),
    )
    .force(
      'charge',
      forceManyBody<SimNode>().strength((d) => (d.kind === 'pillar' ? -1700 : d.kind === 'thesis' ? -900 : -320)),
    )
    .force(
      'collide',
      forceCollide<SimNode>()
        .radius((d) => d.spacing)
        .iterations(3),
    )
    .force(
      'band',
      forceY<SimNode>((d) => BAND[d.kind]).strength((d) => (d.kind === 'pillar' ? 1 : d.kind === 'thesis' ? 0.55 : 0.45)),
    )
    .force('centre', forceX<SimNode>(0).strength(0.015))
    .force(
      'branch',
      forceX<SimNode>((d) => branchX(d.id) ?? 0).strength((d) =>
        branchX(d.id) === undefined ? 0 : d.kind === 'pillar' ? 0.5 : d.kind === 'thesis' ? 0.16 : 0.08,
      ),
    )
    .alphaDecay(0.03)
    .velocityDecay(0.45)
}

export type MapSimulation = Simulation<SimNode, SimLink>

/**
 * Which nodes the map is currently showing. A node is visible when it is a
 * pillar, or when at least one of its parents has been expanded.
 */
export function visibleNodeIds(nodes: GraphNode[], edges: GraphEdge[], expanded: Set<string>): Set<string> {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const childrenOf = new Map<string, string[]>()
  for (const e of edges) {
    if (!byId.has(e.from) || !byId.has(e.to)) continue
    if (!childrenOf.has(e.to)) childrenOf.set(e.to, [])
    childrenOf.get(e.to)!.push(e.from)
  }
  const visible = new Set<string>()
  const queue: string[] = nodes.filter((n) => n.kind === 'pillar' && !n.archived).map((n) => n.id)
  // Orphans — nodes with no parent at all — are shown so nothing can hide.
  const hasParent = new Set(edges.map((e) => e.from))
  for (const n of nodes) {
    if (!n.archived && n.kind !== 'pillar' && !hasParent.has(n.id)) queue.push(n.id)
  }
  while (queue.length) {
    const id = queue.shift()!
    if (visible.has(id)) continue
    const node = byId.get(id)
    if (!node || node.archived) continue
    visible.add(id)
    if (expanded.has(id)) for (const child of childrenOf.get(id) ?? []) queue.push(child)
  }
  return visible
}

export function hiddenChildCount(
  nodeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  visible: Set<string>,
): number {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  return edges.filter((e) => e.to === nodeId && !byId.get(e.from)?.archived && !visible.has(e.from)).length
}
