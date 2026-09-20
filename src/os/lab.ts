import type { Dataset, Doc, EpochMetric, Experiment } from './types'

/**
 * The lab. Experiments are runs the scheduler advances one epoch per tick,
 * producing curves that look like training rather than a straight line.
 * In the data centre this is the training runner and the experiment tracker;
 * the shapes are the same.
 */

export function nextEpoch(e: Experiment): EpochMetric {
  const n = e.metrics.length + 1
  const seed = e.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const noise = (k: number) => ((Math.sin(seed * 7 + n * 13 + k) + 1) / 2 - 0.5) * 0.04
  const floor = Number(e.config.floor ?? 0.32)
  const train = floor + (1.9 - floor) * Math.exp(-n / 6) + noise(1)
  const val = floor + 0.08 + (1.95 - floor) * Math.exp(-n / 6.5) + noise(2) + (n > 14 ? (n - 14) * 0.012 : 0)
  const ceiling = Number(e.config.ceiling ?? 0.71)
  const metric = Math.max(0, Math.min(1, ceiling * (1 - Math.exp(-n / 5)) + noise(3) * 0.5))
  return { epoch: n, trainLoss: round(train), valLoss: round(val), metric: round(metric) }
}

const round = (x: number) => Math.round(x * 1000) / 1000

export function bestEpoch(e: Experiment): EpochMetric | undefined {
  return [...e.metrics].sort((a, b) => b.metric - a.metric)[0]
}

const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()

export const seedDatasets: Dataset[] = [
  { id: 'ds-hawk-clips', initiativeId: 'in-hawk', name: 'Raptor flight clips', path: '/data/hawk/clips', items: 1_240, sizeMb: 18_400, provenance: 'Own capture, two field days, 240fps.', labelled: false },
  { id: 'ds-hawk-frames', initiativeId: 'in-hawk', name: 'Small-target frames', path: '/data/hawk/frames', items: 9_800, sizeMb: 6_100, provenance: 'Derived from the clips; small moving targets at distance.', labelled: true },
  { id: 'ds-hawk-heldout', initiativeId: 'in-hawk', name: 'Held-out set (sealed)', path: '/data/hawk/heldout', items: 200, sizeMb: 130, provenance: 'Labelled first, by hand. Nobody trains on these.', labelled: true },
]

export const seedExperiments: Experiment[] = [
  {
    id: 'ex-hawk-baseline',
    initiativeId: 'in-hawk',
    name: 'Baseline: standard detector',
    hypothesis: 'A conventional single-resolution detector on the small-target frames. This is the bar.',
    datasetId: 'ds-hawk-frames',
    config: { backbone: 'resnet-50', input: '640', epochs: 20, lr: 0.001, floor: 0.41, ceiling: 0.58 },
    status: 'done',
    epochs: 20,
    metricName: 'mAP@50 (small targets)',
    device: 'local gpu',
    createdAt: ago(80),
    finishedAt: ago(74),
    metrics: Array.from({ length: 20 }, (_, i) => {
      const n = i + 1
      return { epoch: n, trainLoss: round(0.41 + 1.49 * Math.exp(-n / 6)), valLoss: round(0.49 + 1.5 * Math.exp(-n / 6.5) + (n > 14 ? (n - 14) * 0.012 : 0)), metric: round(0.58 * (1 - Math.exp(-n / 5))) }
    }),
    notes: 'Small targets are where it fails, as expected. 0.57 at best.',
  },
  {
    id: 'ex-hawk-fovea',
    initiativeId: 'in-hawk',
    name: 'Dual-fovea attention',
    hypothesis: 'Two high-resolution foveal crops steered by a low-resolution periphery, the way a hawk’s two foveae work, beats one uniform pass on small distant targets.',
    datasetId: 'ds-hawk-frames',
    config: { backbone: 'resnet-50', periphery: '320', fovea: '2×256', epochs: 24, lr: 0.001, floor: 0.3, ceiling: 0.72 },
    status: 'running',
    epochs: 24,
    metricName: 'mAP@50 (small targets)',
    device: 'local gpu',
    createdAt: ago(3),
    metrics: [],
  },
]

export const seedDocs: Doc[] = [
  {
    id: 'doc-hawk-translation',
    initiativeId: 'in-hawk',
    title: 'Hawk vision → a computable idea',
    kind: 'research',
    createdAt: ago(120),
    updatedAt: ago(30),
    body: `# What the biology does
A hawk has two foveae per eye: a deep central one for distance and a shallow temporal one for the front. Cone density in the deep fovea is roughly five times ours. Temporal resolution is high — flicker fusion well above a human's — so fast small motion is not smeared. Some raptors see into the near UV.

# What it is for
Finding a small moving thing a long way off, against clutter, while moving fast yourself. Then keeping it.

# The translation
Three things a model could borrow.
1. Foveation: do not process the whole frame at one resolution. A cheap low-resolution pass over the periphery steers two expensive high-resolution crops. The two foveae are the interesting part — one tracks, one searches.
2. Temporal density: feed frames at the native high rate to the foveal branch only. The periphery can run slow.
3. Motion-first: the periphery's job is detecting small motion, not objects. Objectness comes later, in the fovea.

# What changes in the model
A two-branch detector: periphery (320px, every fourth frame, motion energy head) and fovea (two 256px crops at full rate, standard detector head), with the fovea positions chosen by the periphery. Trained end to end on small-target frames.

# The number
mAP@50 on small targets (< 32px) on the sealed held-out set. Baseline is 0.57. The idea works if it clears 0.65 three runs out of three.`,
  },
  {
    id: 'doc-hawk-spec',
    initiativeId: 'in-hawk',
    title: 'One-page spec',
    kind: 'spec',
    createdAt: ago(110),
    updatedAt: ago(100),
    body: `# What it is
A detector for small, fast, distant targets built on how a hawk's eye is organised.

# Who it is for
Me, first. Then anyone tracking small things at range: drones, wildlife cameras, sport.

# What done looks like
Beats the baseline on the sealed set by the number in the translation doc, reproducible from one command, with a model card and an invention record.`,
  },
]
