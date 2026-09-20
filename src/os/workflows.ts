/**
 * Workflows: explicit, named sequences of stages that an initiative runs on.
 *
 * A stage is a *kind* — research, thesis, sleeve, trade, launch… — plus the
 * words for it. Every kind has one executor in the store that does the real
 * thing and leaves something openable. Built-in workflows are assembled from
 * the same kinds a reader can assemble their own from.
 */

export type StageKind =
  | 'spark'
  | 'research'
  | 'spec'
  | 'customers'
  | 'thesis'
  | 'ground'
  | 'plan'
  | 'cost'
  | 'sleeve'
  | 'trade'
  | 'launch'
  | 'calendar'
  | 'monitor'
  | 'decide'
  | 'translate'
  | 'connect'
  | 'gather'
  | 'experiment'
  | 'evaluate'
  | 'protect'

export interface StageKindMeta {
  kind: StageKind
  label: string
  /** What the OS does at this stage. */
  does: string
  /** What it leaves behind. */
  produces: string
  agentId?: string
  /** Whether passing this stage always waits on the review queue. */
  gated?: boolean
}

export const STAGE_KINDS: StageKindMeta[] = [
  { kind: 'spark', label: 'Spark', does: 'Captures where the idea came from.', produces: 'A note in the stream.' },
  { kind: 'research', label: 'Research', does: 'Planner and Ledger gather what is already known.', produces: 'A report on the Desk.', agentId: 'ag-planner' },
  { kind: 'spec', label: 'Shape it', does: 'Scribe drafts the one-page spec: what it is, who it is for, what done looks like.', produces: 'A spec, and a piece to sharpen it.', agentId: 'ag-scribe' },
  { kind: 'customers', label: 'First ten', does: 'Names the first ten people who would use it before it is good.', produces: 'Pieces on the journey.', agentId: 'ag-planner' },
  { kind: 'thesis', label: 'Thesis', does: 'Writes it on the belief map: a claim, a horizon, what would prove it wrong.', produces: 'A pillar and a first thesis.' },
  { kind: 'ground', label: 'Ground', does: 'Finds companies and attaches filings — including one that argues against it.', produces: 'Pieces on the journey; discovery ready.', agentId: 'ag-planner' },
  { kind: 'plan', label: 'Plan', does: 'Breaks the work into pieces with dependencies.', produces: 'Pieces on the journey.', agentId: 'ag-planner' },
  { kind: 'cost', label: 'Cost', does: 'Drafts a roadmap with lines and a total; the total becomes the goal target.', produces: 'A goal, and a roadmap waiting for review.', agentId: 'ag-planner', gated: true },
  { kind: 'sleeve', label: 'Size it', does: 'Opens a sleeve pointed at the belief: target percentage, rules, an exit threshold.', produces: 'A sleeve under Money.', agentId: 'ag-ledger' },
  { kind: 'trade', label: 'Trade', does: 'Trader prepares the first orders into the sleeve. Prepared, never sent.', produces: 'Runs waiting for review.', agentId: 'ag-trader', gated: true },
  { kind: 'launch', label: 'Launch', does: 'Ledger looks for the money; Desk watches for anything about it.', produces: 'Runs waiting for review.', agentId: 'ag-ledger', gated: true },
  { kind: 'calendar', label: 'Time', does: 'Puts the first sessions on the day.', produces: 'Blocks on today and tomorrow.' },
  { kind: 'monitor', label: 'Monitor', does: 'Runs report to the Desk; confidence, drift and exit rules stay live.', produces: 'A standing watch.', agentId: 'ag-desk' },
  { kind: 'decide', label: 'Decide', does: 'Continue, change, or stop — written down with the reason.', produces: 'A decision in the journal.' },
  { kind: 'translate', label: 'Translate', does: 'The ribosome: the fully formed idea becomes milestones, bite-sized pieces, the connections each needs, and a routine.', produces: 'A blueprint; pieces on the journey; a routine on the week.', agentId: 'ag-planner' },
  { kind: 'connect', label: 'Connect', does: 'Checks every connection the blueprint needs and lists what still has to be set up.', produces: 'A connections checklist on the Desk.', agentId: 'ag-horizon' },
  { kind: 'gather', label: 'Gather', does: 'Datasets registered, papers read, notes written.', produces: 'Datasets in the lab; research docs.', agentId: 'ag-scribe' },
  { kind: 'experiment', label: 'Experiment', does: 'A baseline and the idea, trained on the same data, tracked.', produces: 'Experiments running in the lab.', agentId: 'ag-planner' },
  { kind: 'evaluate', label: 'Evaluate', does: 'The number, on the sealed set, against the threshold chosen before training.', produces: 'A report on the Desk and a decision piece.', agentId: 'ag-planner', gated: true },
  { kind: 'protect', label: 'Protect', does: 'Model card, invention record, private reproducible repo.', produces: 'A disclosure doc, hashed and timestamped.', agentId: 'ag-scribe' },
]

export const stageMeta = (kind: StageKind) => STAGE_KINDS.find((k) => k.kind === kind)!

export interface WorkflowStage {
  id: string
  kind: StageKind
  /** Optional override of the kind's label, for a workflow's own voice. */
  label?: string
}

export interface Workflow {
  id: string
  name: string
  blurb: string
  /** What you end up with. */
  outcome: string
  stages: WorkflowStage[]
  builtin?: boolean
}

const st = (kind: StageKind, label?: string): WorkflowStage => ({ id: kind, kind, label })

export const BUILTIN_WORKFLOWS: Workflow[] = [
  {
    id: 'wf-invention',
    name: 'Idea → Invention',
    blurb: 'A fully formed idea — a model, a device, a method — translated into bite-sized work, built on your own data and machine, evaluated against a number you chose first, and owned.',
    outcome: 'A working thing you invented, reproducible from one command, with a model card and an invention record that says it is yours.',
    builtin: true,
    stages: [st('spark'), st('translate'), st('connect'), st('gather'), st('experiment'), st('evaluate'), st('protect'), st('decide')],
  },
  {
    id: 'wf-product',
    name: 'Idea → Product',
    blurb: 'Something you want to make. Shaped, costed, built with the first ten users, and decided on.',
    outcome: 'A product in front of its first users, with its cost on a goal and its work on the journey.',
    builtin: true,
    stages: [st('spark'), st('spec'), st('customers'), st('cost'), st('plan', 'Build'), st('launch'), st('calendar'), st('monitor'), st('decide')],
  },
  {
    id: 'wf-thesis',
    name: 'Idea → Thesis → Trade → Monitor',
    blurb: 'A belief about the world, grounded in filings, sized as a sleeve, traded with review, watched by its own exit rule.',
    outcome: 'A sleeve of your money behind a belief you can defend, that flags itself when the evidence turns.',
    builtin: true,
    stages: [st('spark'), st('research'), st('thesis'), st('ground'), st('sleeve'), st('trade'), st('monitor')],
  },
  {
    id: 'wf-question',
    name: 'Question → Answer',
    blurb: 'You want to know something. Research, a report, and a decision about whether it becomes anything more.',
    outcome: 'A report on the Desk and a decision in the journal.',
    builtin: true,
    stages: [st('spark'), st('research'), st('decide')],
  },
]

export const workflowById = (all: Workflow[], id: string) => all.find((w) => w.id === id)
