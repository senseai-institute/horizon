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
  /** Where the company stands on the values a reader can choose. Companies only. */
  values?: ValueStance[]
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

export type ChainKind = 'evidence' | 'company' | 'thesis' | 'pillar' | 'category' | 'sleeve' | 'rule' | 'goal' | 'habit' | 'value'

export interface ChainLink {
  kind: ChainKind
  label: string
  detail: string
  nodeId?: string
  evidenceId?: string
  sleeveId?: string
  goalId?: string
  habitId?: string
  delta?: number
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected'
export type ReviewKind = 'trim' | 'add' | 'flag' | 'rebalance' | 'review-thesis' | 'goal' | 'values'

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
  goalId?: string
  decidedAt?: string
}

export type JournalType =
  | 'belief'
  | 'confidence'
  | 'evidence'
  | 'decision'
  | 'discovery'
  | 'sleeve'
  | 'goal'
  | 'habit'
  | 'values'
  | 'note'

export interface JournalEntry {
  id: string
  at: string
  type: JournalType
  title: string
  detail: string
  nodeId?: string
  goalId?: string
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

/* ------------------------------------------------------------------ */
/* Goals — what the money is for.                                      */
/* ------------------------------------------------------------------ */

/** When the goal lands. Present-day, within a year, one to five years, beyond. */
export type Horizon = 'now' | 'soon' | 'later' | 'someday'

/** Saving for something, building something, or giving something away. */
export type GoalKind = 'save' | 'build' | 'give'

export interface Goal {
  id: string
  title: string
  /** One honest sentence about why this matters. */
  why: string
  horizon: Horizon
  kind: GoalKind
  targetUsd: number
  /** Cash set aside for this goal. Habits release money into it. */
  earmarkedUsd: number
  /** Regular contribution from income. */
  monthlyUsd: number
  /** YYYY-MM-DD. Optional for open-ended goals. */
  targetDate?: string
  /** Long-horizon goals are funded by belief-driven sleeves; their value counts here. */
  linkedSleeveIds: string[]
  status: 'active' | 'reached' | 'paused'
  createdAt: string
  reachedAt?: string
}

/* ------------------------------------------------------------------ */
/* Habits — spending you want less of, with the difference redirected.   */
/* ------------------------------------------------------------------ */

export interface HabitMonth {
  /** YYYY-MM */
  month: string
  spentUsd: number
}

export interface Habit {
  id: string
  title: string
  /** The spending category being tracked. */
  category: string
  /** What a typical month looked like before. */
  baselineMonthlyUsd: number
  /** What you are aiming for. */
  targetMonthlyUsd: number
  /** Where the difference goes. */
  redirectToGoalId: string
  months: HabitMonth[]
  createdAt: string
  note?: string
}

/* ------------------------------------------------------------------ */
/* Values — what you will and will not own.                            */
/* ------------------------------------------------------------------ */

export interface ValueDef {
  id: string
  label: string
  blurb: string
}

/** −2 works against the value, +2 clearly advances it. */
export type ValueScore = -2 | -1 | 0 | 1 | 2

export interface ValueStance {
  valueId: string
  score: ValueScore
  reason: string
}

/** 0 = not a consideration, 1 = matters, 2 = core. */
export type ValueWeight = 0 | 1 | 2
