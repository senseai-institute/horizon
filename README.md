# Horizon

A personal command centre for money that is *for* something.

Most financial products are built to make you check them. Horizon is built
around what you actually want — a place to live, time off, a thing you want to
make, something you want to give — and it lines the money up behind that. Under
the goals sit your beliefs about the world, which decide where the long-term
money is invested, and your values, which decide what you will not own.

**This repository is a working frontend and nothing else.** No server, no
brokerage, no market data. Everything is sample data held in your browser.

---

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # typecheck + production bundle → dist/
npm start          # serve dist/ on $PORT (default 3000)
```

Node 20 or newer.

### Deploying to Railway

The repo ships with a `Dockerfile`, a `railway.json` pointing at it, and a
zero-dependency `server.mjs` that serves the built bundle on `$PORT` with a
`/healthz` endpoint. Connect the repo and deploy — there is nothing to
configure. The earlier failure was the usual Vite one: the build succeeded but
nothing listened on `$PORT`, so the deploy died. `npm start` now does.

---

## What it is

**Goals.** Four horizons: *Now*, *Soon*, *Later*, *Someday*. Each goal has a
target, a date, a monthly contribution and a one-sentence reason. Horizon
projects where the current rate lands it and, when that is short, puts a
proposal in the review queue — usually pointing at money that is already over-
allocated somewhere else. A goal can be something to save for, build, or give.

**Habits.** Something you would like to spend less on, and the goal the
difference feeds. Release is measured against what a month used to cost, so
every improvement counts, not just the months that hit the target, and the
money is earmarked for the goal the moment the month closes. That is the whole
reward system: no points, no streak fire. The goal gets closer.

**Beliefs.** Your worldview as a map — pillars, theses, categories, companies —
with every node's confidence computed from the filing passages attached to it
and from what hangs beneath it. Contradicting evidence pulls confidence down
and the drop travels up the map. Long-horizon goals are funded by *sleeves*
pointed at branches of this map.

**Values.** Eight things you might care about, each weighted *not for me*,
*matters* or *core*. Every company is scored against them. Anything that
clearly works against a core value is raised for a decision rather than
quietly held, and can be marked *will not hold*.

**Money.** Allocation across sleeves, with live drift maths; a review queue
where every proposal shows the chain of reasoning behind it; and a journal of
everything that happened. Nothing moves without you, and in this build
approving something ends at "queued".

**Today.** One screen: closest goals, this month's habits, what is waiting on
you, your worldview, your alignment.

---

## The models

**Confidence** (`src/lib/confidence.ts`). Each passage is worth `strength × 5`
points, positive or negative. Points are summed and squashed —
`50 + 40·tanh(net/40)` — so the tenth agreeing filing moves a belief less than
the first. A node with children blends its own score with the weighted average
of theirs, 70/30 toward the branch. Nothing is typed in.

**Goal projection** (`src/lib/goals.ts`). Funded = earmarked cash + habit
releases + linked sleeve value. Projected = funded + monthly × months to date.
Shortfall raises a review item.

**Habits.** Released = Σ max(0, baseline − spent) over closed months. The
current month shows what it is on course to release.

**Alignment.** Company score = Σ(stance × weight) / Σ(2 × weight), on −100…100.
Portfolio score is value-weighted over holdings. *Hard conflict* = −2 on a
core value.

**Reconciliation** (`src/store/reconcile.ts`, `goalItems`, `valueItems` in the
store). Every mutation that can change a number compares before and after,
journals the change, and raises review items. Items are deduplicated against
what is already pending.

---

## The sample notebook

Seven goals across the four horizons, three habits with six months of history,
three pillars with 12 theses, 8 categories, 26 real companies with values
profiles, 55 filing passages (21 contradicting), three sleeves at different
drift levels, and a journal going back to October.

**About the data.** Companies, tickers and form types are real. The filing
passages are illustrative prose written for this prototype in the register of
the filings they are attributed to — not quotations — and the app says so.
Values scores are one reader's judgements, presented as starting points to
argue with. Source links go to EDGAR's public search for the real filer.

---

## Layout

```
server.mjs            production static server ($PORT, /healthz, SPA fallback)
Dockerfile            multi-stage: build, then ship dist/ + server.mjs
railway.json          builder + start command + healthcheck
src/
  lib/                types, confidence engine, goal/habit/values maths, colour scale
  data/seed.ts        the entire sample notebook
  store/              zustand store (persisted), reconciliation, derived selectors
  graph/              d3-force layout and the SVG map
  components/         shared UI
  screens/            one file per screen
  styles/global.css   every style in the app
```

## Deliberately not here

Accounts, brokerage connections, live prices, real orders, document fetching,
bank feeds. Habits are logged by hand.
