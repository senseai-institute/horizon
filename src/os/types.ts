/**
 * Horizon OS — the agentic layer's domain model.
 *
 * Everything the workstation orchestrates is one of these. In this build the
 * runtime is simulated in the browser; the shapes are the contract a real
 * runtime in the data centre would speak.
 */

/** What an agent is allowed to touch. Personal and company are separate keys. */
export type Scope =
  | 'personal.finance.read'
  | 'personal.finance.trade'
  | 'personal.goals'
  | 'personal.health'
  | 'company.email'
  | 'company.finance'
  | 'company.roadmap'
  | 'notebook.write'

export interface AgentTool {
  id: string
  label: string
  /** The scope this tool needs. */
  scope: Scope
  /** Whether running it always needs a human first. */
  needsReview: boolean
}

export type Presence = 'online' | 'working' | 'away'

export interface Agent {
  id: string
  name: string
  role: string
  /** A short line, in its own voice. */
  greeting: string
  /** Which seed-of-life ring it sits on, for the glyph. */
  hue: number
  scopes: Scope[]
  tools: AgentTool[]
  presence: Presence
  /** Whether the reader has switched it on at all. */
  enabled: boolean
}

export type RunStatus = 'planned' | 'awaiting_review' | 'approved' | 'running' | 'done' | 'failed' | 'rejected'

export interface RunStep {
  id: string
  label: string
  toolId?: string
  status: 'todo' | 'doing' | 'done' | 'skipped'
  log?: string
  at?: string
}

export interface Run {
  id: string
  agentId: string
  threadId?: string
  title: string
  /** What the agent intends to do, in one paragraph. */
  intent: string
  status: RunStatus
  steps: RunStep[]
  /** Structured effect the run has when it completes. Applied by the store. */
  effect?: RunEffect
  createdAt: string
  updatedAt: string
  /** Progress through steps while running, 0–1. */
  progress: number
}

export type RunEffect =
  | { kind: 'trade'; sleeveId: string; companyId: string; deltaUsd: number }
  | { kind: 'earmark'; goalId: string; usd: number; reason: string }
  | { kind: 'roadmap'; goalId: string; lines: RoadmapLine[] }
  | { kind: 'report'; title: string; body: string }
  | { kind: 'pieces'; pieces: Omit<JourneyPiece, 'id' | 'createdAt' | 'status'>[] }
  | { kind: 'note'; text: string }

export interface RoadmapLine {
  label: string
  costUsd: number
  weeks: number
}

/* ------------------------------------------------------------------ */
/* Inbox — every kind of communication in one place.                   */
/* ------------------------------------------------------------------ */

export type InboxKind = 'email' | 'message' | 'report' | 'approval' | 'system'

export interface InboxItem {
  id: string
  kind: InboxKind
  from: { name: string; agentId?: string; importance: 1 | 2 | 3 }
  subject: string
  body: string
  urgent: boolean
  at: string
  read: boolean
  done: boolean
  /** Links back into the rest of the OS. */
  runId?: string
  goalId?: string
  pieceId?: string
  /** For a company email, the scope it belongs to. */
  scope: 'personal' | 'company'
}

/* ------------------------------------------------------------------ */
/* Chats — AIM windows with agents.                                    */
/* ------------------------------------------------------------------ */

export interface ChatAction {
  id: string
  label: string
  /** What applying it does. */
  effect: RunEffect | { kind: 'goal'; title: string; targetUsd: number; horizon: 'now' | 'soon' | 'later' | 'someday'; why: string } | { kind: 'run'; runId: string }
  applied?: boolean
}

export interface ChatMsg {
  id: string
  from: 'me' | 'agent'
  text: string
  at: string
  /** Things the agent proposes. Nothing happens until one is clicked. */
  actions?: ChatAction[]
  /** Voice or drawing captures attached to the message. */
  downloadId?: string
}

export interface Thread {
  id: string
  agentId: string
  title: string
  messages: ChatMsg[]
  createdAt: string
  updatedAt: string
}

export interface ChatWindow {
  threadId: string
  x: number
  y: number
  w: number
  h: number
  minimised: boolean
  z: number
}

/* ------------------------------------------------------------------ */
/* Journey — the discrete pieces of work between here and a goal.       */
/* ------------------------------------------------------------------ */

export type PieceStatus = 'locked' | 'open' | 'doing' | 'done'

export interface JourneyPiece {
  id: string
  goalId?: string
  title: string
  detail: string
  /** How much of the journey this piece is. Bigger pieces are further apart. */
  weight: 1 | 2 | 3 | 5 | 8
  status: PieceStatus
  dependsOn: string[]
  /** Who is best placed to do it. */
  agentId?: string
  costUsd?: number
  createdAt: string
  doneAt?: string
}

/* ------------------------------------------------------------------ */
/* Stream — the reader's downloads.                                    */
/* ------------------------------------------------------------------ */

export type DownloadKind = 'text' | 'voice' | 'drawing'

export interface Download {
  id: string
  kind: DownloadKind
  /** Text, transcript, or an SVG path list for a drawing. */
  content: string
  at: string
  /** Where it went once an agent looked at it. */
  routedTo?: { threadId?: string; pieceId?: string; goalId?: string }
  tags: string[]
}

/* ------------------------------------------------------------------ */
/* Flow — biometrics and the state the OS puts itself in.               */
/* ------------------------------------------------------------------ */

export interface BioSample {
  at: number
  hr: number
  /** RMSSD-ish, ms. Higher is calmer. */
  hrv: number
  /** Breaths per minute. */
  breath: number
}

export type FlowLevel = 'scattered' | 'settling' | 'flow' | 'deep'

export interface FlowSession {
  id: string
  startedAt: string
  endedAt?: string
  pieceId?: string
  /** Minutes spent at flow or deep. */
  flowMinutes: number
  peak: FlowLevel
}

/* ------------------------------------------------------------------ */
/* Initiatives — an idea's whole path to an outcome.                   */
/* ------------------------------------------------------------------ */

export interface InitiativeEvent {
  at: string
  /** The workflow stage id. */
  stage: string
  text: string
}

export interface Initiative {
  id: string
  title: string
  /** Where it came from — a conversation, a drawing, a line in a notebook. */
  spark: string
  sourceDownloadId?: string
  /** Which workflow it runs on. */
  workflowId: string
  /** Index into the workflow's stages. */
  stageIndex: number
  /** What the stages produced, once they have. */
  pillarId?: string
  thesisId?: string
  goalId?: string
  sleeveId?: string
  blueprintId?: string
  experimentIds?: string[]
  docIds?: string[]
  pieceIds: string[]
  runIds: string[]
  blockIds: string[]
  history: InitiativeEvent[]
  createdAt: string
  updatedAt: string
}

/* ------------------------------------------------------------------ */
/* Day — time on the calendar, and the body's say in it.                */
/* ------------------------------------------------------------------ */

export type BlockKind = 'deep' | 'admin' | 'body' | 'routine' | 'adventure'

export interface TimeBlock {
  id: string
  /** YYYY-MM-DD */
  day: string
  /** HH:MM, 24h */
  start: string
  minutes: number
  title: string
  kind: BlockKind
  pieceId?: string
  initiativeId?: string
  done?: boolean
}

export type NudgeKind = 'body' | 'focus' | 'money' | 'life'

export interface Nudge {
  id: string
  at: string
  kind: NudgeKind
  text: string
  /** A single thing to do about it. */
  action?: { label: string; to?: string; run?: 'walk' | 'breathe' | 'focus' | 'desk' }
  dismissed?: boolean
}

/* ------------------------------------------------------------------ */
/* Widgets — the Desk is made of these.                                */
/* ------------------------------------------------------------------ */

export type WidgetId = 'inbox' | 'piece' | 'day' | 'initiatives' | 'feed' | 'habits' | 'flow' | 'journey' | 'money' | 'away' | 'lab'

export interface FeedItem {
  id: string
  title: string
  source: string
  at: string
  url: string
  summary: string
}

/* ------------------------------------------------------------------ */
/* Translation — a fully formed idea into bite-sized, realistic work.  */
/* ------------------------------------------------------------------ */

export type PieceSize = 'hour' | 'morning' | 'day' | 'week'

export interface BlueprintPiece {
  title: string
  detail: string
  size: PieceSize
  weight: 1 | 2 | 3 | 5 | 8
  /** Titles of pieces this one waits on, within the blueprint. */
  after: string[]
  agentId?: string
  /** Connection ids this piece needs to exist before it can start. */
  needs: string[]
  milestone: string
}

export interface Milestone {
  title: string
  /** What is true when it is done. */
  done: string
}

export interface RoutineBlock {
  /** 0 = Sunday … 6 = Saturday */
  weekdays: number[]
  start: string
  minutes: number
  title: string
  kind: BlockKind
}

export interface Blueprint {
  id: string
  initiativeId: string
  /** The idea, as fully as it was given. */
  idea: string
  /** One sentence: what exists when this is finished. */
  outcome: string
  milestones: Milestone[]
  pieces: BlueprintPiece[]
  /** Connection ids the whole thing needs. */
  connections: string[]
  routine: RoutineBlock[]
  risks: string[]
  /** Rough total, in focused hours. */
  hours: number
  createdAt: string
  /** 'local' when the template engine produced it; a model name when the runtime did. */
  by: string
}

/* ------------------------------------------------------------------ */
/* Connections — everything the OS can reach, and on what terms.       */
/* ------------------------------------------------------------------ */

export type ConnectionKind = 'local' | 'mcp' | 'api' | 'device' | 'file'
export type ConnectionStatus = 'ready' | 'needs-setup' | 'off'

export interface Connection {
  id: string
  name: string
  kind: ConnectionKind
  /** What it gives the OS. */
  gives: string
  /** Where it runs: on the machine, on the LAN, or out on the internet. */
  where: 'machine' | 'lan' | 'internet'
  /** Internet connections are transactional: each use is approved and logged. */
  transactional: boolean
  scope: 'personal' | 'company' | 'both'
  status: ConnectionStatus
  /** Agents that use it. */
  usedBy: string[]
}

/* ------------------------------------------------------------------ */
/* Lab — datasets, experiments, models.                                */
/* ------------------------------------------------------------------ */

export interface Dataset {
  id: string
  initiativeId?: string
  name: string
  /** Where it lives. Always local in this build. */
  path: string
  items: number
  sizeMb: number
  /** How it was made: captured, licensed, synthetic, derived. */
  provenance: string
  labelled: boolean
}

export interface EpochMetric {
  epoch: number
  trainLoss: number
  valLoss: number
  metric: number
}

export interface Experiment {
  id: string
  initiativeId?: string
  name: string
  hypothesis: string
  datasetId: string
  config: Record<string, string | number>
  status: 'queued' | 'running' | 'done' | 'failed' | 'promoted'
  epochs: number
  metrics: EpochMetric[]
  /** The metric's name, e.g. mAP@50. */
  metricName: string
  device: string
  createdAt: string
  finishedAt?: string
  notes?: string
}

/* ------------------------------------------------------------------ */
/* Documents — docs and sheets, in one place.                          */
/* ------------------------------------------------------------------ */

export interface Doc {
  id: string
  initiativeId?: string
  title: string
  /** Plain text with light structure: lines beginning with # are headings. */
  body: string
  kind: 'note' | 'spec' | 'research' | 'model-card' | 'disclosure'
  createdAt: string
  updatedAt: string
}

export interface Sheet {
  id: string
  initiativeId?: string
  title: string
  columns: string[]
  /** Numeric columns get a total row. */
  numeric: boolean[]
  rows: (string | number)[][]
  createdAt: string
  updatedAt: string
}
