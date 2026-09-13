# Horizon

Research-based thesis building for people who are tired of investing products
that feel like slot machines.

Horizon helps you write down what you already believe about the world, connect
those beliefs to real companies, check them against real documents — including
documents that argue against you — and turn the result into a portfolio you
approve move by move.

**This repository is a fully working frontend and nothing else.** Every screen
looks and behaves like the real product. Nothing talks to a server, a
brokerage, or a market data feed. All the data is fabricated and lives in your
browser.

---

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build      # typecheck + production bundle into dist/
npm run preview    # serve the built bundle
npm run typecheck
```

Node 20 or newer. There is no backend to start.

The notebook persists to `localStorage` under `horizon.notebook.v1`, so
whatever you do survives a reload. **Reset the notebook** in the sidebar puts
the sample data back.

---

## The four things you do

**Talk.** A guided conversation turns a vague belief into a written claim with
a time horizon and a list of things that would make you decide you were wrong.
The broadest of these are *pillars*; everything else hangs off them.

**Map.** The beliefs are drawn as an interactive, physics-laid-out web you can
pan, zoom, drag and click around. Nodes are coloured by how confident you
currently are in them. Every connection can be clicked to see why those two
things are linked.

**Ground.** Every belief and every company can have passages from filings
attached. Each passage is marked as supporting or contradicting. Contradicting
evidence pulls confidence down, and the drop travels up the map.

**Deploy.** A *sleeve* points a percentage of the book at one branch of the
map, with rules and an exit threshold. Horizon never acts on its own: it
prepares moves, shows the chain of reasoning behind each one, and waits.

---

## How confidence is calculated

Confidence is always computed, never typed in. `src/lib/confidence.ts` is the
whole model, and it is small on purpose.

A node's score has at most two ingredients.

**Its own evidence.** Each attached passage is worth `strength × 5` points,
positive if it supports the belief and negative if it contradicts it. Those
points are summed and then squashed before being applied to a baseline of 50:

```
direct = 50 + 40 · tanh(netPoints / 40)
```

The squash is what stops a node pinning itself at the top of the scale: the
tenth agreeing filing moves a belief much less than the first did, and no
amount of evidence can shift a node more than 40 points on its own.

**What hangs underneath it.** The weighted average of its children's
confidence, where each edge carries a weight saying how much that child
informs its parent.

Nodes that have both blend them, weighted towards the branch — a belief is
mostly worth what the things below it are worth:

| Node kind | Weight on its own evidence | Weight on the branch below |
| --- | --- | --- |
| Pillar | 30% | 70% |
| Thesis | 35% | 65% |
| Category | 25% | 75% |
| Company | 100% | — |

A node with neither sits at the prior you wrote when you created it, and the
detail screen says so in as many words. That is the honest answer: a belief
with nothing behind it is just a feeling.

Scores are computed bottom-up over the whole graph on every change, with a
cycle guard, so a malformed map degrades rather than hanging. Every number on
every screen can be taken apart — the thesis detail page shows each passage's
contribution, each child's share, and how the two halves were blended.

### Why one filing moves a pillar

This is the demo. Open the map, find Eaton under *Grid hardware*, and re-mark
*"Backlog coverage extends past two years"* as contradicting. In one step:

1. Eaton falls from 78 to 45.
2. *Grid hardware* falls with it, because Eaton is its heaviest child.
3. *Grid equipment constrained* and *Transmission unblocked* both fall, since
   both hang off that category.
4. *The Grid Deficit* — the pillar — falls from 60 to 57.
5. That takes the branch under the Grid sleeve's exit threshold of 58, and an
   item appears in the review queue explaining the whole chain.

Nothing is executed. The queue ends at "Approved — queued" and stops.

---

## How the review queue is produced

`src/store/reconcile.ts` runs after every change that can move confidence. It
snapshots the map before and after, and raises an item when:

- a sleeve's branch confidence crosses below its exit threshold, or
- a pillar moves by two points or more.

Each item carries a `chain`: the passage that changed, every node between it
and the affected belief with the points it moved, and the rule that fired.
That is what the "Show the reasoning" panel renders. Items are deduplicated
against anything already pending for the same node and sleeve, so repeatedly
poking the same branch does not flood the queue.

The same pass writes the journal, which is why the timeline and the queue can
never disagree with each other.

---

## Allocation maths

Nothing about allocation is stored. `usePortfolio()` in `src/store/derived.ts`
derives sleeve value, current percentage, drift, the dollars that would close
the drift, and every rule breach from the positions and the current
confidences. Change a target and the drift recalculates on the same render.

---

## The sample notebook

Three pillars — *Outsourced Living*, *The Grid Deficit*, *Trust Moves Online* —
with 12 theses, 8 categories and 26 real public companies beneath them. There
are 55 attached passages, 21 of which argue against the belief they are
attached to. Three sleeves sit at different drift levels, one of them close
enough to its exit threshold that a single contradicting passage will trip it.
Discovery ships with pre-built matches for three private companies
(Thumbtack, Rover, Base Power). The journal goes back to November and reads
like someone actually changed their mind a few times.

**About the filing passages.** The companies, tickers, form types and section
headings are real. The passages attributed to them are *illustrative prose
written for this prototype in the register of the filings they are attributed
to* — they are not quotations, and the app says so on the evidence viewer.
Source links point at EDGAR's public search for the real filer, so the actual
document can be found.

---

## Layout

```
src/
  lib/
    types.ts          domain model
    confidence.ts     the scoring engine, graph indexing, path helpers
    color.ts          the confidence colour scale
  data/
    seed.ts           the entire sample notebook
  store/
    useHorizon.ts     zustand store, persisted; every mutation goes through commit()
    reconcile.ts      before/after comparison → review items + journal
    derived.ts        memoised selectors: scored graph, portfolio maths
  graph/
    layout.ts         d3-force configuration, visibility and label spacing
    MapCanvas.tsx     SVG renderer, pan/zoom/drag, keyboard access
  components/         shared UI: gauges, evidence card, node detail, drawer, toasts
  screens/            one file per screen
  styles/global.css   design tokens and every style in the app
```

---

## Deliberately not in this build

No accounts or sign-up. No brokerage connection. No live prices. No real
orders — the review queue ends at "Approved — queued". No document fetching;
filing excerpts are part of the fixture data.

## Known limits

- The force layout is organic, not a strict tree: nodes that hang off two
  pillars sit between them, which is the honest picture but means the tiers
  are not perfectly level.
- Map layout positions persist, but which nodes are expanded is stored
  separately and is per-browser.
- There is no undo. Archiving is reversible from the node's page; detaching a
  passage is not.
