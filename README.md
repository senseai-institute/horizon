# Horizon

A personal operating system: a workstation where you say what you want, agents
prepare the work, you review it, and it runs — across money, goals, beliefs,
values, and the ordinary business of a life.

**This repository is a working frontend plus a reference runtime.** The
frontend runs anywhere a browser does and keeps everything in that browser
until you point it at a runtime you run yourself. The runtime is the piece
that lives in your data centre and holds the model and the tools.

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

Node 20 or newer. The frontend has no server dependencies.

### Deploying to Railway

`Dockerfile`, `railway.json`, and a zero-dependency `server.mjs` that serves
the build on `$PORT` with `/healthz`. Connect the repo and deploy.

### The runtime (optional, yours)

```bash
cd runtime && npm install
ANTHROPIC_API_KEY=... npm start     # or `ant auth login` and omit the key
```

Then **System → Runtime → Use runtime**. Chats go to the model; everything it
proposes still waits for you. See `runtime/README.md`.

---

## What it is

**Desk.** The main surface. Everything that arrives — email, agent messages,
reports, approvals — in one list with an *inbox score*: sender importance ×
urgency × time waited. Reading does not move it. Replying, approving,
finishing does. When nothing is selected, the Desk shows the nearest piece of
the journey.

**Chats.** AIM-style windows, several at once, one per agent. You talk in
plain language; the agent answers in its own voice and proposes concrete
things as buttons. Nothing happens until you click one, and anything that
touches money becomes a *run* that waits in the review queue.

**Agents.** Six roles with scopes: Horizon (routes), Planner (roadmaps and
costs), Trader (prepares orders, never sends), Ledger (transaction analysis),
Scribe (turns downloads into work), Desk (inbox triage). Personal and company
scopes are separate keys on the same infrastructure. Every run is visible step
by step with a human-review gate.

**Journey.** The discrete pieces of work between here and each goal, generated
by a planning engine and laid out as a flower-of-life packing — done at the
centre, open on the next ring, locked beyond until dependencies clear. Each
piece has a weight; distance travelled is the sum.

**Stream.** Type, speak (Web Speech), or draw (a canvas notebook). Each
capture is a *download* you can hand to Scribe, drop on the journey, or attach
to a goal.

**Flow.** Heart rate, variability, breath — simulated by default, real over Web
Bluetooth with any standard heart-rate monitor. The OS names your state and
gets out of the way when you are working well: focus mode hides the rail, the
dock and the chats. A vesica-piscis breathing figure paces in-hold-out at 4 :
2 : 4φ.

**Life.** The goals, habits, beliefs, values and money that the earlier builds
established, unchanged in substance: goals on four horizons with projections;
habits that release unspent money to a goal; a belief map with confidence
computed from evidence; values that decide what you will not own; sleeves,
review queue and journal.

**System.** Runtime URL and provider switch, and export/import of everything
as one JSON file. You own it.

---

## Design principles

**Sacred geometry as structure, not decoration.** The spacing scale grows by
φ. The mark and every agent glyph is the seed of life. The journey is packed on
the flower of life's hexagonal lattice. Chat windows open at 1 : φ. The
breathing figure is the vesica piscis. `src/os/geometry.ts`.

**Built for flow.** One thing at a time. Focus mode collapses the chrome.
Notifications never flash; agent presence breathes. The inbox is a score to
empty, not a feed to refresh.

**Nothing moves without you.** Agents propose. Runs wait. Approvals are
visible on the Desk, in the queue, and under Agents. The runtime returns tool
calls as proposals and applies none of them.

---

## Architecture

```
src/os/
  types.ts      agents, scopes, runs, inbox, threads, journey, downloads, biometrics
  agents.ts     the six roles and their scopes
  planner.ts    goals → journey pieces; roadmap costing
  inbox.ts      the inbox score
  brain.ts      ModelProvider: LocalProvider (offline, intent → proposals) and
                RuntimeProvider (HTTP to runtime/)
  bio.ts        biometric simulator, flow level, Web Bluetooth heart-rate hookup
  geometry.ts   φ, seed of life, hex spiral, vesica breathing
src/store/useOS.ts    chats, runs (with a scheduler), inbox, journey, stream, flow
runtime/server.mjs    Anthropic SDK; tools mirror the effects the UI applies
```

The scheduler (`tick`) advances approved runs one step every 1.4 s and writes
outcomes back into the inbox. Effects (`trade`, `earmark`, `roadmap`, `pieces`,
`note`) are the only place the agentic layer touches life data.

---

## The sample

Six agents, three runs (two awaiting review), eight inbox items, two threads,
journey pieces for every active goal, two downloads, plus everything from the
earlier sample notebook. All fabricated. Filing passages and values scores are
illustrative and say so in the UI.

## Not in this build

Real email or bank feeds (inbox and transactions are sample data), real order
routing, speech beyond the browser's own recognition, persistent server-side
state. The runtime is a reference implementation, not a deployment.
