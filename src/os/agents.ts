import type { Agent, Scope } from './types'

export const SCOPE_LABEL: Record<Scope, string> = {
  'personal.finance.read': 'Read personal finances',
  'personal.finance.trade': 'Prepare trades (always reviewed)',
  'personal.goals': 'Read and edit goals and habits',
  'personal.health': 'Read biometrics',
  'company.email': 'Read and triage company email',
  'company.finance': 'Read company finances',
  'company.roadmap': 'Plan and cost roadmaps',
  'notebook.write': 'Write notes and journey pieces',
}

/**
 * The agents that ship with the workstation. Each is a role with a scope, not
 * a personality. The reader decides what each one may touch.
 */
export const seedAgents: Agent[] = [
  {
    id: 'ag-horizon',
    name: 'Horizon',
    role: 'The operating system itself',
    greeting: 'Tell me what you want. I will work out who should do it and ask before anything moves.',
    hue: 165,
    scopes: ['personal.goals', 'notebook.write'],
    tools: [
      { id: 't-route', label: 'Route a request to the right agent', scope: 'notebook.write', needsReview: false },
      { id: 't-goal', label: 'Propose a goal', scope: 'personal.goals', needsReview: true },
    ],
    presence: 'online',
    enabled: true,
  },
  {
    id: 'ag-planner',
    name: 'Planner',
    role: 'Strategy and roadmaps',
    greeting: 'Give me a goal and I will break it into pieces and cost it.',
    hue: 210,
    scopes: ['personal.goals', 'company.roadmap', 'notebook.write'],
    tools: [
      { id: 't-roadmap', label: 'Draft a roadmap with costs', scope: 'company.roadmap', needsReview: true },
      { id: 't-pieces', label: 'Add pieces to the journey', scope: 'notebook.write', needsReview: true },
    ],
    presence: 'online',
    enabled: true,
  },
  {
    id: 'ag-trader',
    name: 'Trader',
    role: 'Prepares trades against the sleeves',
    greeting: 'I prepare orders. I never send them — every one waits for you.',
    hue: 30,
    scopes: ['personal.finance.read', 'personal.finance.trade'],
    tools: [
      { id: 't-trade', label: 'Prepare an order', scope: 'personal.finance.trade', needsReview: true },
      { id: 't-drift', label: 'Check sleeve drift', scope: 'personal.finance.read', needsReview: false },
    ],
    presence: 'online',
    enabled: true,
  },
  {
    id: 'ag-ledger',
    name: 'Ledger',
    role: 'Transaction analysis',
    greeting: 'I read the transactions and tell you what is actually happening with the money.',
    hue: 90,
    scopes: ['personal.finance.read', 'company.finance', 'personal.goals'],
    tools: [
      { id: 't-analyse', label: 'Analyse a month of transactions', scope: 'personal.finance.read', needsReview: false },
      { id: 't-earmark', label: 'Earmark cash to a goal', scope: 'personal.goals', needsReview: true },
    ],
    presence: 'online',
    enabled: true,
  },
  {
    id: 'ag-scribe',
    name: 'Scribe',
    role: 'Turns downloads into work',
    greeting: 'Send me anything — typed, spoken, drawn. I will make it into something you can act on.',
    hue: 280,
    scopes: ['notebook.write', 'personal.goals'],
    tools: [
      { id: 't-capture', label: 'Turn a download into a piece or note', scope: 'notebook.write', needsReview: false },
    ],
    presence: 'online',
    enabled: true,
  },
  {
    id: 'ag-desk',
    name: 'Desk',
    role: 'Email and inbox triage',
    greeting: 'I read what comes in, score it, and keep the noise away from you while you are working.',
    hue: 330,
    scopes: ['company.email'],
    tools: [
      { id: 't-triage', label: 'Score and triage the inbox', scope: 'company.email', needsReview: false },
      { id: 't-draft', label: 'Draft a reply', scope: 'company.email', needsReview: true },
    ],
    presence: 'working',
    enabled: true,
  },
]

export const agentById = (agents: Agent[], id: string) => agents.find((a) => a.id === id)
