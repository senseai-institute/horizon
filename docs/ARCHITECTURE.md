# Horizon — the operating system

This is the plan for the real thing: the machine in the office, the model on
it, the data it holds, and the surface you sit down at. The browser build in
this repository is the surface and the model of your life; both are meant to
survive every step below unchanged.

## What it is for

A home for your work and your life, in one place, so that an idea had in a
conversation can become a research-backed thesis, a costed plan, a set of
launched agents, time on the calendar and money deployed — with you reviewing
every move, in flow, with a body that is looked after along the way.

## The shape

```
┌──────────────────────── the surface ──────────────────────────┐
│  Desk · Initiatives · Journey · Stream · Flow · Agents · Life  │  any screen:
│  chat windows · palette · nudges · widgets                     │  browser, kiosk,
└───────────────────────────────┬───────────────────────────────┘  phone, wall
                                │  local network, TLS, one token
┌───────────────────────────────┴───────────────────────────────┐
│  runtime  (Mac Mini, always on)                                │
│   ├─ models: local first (llama.cpp / MLX), cloud on request   │
│   ├─ agents: roles, scopes, tools, runs, the scheduler         │
│   ├─ connectors: email · calendar · GitHub · docs · sheets ·   │
│   │              bank/brokerage (read) · RSS · messages         │
│   ├─ store: encrypted at rest, event-sourced, yours            │
│   └─ senses: heart-rate · room (light, air, sound) · presence  │
└────────────────────────────────────────────────────────────────┘
```

Three layers. The **surface** is what this repository builds. The **runtime**
is `runtime/` grown up: it holds the models, the credentials, the connectors
and the store, and it is the only thing that needs to be on. The **store** is
the record of your life as events, encrypted, exportable, never anywhere you
did not put it.

## Principles that decide things

1. **Nothing moves without you.** Agents propose; runs wait; you approve. The
   runtime returns tool calls as proposals and executes none of them. This is
   not a setting.
2. **Local first, cloud on request.** Routine work — triage, summaries, plans —
   runs on a local model. Hard work can go to a cloud model, per request,
   with the data that request needs and nothing else. The surface shows which.
3. **Yours.** The store lives on your hardware. Export is one file. Sync, when
   it exists, is end-to-end encrypted with keys that never leave your devices.
4. **One place to look.** The palette finds anything and takes sentences. The
   Desk is where things arrive. There is no third place.
5. **Built for flow.** Focus mode collapses the chrome. Nudges are one line,
   one at a time, only when they would change what you do next. The body has
   standing.
6. **Modular.** A widget is one file. A connector is one module with the same
   three verbs (read, propose, apply). A workflow is an initiative template.

## The runtime, grown up

`runtime/server.mjs` today: `/chat` (Anthropic SDK, strict tools → proposals),
`/feed` (RSS). The full runtime adds:

- **Model router.** `local` (llama.cpp or MLX on the Mini; a 30–70B class
  model for routine work) and `cloud` (Anthropic API). Each agent has a
  default; each request can override. Cost and where-it-ran are recorded on
  the run.
- **Connectors.** Each is a small module: `read()` pulls into the inbox or a
  widget; `propose()` turns model output into an action; `apply()` performs an
  approved action. Email (IMAP/Gmail), calendar (CalDAV/Google), GitHub (PRs,
  issues — the coding agent's queue), docs and sheets, bank and brokerage
  (read-only aggregators; orders stay prepared-not-sent until a broker
  connector is deliberately switched on), messages, RSS.
- **Scheduler.** The `tick` in the store becomes a real queue with retries,
  timeouts and logs. Runs are durable.
- **Store.** SQLite, encrypted (SQLCipher), event-sourced: every mutation is
  an event, the state is a projection. Export is the event log. Backups are
  encrypted snapshots to wherever you say.
- **Senses.** Heart-rate over Bluetooth on the Mini itself (not the browser),
  a room sensor (light, CO₂, sound), presence (are you at the desk, on the
  mat, on the treadmill) from the same devices. The nudge engine runs here.
- **Security.** One token per device, rotated; TLS on the LAN with a local
  CA; connectors hold their own credentials in the OS keychain; the surface
  never sees a secret; audit log of every apply. Personal and company scopes
  are separate keys, so a company connector cannot read a personal one.

## Booting into it

Three steps, in order, each one usable on its own:

1. **Browser, full screen.** What exists now. Runs on the Mini, opened from
   any device on the network.
2. **Kiosk shell.** The same surface wrapped as a native window (Tauri) with
   the runtime as a local service: launches at login, owns the screen, talks
   to devices directly (Bluetooth, USB, the treadmill's BLE profile). This is
   "sit down and it is there".
3. **A dedicated machine.** If macOS gets in the way — window management,
   notifications, an app you cannot find — the surface plus runtime becomes
   the session on a minimal Linux install. Nothing in the surface assumes an
   OS underneath it.

## The senses

| Sense | Now | Then |
| --- | --- | --- |
| Sight | the whole surface; geometry as structure; nothing flashes | ambient display on a second surface: the journey ring, the day, the body |
| Sound | soft tones at the edges of a session; breath tone | room audio for focus; spoken nudges when you are not at a screen |
| Touch | haptics on nudges (where the device has them) | the treadmill and the chair as inputs; a physical dial for the palette |
| Smell | — | a diffuser on the room controller: one scent for deep work, one for the end of the day |
| Taste | — | the kitchen is a connector: what you ate is a habit month |
| Intuition | the nudge engine: patterns surfaced before you would notice | the model reads your record and says what you were about to say |

## Initiatives as the spine

Spark → translate → connect → gather → experiment → evaluate → protect →
decide, or the product and thesis variants. Every stage does something real
and leaves something openable. The hawk-vision initiative in the sample shows
the invention workflow mid-flight; alternative sports and the tool library
show the other two.

## Translation — the ribosome

An idea is a message; the blueprint is what gets built from it. The translate
stage is one function, `translate(idea) → Blueprint`, and in the real thing
it is the local model with a strict schema: milestones with a "done when",
pieces sized hour / morning / day / week with dependencies and the
connections they need, risks, hours, and a routine. Pieces go to the journey
with their dependencies so the flower-of-life packing shows what is open;
the routine goes into the day planner, which folds it into every day it
applies to for as long as the initiative is alive. When a piece finishes, the
next ring unlocks; nothing else is required of you.

## Connections and the transactional internet

Three rings. **On the machine**: the local model, the encrypted store, docs,
the PDF reader, the dataset store, the labelling tool, the training runner
and experiment tracker, weights, the camera. Always on, yours. **On the
network**: a package mirror and git on the Mac Mini, reached from any device
in the house. **On the internet**: papers, a cloud model for the rare hard
question, CI, email, calendar, filings, broker, bank, HR tools, the invention
record. Every internet use is a *transaction* — a proposal an agent makes, a
log line with what left and what came back, approved by you or by a standing
rule you wrote. The default state of the system is offline and working.
Each connection is a small MCP server in the runtime; the catalogue in the
UI is its manifest.

## The lab

Datasets are directories on local disk with a provenance line and a held-out
split nobody looks at. An experiment is a config, a dataset and a metric
chosen before training. The scheduler trains one at a time on the local GPU
(the same `tick` that advances runs); curves are written back as epochs
finish and appear on the Desk and in the Lab. Evaluate writes the report.
Protect writes a model card and an invention record: the config, the data
hashes, the weights hash and the date, signed with your key, kept in the
store. That is the IP boundary made concrete — what you built, from what,
when.

## Docs and sheets as the working surface

Every artefact an agent produces is a doc or a sheet attached to the
initiative: the research notes, the spec, the cost table, the model card. You
edit in place. The development loop connects through git and CI: a piece
that says "implement the fovea head" opens a branch, the CI run reports into
the inbox, the review is a run you approve. Docs, sheets, code and money in
one place, on one store.

## One application, and why that is dangerous

If this is the only thing you open, it has every opportunity to become the
thing you cannot close. The design takes the opposite side of every trick a
product uses to be opened more: the front door (the Morning) ends; the news is
a digest with a fixed size and a last line; counts are not shown, only a score
that falls when work is done; the Desk closes itself in the evening and asks
you to mean it if you open it late. These are settings, not sermons — they
live under System → Attention and default on.

## Everyday, and the connections principle

The list of workflows a life is made of, kept in the product and marked
built, next, or later. It is the roadmap. Two kinds of row: the ones that are
about the right experience (the cat's medicine on a piece of paper, a to-do,
a birthday) and the ones that are real work (a computer-vision product, code
and CI, messages). Both go through the same rule: a source is a connection
with an export, never a home. Groceries are a list here and an order through
an API; messages are threads here and a bridge to the platform; feeds are RSS
and nothing that needs an app. When a service has no API, the row waits.

## Trackers as a primitive

A tracker is rows × slots × days with a cadence. It is the same shape as a
medication chart, a watering rota, a habit, a birthday list with a month for
a cadence, or a bills list with a day of the month. One primitive, one
screen, one widget; the everyday list reuses it for four rows already.

## After hours

The business runs while you are at work. Agents finish runs, the lab trains,
the inbox scores. When you log in from a personal device in the evening the
Desk opens on *since you were away* — runs finished, approvals waiting, what
arrived, how far the experiment got — then the review queue, then a creative
session in Flow. The routine written by the blueprint is what keeps the
personal work moving on the mornings and the Saturday it asked for.

## Later

- **IP boundary.** Feed the OS your employment contract; each initiative and
  download gets a boundary check — personal, employer, or unclear — before it
  is worked on with company scope. This is a scope on the store plus a
  reviewed classification, so it fits without new machinery.
- **People.** Agents will need humans. A person is an agent with a different
  presence and no scopes you did not give them.
