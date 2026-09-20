import type { Blueprint, BlueprintPiece, Milestone, RoutineBlock } from './types'

/**
 * The ribosome. A fully formed idea goes in; a realistic, bite-sized plan and
 * the routine that meets it come out. This is the hardest translation in the
 * whole OS and the one the person is worst at doing alone — the vision is
 * complete in the head and the first step is invisible.
 *
 * Here it is template-driven and honest about it. The runtime's model does
 * the same job against the same shape; the shape is the contract.
 */

type Shape = 'ml' | 'software' | 'physical' | 'research' | 'venture'

function shapeOf(idea: string): Shape {
  const t = idea.toLowerCase()
  if (/\b(model|vision|neural|train|dataset|classif|detect|inference|embedding|llm)\b/.test(t)) return 'ml'
  if (/\b(app|software|api|platform|website|tool|automation|agent)\b/.test(t)) return 'software'
  if (/\b(build a|hardware|device|prototype|machine|sensor|3d)\b/.test(t)) return 'physical'
  if (/\b(research|study|understand|paper|why|how does)\b/.test(t)) return 'research'
  return 'venture'
}

const p = (milestone: string, title: string, detail: string, size: BlueprintPiece['size'], weight: BlueprintPiece['weight'], after: string[] = [], needs: string[] = [], agentId?: string): BlueprintPiece => ({
  milestone,
  title,
  detail,
  size,
  weight,
  after,
  needs,
  agentId,
})

const HOURS: Record<BlueprintPiece['size'], number> = { hour: 1, morning: 3, day: 7, week: 30 }

export function translate(initiativeId: string, title: string, idea: string, by = 'local'): Blueprint {
  const shape = shapeOf(idea)
  let milestones: Milestone[]
  let pieces: BlueprintPiece[]
  let connections: string[]
  let routine: RoutineBlock[]
  let risks: string[]
  let outcome: string

  if (shape === 'ml') {
    outcome = `A working ${title} model you trained on data you own, evaluated against a number you chose in advance, with a model card and an invention record.`
    milestones = [
      { title: 'Understand', done: 'You can explain the principle in one page and say what the model must do differently because of it.' },
      { title: 'Data', done: 'A labelled dataset on local disk, with provenance, and a held-out split nobody has looked at.' },
      { title: 'Baseline', done: 'A conventional model trained on the same data, with its number.' },
      { title: 'The idea', done: 'The principle implemented as an architecture or training change, beating the baseline or not.' },
      { title: 'Own it', done: 'A model card, an invention record, and a private repo with everything reproducible.' },
    ]
    pieces = [
      p('Understand', 'Read the three best papers on the principle', 'Paper search, then the PDF reader. One page of notes: what the biology does, what it is for.', 'morning', 3, [], ['cx-papers', 'cx-pdf'], 'ag-planner'),
      p('Understand', 'Write the one-page translation', 'From the biology to a computable idea: what changes in the model because of it. Be specific about the layer.', 'morning', 3, ['Read the three best papers on the principle'], ['cx-docs'], 'ag-scribe'),
      p('Understand', 'Choose the number', 'One metric, one held-out set, one threshold that would make you say it worked. Written before any training.', 'hour', 2, ['Write the one-page translation'], ['cx-docs']),
      p('Data', 'Decide what data, and where it comes from', 'Own capture, a licensed set, or synthetic. Own capture is slower and yours.', 'morning', 3, ['Choose the number'], ['cx-datasets']),
      p('Data', 'Capture or assemble the first thousand items', 'Enough to train something bad. Versioned in the dataset store.', 'day', 5, ['Decide what data, and where it comes from'], ['cx-datasets', 'cx-camera']),
      p('Data', 'Label a held-out set first', 'Two hundred items, labelled carefully, sealed. Nobody trains on these.', 'morning', 3, ['Capture or assemble the first thousand items'], ['cx-label']),
      p('Data', 'Label the rest', 'Or let a pretrained model pre-label and correct it.', 'day', 5, ['Label a held-out set first'], ['cx-label', 'cx-weights']),
      p('Baseline', 'Train the boring model', 'A standard backbone on the standard task. Its number is the bar.', 'morning', 3, ['Label the rest'], ['cx-train', 'cx-experiments', 'cx-weights'], 'ag-planner'),
      p('The idea', 'Implement the principle', 'The architecture or training change from the one-page translation. Small first.', 'day', 8, ['Train the boring model'], ['cx-train', 'cx-git']),
      p('The idea', 'Run the comparison', 'Same data, same split, same seed. Three runs each.', 'day', 5, ['Implement the principle'], ['cx-train', 'cx-experiments'], 'ag-planner'),
      p('The idea', 'Decide: it worked, it did not, or the number was wrong', 'Written down with the curves.', 'hour', 2, ['Run the comparison'], ['cx-docs']),
      p('Own it', 'Write the model card', 'What it is, what it was trained on, what it is not for.', 'hour', 2, ['Decide: it worked, it did not, or the number was wrong'], ['cx-docs'], 'ag-scribe'),
      p('Own it', 'File the invention record', 'Timestamped, hashed: the translation, the code, the results. Yours.', 'hour', 2, ['Write the model card'], ['cx-ip'], 'ag-scribe'),
      p('Own it', 'Make it reproducible', 'Private repo, one command from data to number.', 'morning', 3, ['File the invention record'], ['cx-git', 'cx-ci']),
    ]
    connections = ['cx-papers', 'cx-pdf', 'cx-docs', 'cx-datasets', 'cx-camera', 'cx-label', 'cx-train', 'cx-experiments', 'cx-weights', 'cx-git', 'cx-ci', 'cx-ip']
    routine = [
      { weekdays: [2, 4], start: '06:30', minutes: 90, title: `${title}: deep work`, kind: 'deep' },
      { weekdays: [6], start: '09:00', minutes: 180, title: `${title}: data and training`, kind: 'deep' },
      { weekdays: [5], start: '16:00', minutes: 45, title: `${title}: review the experiments`, kind: 'admin' },
    ]
    risks = ['The principle is beautiful and does not change the number. Decide the number first so this is a finding, not a failure.', 'Data takes three times longer than training. Start capture in week one.', 'A borrowed dataset borrows its licence. Own the data or read the licence twice.']
  } else if (shape === 'software') {
    outcome = `A working ${title} in front of its first users, in a private repo you own, with its cost known.`
    milestones = [
      { title: 'Shape', done: 'One page: what it is, who it is for, what done looks like.' },
      { title: 'Smallest version', done: 'Something a stranger can use without you in the room.' },
      { title: 'First ten', done: 'Ten named people have used it twice.' },
      { title: 'Decide', done: 'Continue, change, or stop — written down.' },
    ]
    pieces = [
      p('Shape', 'Write the one-page spec', 'What it is, who it is for, what done looks like.', 'morning', 3, [], ['cx-docs'], 'ag-scribe'),
      p('Shape', 'Name the first ten people', 'Names, not personas.', 'hour', 2, ['Write the one-page spec'], ['cx-docs']),
      p('Smallest version', 'Stand up the repo and the walking skeleton', 'Private repo, CI green on an empty app.', 'morning', 3, ['Write the one-page spec'], ['cx-git', 'cx-ci']),
      p('Smallest version', 'Build the one thing it does', 'A fortnight, no more. Agents write; you review PRs.', 'week', 8, ['Stand up the repo and the walking skeleton'], ['cx-git', 'cx-ci', 'cx-model-local'], 'ag-planner'),
      p('First ten', 'Put it in front of three of the ten', 'Watch. Do not explain.', 'morning', 3, ['Build the one thing it does', 'Name the first ten people']),
      p('First ten', 'Fix the three things they hit', 'Only those three.', 'day', 5, ['Put it in front of three of the ten'], ['cx-git']),
      p('First ten', 'Put it in front of the other seven', 'Same rules.', 'morning', 3, ['Fix the three things they hit']),
      p('Decide', 'Decide: continue, change, or stop', 'With the reason.', 'hour', 2, ['Put it in front of the other seven'], ['cx-docs']),
    ]
    connections = ['cx-docs', 'cx-git', 'cx-ci', 'cx-model-local']
    routine = [
      { weekdays: [1, 3], start: '06:30', minutes: 90, title: `${title}: build`, kind: 'deep' },
      { weekdays: [5], start: '15:00', minutes: 60, title: `${title}: review the PRs`, kind: 'admin' },
    ]
    risks = ['Building past the smallest version before anyone has used it.', 'The first ten become a persona. Keep the names.']
  } else if (shape === 'research') {
    outcome = `A written answer to "${title}", with sources, and a decision about whether it becomes anything more.`
    milestones = [
      { title: 'Question', done: 'The question in one sentence, with what an answer would change.' },
      { title: 'Sources', done: 'The five best sources read, with one page of notes each.' },
      { title: 'Answer', done: 'Two pages. A decision at the end.' },
    ]
    pieces = [
      p('Question', 'Sharpen the question', 'One sentence. What would you do differently with the answer?', 'hour', 1, [], ['cx-docs']),
      p('Sources', 'Find the five best sources', 'Paper search and your own shelf.', 'morning', 3, ['Sharpen the question'], ['cx-papers'], 'ag-planner'),
      p('Sources', 'Read them, one page each', 'Notes in the docs.', 'day', 5, ['Find the five best sources'], ['cx-pdf', 'cx-docs']),
      p('Answer', 'Write the answer', 'Two pages, sources cited.', 'morning', 3, ['Read them, one page each'], ['cx-docs'], 'ag-scribe'),
      p('Answer', 'Decide what it becomes', 'A thesis, a product, or nothing. Written down.', 'hour', 1, ['Write the answer']),
    ]
    connections = ['cx-docs', 'cx-papers', 'cx-pdf']
    routine = [{ weekdays: [2, 4], start: '20:00', minutes: 60, title: `${title}: reading`, kind: 'deep' }]
    risks = ['Reading past the five. The answer is due before the reading is done.']
  } else {
    outcome = `${title}, done: the first version exists and the next decision is written down.`
    milestones = [
      { title: 'Define', done: 'One page: what it is, why, what done looks like.' },
      { title: 'First version', done: 'The smallest real version exists.' },
      { title: 'Decide', done: 'Continue, change, or stop.' },
    ]
    pieces = [
      p('Define', 'Write the one page', 'What it is, why, what done looks like.', 'morning', 3, [], ['cx-docs'], 'ag-scribe'),
      p('Define', 'Cost it', 'Lines and a total. Becomes the goal.', 'hour', 2, ['Write the one page'], ['cx-docs'], 'ag-planner'),
      p('First version', 'Do the first real thing', 'Whatever makes it exist in the world at the smallest size.', 'week', 8, ['Cost it']),
      p('First version', 'Show it to three people', 'Watch.', 'morning', 3, ['Do the first real thing']),
      p('Decide', 'Decide', 'With the reason.', 'hour', 1, ['Show it to three people'], ['cx-docs']),
    ]
    connections = ['cx-docs']
    routine = [{ weekdays: [1, 3, 5], start: '07:00', minutes: 60, title: `${title}`, kind: 'deep' }]
    risks = ['The first version grows until it is not first.']
  }

  return {
    id: `bp-${initiativeId}`,
    initiativeId,
    idea,
    outcome,
    milestones,
    pieces,
    connections,
    routine,
    risks,
    hours: pieces.reduce((a, x) => a + HOURS[x.size], 0),
    createdAt: new Date().toISOString(),
    by,
  }
}

export const SIZE_LABEL: Record<BlueprintPiece['size'], string> = { hour: 'an hour', morning: 'a morning', day: 'a day', week: 'a week' }
