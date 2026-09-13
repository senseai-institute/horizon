/**
 * Horizon domain model.
 *
 * Everything in this prototype lives in the browser. There is no server, no
 * brokerage connection and no market data feed. See `src/data/seed.ts` for the
 * fabricated dataset the app ships with.
 */

export type NodeKind = 'pillar' | 'thesis' | 'category' | 'company'

export interface GraphNode {
  id: string
  kind: NodeKind
  /** Short name used on the map. */
  label: string
  /** The written claim. Pillars and theses always have one. */
  claim?: string
  /** Years over which the claim is expected to resolve. */
  horizonYears?: number
  /** The things that would make the author decide they were wrong. */
  falsifiers?: string[]
  /** Starting belief, 0-100, used before any evidence is attached. */
  prior: number
  /** Company fields. */
  ticker?: string
  exchange?: string
  marketCapB?: number
  businessDescription?: string
  sicCode?: string
  sicLabel?: string
  createdAt: string
  archived?: boolean
}

export interface GraphEdge {
  id: string
  /** The narrower node. */
  from: string
  /** The broader node it hangs off. */
  to: string
  /** 0-1. How much the child's confidence informs the parent's. */
  weight: number
  /** Why these two things are linked. Shown when the edge is clicked. */
  rationale: string
  createdAt: string
}

export type Stance = 'supports' | 'contradicts'

/** The adjective, for prose. "Marked as contradicting", not "marked as contradicts". */
export function stanceWord(stance: Stance): 'supporting' | 'contradicting' {
  return stance === 'supports' ? 'supporting' : 'contradicting'
}

export interface EvidenceSource {
  company: string
  /** 10-K, 10-Q, S-1, 8-K, DEF 14A ... */
  form: string
  section: string
  filedAt: string
  url: string
}

export interface Evidence {
  id: string
  /** Node this passage speaks to. */
  targetId: string
  stance: Stance
  /** 1-5. How much weight the reader gives this passage. */
  strength: number
  title: string
  /** The passage itself. */
  excerpt: string
  /** Substring of `excerpt` to mark as the relevant part. */
  highlight: string
  /** The reader's own note. */
  note?: string
  source: EvidenceSource
  addedAt: string
}

export interface Position {
  companyId: string
  valueUsd: number
}

export interface SleeveRules {
  maxSinglePositionPct: number
  minMarketCapM: number
}

export type Cadence = 'monthly' | 'quarterly' | 'on-confidence-change'

export interface Sleeve {
  id: string
  name: string
  /** The branch of the map this sleeve is pointed at. */
  rootId: string
  targetPct: number
  rules: SleeveRules
  cadence: Cadence
  /** e.g. flag when branch confidence falls below 40. */
  exitBelow: number
  positions: Position[]
  createdAt: string
  note?: string
}

export type ChainKind = 'evidence' | 'company' | 'thesis' | 'pillar' | 'category' | 'sleeve' | 'rule'

export interface ChainLink {
  kind: ChainKind
  label: string
  detail: string
  nodeId?: string
  evidenceId?: string
  sleeveId?: string
  delta?: number
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected'
export type ReviewKind = 'trim' | 'add' | 'flag' | 'rebalance' | 'review-thesis'

export interface ReviewItem {
  id: string
  createdAt: string
  status: ReviewStatus
  kind: ReviewKind
  title: string
  /** What changed. */
  summary: string
  /** What it wants to do about it. */
  proposal: string
  chain: ChainLink[]
  sleeveId?: string
  nodeId?: string
  decidedAt?: string
}

export type JournalType =
  | 'belief'
  | 'confidence'
  | 'evidence'
  | 'decision'
  | 'discovery'
  | 'sleeve'
  | 'note'

export interface JournalEntry {
  id: string
  at: string
  type: JournalType
  title: string
  detail: string
  nodeId?: string
  delta?: number
}

export type MatchReasonType = 'sic' | 'competitor-mention' | 'description' | 'supply-chain' | 'customer-overlap'

export interface MatchReason {
  type: MatchReasonType
  label: string
  detail: string
  source?: string
}

export interface Candidate {
  id: string
  name: string
  ticker: string
  exchange: string
  marketCapB: number
  description: string
  /** 0-100 similarity to the seed. */
  score: number
  reasons: MatchReason[]
  /** Where it would be filed on the map if accepted. */
  suggestedParentId: string
  sicCode: string
  sicLabel: string
  /** Set when the candidate already exists in the catalogue. */
  existingNodeId?: string
}

export interface DiscoverySeed {
  id: string
  name: string
  isPrivate: boolean
  blurb: string
  sicCode: string
  sicLabel: string
  candidates: Candidate[]
}

export type CandidateStatus = 'accepted' | 'rejected' | 'set-aside'

export interface NodePosition {
  x: number
  y: number
  /** Pinned coordinates, set when the user drags a node. */
  fx?: number | null
  fy?: number | null
}
