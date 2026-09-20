import type { Goal } from '../lib/types'
import type { JourneyPiece, RoadmapLine } from './types'

type Draft = Omit<JourneyPiece, 'id' | 'createdAt' | 'status'>

/**
 * The strategic planning engine. Given a goal, it produces the discrete
 * pieces of work between here and there. In this build the templates are
 * hand-written per goal kind; a real runtime would ask the model for them and
 * the shape would not change.
 */
export function piecesForGoal(goal: Goal): Draft[] {
  const g = goal.id
  const base = (title: string, detail: string, weight: Draft['weight'], deps: string[] = [], agentId?: string, costUsd?: number): Draft => ({
    goalId: g,
    title,
    detail,
    weight,
    dependsOn: deps.map((d) => `${g}:${d}`),
    agentId,
    costUsd,
  })

  if (goal.kind === 'build') {
    return [
      base('Write the one-page spec', 'What it is, who it is for, what done looks like. One page, no more.', 2, [], 'ag-scribe'),
      base('Cost the first version', 'Roadmap with lines and a total. This becomes the target on the goal.', 3, ['Write the one-page spec'], 'ag-planner'),
      base('Find the first ten people', 'Who would use it before it is good. Names, not personas.', 3, ['Write the one-page spec']),
      base('Build the smallest working version', 'Whatever can be shown in a fortnight.', 8, ['Cost the first version']),
      base('Put it in front of the ten', 'Watch. Do not explain.', 5, ['Build the smallest working version', 'Find the first ten people']),
      base('Decide: continue, change, or stop', 'Written down, with the reason.', 2, ['Put it in front of the ten']),
    ]
  }
  if (goal.kind === 'give') {
    return [
      base('Write down who it is for and why', 'The reason has to survive a bad year.', 2, [], 'ag-scribe'),
      base('Pick the vehicle', 'Direct, a fund, or a standing donation. Costs and tax differ.', 3, ['Write down who it is for and why'], 'ag-planner'),
      base('Point a sleeve at it', 'Long-horizon giving is funded by beliefs, not cash.', 3, ['Pick the vehicle'], 'ag-ledger'),
      base('Make the first gift', 'Small. The point is to have started.', 5, ['Pick the vehicle']),
    ]
  }
  // save
  const withDate = !!goal.targetDate
  return [
    base('Confirm the number', `Is ${money(goal.targetUsd)} the real target, or a guess? Check it against a real price.`, 2, [], 'ag-ledger'),
    base('Set the monthly amount', 'What the projection needs, and whether the budget can carry it.', 2, ['Confirm the number'], 'ag-ledger'),
    base('Find the money that is already there', 'Over-allocated sleeves, idle cash, habits that could feed it.', 3, ['Set the monthly amount'], 'ag-ledger'),
    ...(withDate
      ? [base('Do the thing that has a deadline', 'Whatever has to be true before the date — an application, a notice, a booking.', 5, ['Confirm the number'])]
      : []),
    base('Reach halfway', 'Half of the target set aside. Nothing to do here but keep going.', 3, ['Find the money that is already there']),
    base('Reach it', 'Mark the goal reached. Say what it felt like.', 5, ['Reach halfway']),
  ]
}

/** A costed roadmap for a build goal. Illustrative numbers. */
export function roadmapFor(goal: Goal): RoadmapLine[] {
  const scale = Math.max(0.4, Math.min(3, goal.targetUsd / 24_000))
  const lines: RoadmapLine[] = [
    { label: 'Design and spec', costUsd: Math.round(1_800 * scale), weeks: 2 },
    { label: 'First working version', costUsd: Math.round(9_600 * scale), weeks: 8 },
    { label: 'Hardware, tools or stock', costUsd: Math.round(5_400 * scale), weeks: 3 },
    { label: 'Insurance, legal, registration', costUsd: Math.round(1_600 * scale), weeks: 2 },
    { label: 'Three months of running costs', costUsd: Math.round(4_200 * scale), weeks: 12 },
    { label: 'Contingency (15%)', costUsd: 0, weeks: 0 },
  ]
  const sub = lines.reduce((a, l) => a + l.costUsd, 0)
  lines[lines.length - 1].costUsd = Math.round(sub * 0.15)
  return lines
}

export function roadmapTotal(lines: RoadmapLine[]) {
  return lines.reduce((a, l) => a + l.costUsd, 0)
}

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`

/** Journey distance: sum of weights done over total. */
export function journeyProgress(pieces: JourneyPiece[]) {
  const total = pieces.reduce((a, p) => a + p.weight, 0)
  const done = pieces.filter((p) => p.status === 'done').reduce((a, p) => a + p.weight, 0)
  return { total, done, ratio: total ? done / total : 0 }
}

/** Unlocks pieces whose dependencies are all done. */
export function settlePieces(pieces: JourneyPiece[]): JourneyPiece[] {
  const done = new Set(pieces.filter((p) => p.status === 'done').map((p) => p.id))
  return pieces.map((p) => {
    if (p.status !== 'locked') return p
    const ready = p.dependsOn.every((d) => done.has(d))
    return ready ? { ...p, status: 'open' } : p
  })
}
