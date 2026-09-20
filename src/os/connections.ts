import type { Connection } from './types'

/**
 * Everything the OS can reach. Local things are always on. Internet things
 * are transactional: each use is a proposal, approved and logged, so the
 * machine can be offline by default and still do the work.
 */
export const seedConnections: Connection[] = [
  { id: 'cx-model-local', name: 'Local model', kind: 'local', gives: 'Chat, planning, drafting, triage — on the machine.', where: 'machine', transactional: false, scope: 'both', status: 'needs-setup', usedBy: ['ag-horizon', 'ag-planner', 'ag-scribe', 'ag-desk'] },
  { id: 'cx-model-cloud', name: 'Cloud model', kind: 'api', gives: 'Harder reasoning, per request, with only that request’s context.', where: 'internet', transactional: true, scope: 'both', status: 'needs-setup', usedBy: ['ag-planner'] },
  { id: 'cx-store', name: 'Encrypted store', kind: 'local', gives: 'Every event in your life and work, at rest, yours.', where: 'machine', transactional: false, scope: 'both', status: 'ready', usedBy: ['ag-horizon'] },
  { id: 'cx-docs', name: 'Documents and sheets', kind: 'local', gives: 'Specs, research notes, model cards, cost tables.', where: 'machine', transactional: false, scope: 'both', status: 'ready', usedBy: ['ag-scribe', 'ag-planner'] },
  { id: 'cx-papers', name: 'Paper search', kind: 'mcp', gives: 'arXiv, bioRxiv, PubMed — abstracts and PDFs on request.', where: 'internet', transactional: true, scope: 'personal', status: 'needs-setup', usedBy: ['ag-planner'] },
  { id: 'cx-pdf', name: 'PDF reader', kind: 'local', gives: 'Passages out of papers and filings, with page references.', where: 'machine', transactional: false, scope: 'both', status: 'ready', usedBy: ['ag-scribe', 'ag-planner'] },
  { id: 'cx-datasets', name: 'Dataset store', kind: 'local', gives: 'Images, video, labels — versioned, on local disk.', where: 'machine', transactional: false, scope: 'personal', status: 'ready', usedBy: ['ag-planner'] },
  { id: 'cx-label', name: 'Labelling tool', kind: 'local', gives: 'Boxes, masks and tracks on your own frames.', where: 'machine', transactional: false, scope: 'personal', status: 'needs-setup', usedBy: [] },
  { id: 'cx-train', name: 'Training runner', kind: 'local', gives: 'PyTorch or MLX on the machine’s GPU; queued, logged, resumable.', where: 'machine', transactional: false, scope: 'personal', status: 'needs-setup', usedBy: ['ag-planner'] },
  { id: 'cx-experiments', name: 'Experiment tracker', kind: 'local', gives: 'Every run’s config, curves and artifacts.', where: 'machine', transactional: false, scope: 'personal', status: 'ready', usedBy: ['ag-planner'] },
  { id: 'cx-weights', name: 'Model weights registry', kind: 'api', gives: 'Pretrained backbones, pulled once and cached.', where: 'internet', transactional: true, scope: 'personal', status: 'needs-setup', usedBy: ['ag-planner'] },
  { id: 'cx-packages', name: 'Package registries', kind: 'api', gives: 'pip, npm, brew — mirrored locally after first fetch.', where: 'internet', transactional: true, scope: 'both', status: 'ready', usedBy: [] },
  { id: 'cx-git', name: 'Git and GitHub', kind: 'mcp', gives: 'Repos, PRs, issues, CI status. Private by default.', where: 'lan', transactional: true, scope: 'both', status: 'needs-setup', usedBy: ['ag-planner', 'ag-desk'] },
  { id: 'cx-ci', name: 'Build and test runner', kind: 'local', gives: 'CI on the machine; results to the Desk.', where: 'machine', transactional: false, scope: 'both', status: 'needs-setup', usedBy: ['ag-desk'] },
  { id: 'cx-email', name: 'Email', kind: 'mcp', gives: 'Inbox in, drafts out. Separate keys for personal and company.', where: 'internet', transactional: true, scope: 'both', status: 'needs-setup', usedBy: ['ag-desk'] },
  { id: 'cx-calendar', name: 'Calendar', kind: 'mcp', gives: 'Blocks written to and read from your calendar.', where: 'internet', transactional: true, scope: 'both', status: 'needs-setup', usedBy: ['ag-horizon'] },
  { id: 'cx-filings', name: 'EDGAR filings', kind: 'api', gives: 'Annual reports, risk sections, S-1s — the evidence layer.', where: 'internet', transactional: true, scope: 'personal', status: 'needs-setup', usedBy: ['ag-planner'] },
  { id: 'cx-broker', name: 'Brokerage (read)', kind: 'api', gives: 'Positions and cash, read-only. Orders stay prepared, never sent, until a separate write connection is deliberately switched on.', where: 'internet', transactional: true, scope: 'personal', status: 'off', usedBy: ['ag-trader', 'ag-ledger'] },
  { id: 'cx-bank', name: 'Bank transactions (read)', kind: 'api', gives: 'What was spent, for habits and Ledger.', where: 'internet', transactional: true, scope: 'personal', status: 'off', usedBy: ['ag-ledger'] },
  { id: 'cx-hr', name: 'Heart-rate monitor', kind: 'device', gives: 'Beats and variability over Bluetooth.', where: 'lan', transactional: false, scope: 'personal', status: 'needs-setup', usedBy: ['ag-horizon'] },
  { id: 'cx-camera', name: 'Camera capture', kind: 'device', gives: 'Frames from a camera on the machine — your own data.', where: 'machine', transactional: false, scope: 'personal', status: 'needs-setup', usedBy: [] },
  { id: 'cx-ip', name: 'Invention record', kind: 'local', gives: 'Timestamped, hashed disclosures of what you made and when — the paper trail for owning it.', where: 'machine', transactional: false, scope: 'personal', status: 'ready', usedBy: ['ag-scribe'] },
]

export const CONNECTION_KIND_LABEL: Record<Connection['kind'], string> = {
  local: 'On the machine',
  mcp: 'MCP server',
  api: 'API',
  device: 'Device',
  file: 'Files',
}
