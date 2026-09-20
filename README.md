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

**One application, without the hook.** Horizon is built to be the only thing
you open: wake up and check it, add the to-do, give the cat her tablet, read
the news, do the research, build the thing. It is also built so that being
the only application does not make it the thing you cannot put down. The
rules are under System → Attention and they are on by default: the **Morning**
is the front door and it ends with "start the day"; the news is a **digest** of
a fixed size, once a day, with an explicit end and nothing below it; there are
**no unread counts** anywhere, only the inbox score, which goes down by doing;
and the **Desk closes itself** in the evening — the agents keep working, the
Morning tells you what happened, and "open it anyway" is one click but a
deliberate one.

**Everyday.** The list of workflows a whole day is made of, and whether Horizon
is their home yet — the product roadmap kept inside the product. Morning,
Work, Home, Body, Information, People, Money, Admin: twenty-six rows, half
built, each with the connections it needs. Some are small and are about the
right interface (the cat's medicine on a piece of paper); some are large (a
computer-vision product). Add your own; mark them next; knock them out one
by one. The principle that makes the list possible at all: **every source is
a connection** — an API, an MCP server, a feed, an export — so nothing gets
stuck inside someone else's product.

**Morning.** One page, read top to bottom: since you were away, what is due on
the fridge, to-dos, today's first blocks, the digest, and one line for the
one thing that has to happen. Then "start the day" and the Desk opens. Until
then, the Morning is where `/` lands.

**To-dos.** Type it, tick it. Lighter than a journey piece — no weight, no
project, no goal required. From the Morning, from the Desk, or from ⌘K with
"todo …" in front of anything.

**Trackers.** The piece of paper on the fridge: names down the side, days
across the top, a box per dose. Cat medicine (Pixel and Mochi, AM and PM,
until the 30th), the plants on Sundays, the mat on weekdays. Tick from the
Morning, the Desk widget, or the paper itself; missed boxes stay empty and
nothing nags. Make a new one in four fields.

**Find anything.** ⌘K. Type the name of an app, a goal, a piece, an agent, a
belief, a download — it is there. Type a sentence and Horizon takes it as a
chat, or keeps it in the stream. One place to look.

**Initiatives and workflows.** An idea runs on an explicit workflow to an
outcome. Four ship built in — **Idea → Invention** (spark, translate, connect,
gather, experiment, evaluate, protect, decide), **Idea → Product** (spark,
shape, first ten, cost, build, launch, time, monitor, decide), **Idea →
Thesis → Trade → Monitor** (spark, research, thesis, ground, size a sleeve,
trade, monitor) — plus a short **Question → Answer**. Every stage kind has one
executor that does the real thing and leaves something openable: a research
run, a pillar on the belief map, pieces on the journey, a costed goal, a
sleeve under Money, prepared orders waiting for review, a dataset, a trained
model, time on the day. A designer assembles new workflows from the same
stage kinds. Three initiatives ship mid-flight.

**Translate — the ribosome.** The hard part is not having the idea, it is
turning a fully formed idea in your head into practical, bite-sized steps and
a routine that fits them. The *translate* stage reads the idea, decides its
shape (a model, software, a physical thing, a study, a venture) and writes a
**blueprint**: milestones with a "done when", pieces sized *hour / morning /
day / week* with dependencies, the connections each piece needs, the risks,
and a **routine** — which weekdays, what time, how long — that is folded into
the day plan for as long as the initiative is alive. The sample carries the
hawk-vision model: a detector organised like a hawk's eye (a cheap periphery
steering two expensive foveae, motion first), five milestones, fourteen
pieces, about fifty focused hours, Tuesday and Thursday mornings plus Saturday.

**Connections.** What the OS can reach and on what terms, in three rings:
*on the machine* (local model, encrypted store, docs and sheets, PDF reader,
dataset store, labelling tool, training runner, experiment tracker, weights,
camera), *on the network* (package mirror, git), and *on the internet*
(papers, cloud model, CI, email, calendar, filings, broker, bank, HR
tools, invention record). Internet connections are **transactional** — every
use is a proposal, approved and logged — so the default is offline and the
work still gets done. Each connection shows who uses it and which initiative
needs it; the *connect* stage posts a checklist of what still needs setting
up.

**Lab.** The data-science suite. Datasets with provenance and a held-out
split, experiments queued from an initiative and trained **one at a time by
the scheduler** while you are away, loss curves drawn as they arrive, a
metric chosen before training, and a *promote* action that makes one run
"the model". *Evaluate* writes the report; *protect* writes a model card and
a hashed invention record that says the thing is yours.

**Docs and sheets.** Specs, research notes, model cards, cost tables and
invention records live with the initiative they belong to, not in five other
apps. Docs autosave; sheets total their numeric columns. Agents write into
them; you edit in place.

**Since you were away.** The business runs in the background. The Desk's
first widget says what happened since you last looked — runs finished,
approvals waiting, what arrived, how far the experiment got — so an evening
log-in on a personal device starts with review, then a creative session.

**Desk.** The main surface, made of widgets you switch on and reorder. Everything that arrives — email, agent messages,
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

**Today and nudges.** A day plan generated from the journey, the inbox and
the body — deep work in the morning, a walk between blocks, admin after
lunch, one unplanned hour. The nudge engine watches sitting time, heart-rate
trend and what is waiting, and says one thing at a time: go outside, four
breaths, clear the desk before you leave.

**Flow.** Heart rate, variability, breath — simulated by default, real over Web
Bluetooth with any standard heart-rate monitor. The OS names your state and
gets out of the way when you are working well: focus mode hides the rail, the
dock and the chats. A vesica-piscis breathing figure paces in-hold-out at 4 :
2 : 4φ. Senses you can switch on: a soft tone at the edges of a session, a
low tone that follows the breath, a short vibration on a nudge.

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

The plan for the real thing — Mac Mini runtime, local models, encrypted store,
connectors, booting into it, all six senses — is in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

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
  day.ts        the day plan and the nudge engine
  senses.ts     tones and haptics
  widgets.tsx   the widget registry — one entry per widget
  workflows.ts  stage kinds and the built-in workflows
  everyday.ts   the everyday catalogue, trackers, attention defaults
  translate.ts  idea → blueprint (milestones, sized pieces, routine, risks)
  connections.ts the connection catalogue: machine / network / internet
  lab.ts        datasets, experiments, one epoch per tick
src/store/useOS.ts    chats, runs (with a scheduler), inbox, journey, stream, flow,
                      initiatives, day, nudges, widgets, senses, blueprints,
                      connections, datasets, experiments, docs, sheets, routines,
                      todos, trackers, everyday, attention
runtime/server.mjs    Anthropic SDK; tools mirror the effects the UI applies; /feed
```

The scheduler (`tick`) advances approved runs one step every 1.4 s and writes
outcomes back into the inbox. Effects (`trade`, `earmark`, `roadmap`, `pieces`,
`note`) are the only place the agentic layer touches life data.

---

## The sample

Six agents, three runs (two awaiting review), eight inbox items, two threads,
journey pieces for every active goal, two downloads, three initiatives (the
hawk-vision invention with its blueprint, two experiments and datasets, a
research doc, a spec and a cost sheet), twenty-two connections, plus
everything from the earlier sample notebook. All fabricated. Filing passages and values scores are
illustrative and say so in the UI.

## Not in this build

Real email or bank feeds (inbox and transactions are sample data), real order
routing, speech beyond the browser's own recognition, persistent server-side
state. The runtime is a reference implementation, not a deployment.
