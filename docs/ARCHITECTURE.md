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

Spark → research → thesis → plan → cost → launch → monitor. Every stage does
something real and leaves something openable. The alternative-sports
initiative in the sample shows it mid-flight. Templates ("build a product",
"research a thesis and deploy it", "plan a trip", "hire someone") are
initiatives with the stages pre-written.

## Later

- **IP boundary.** Feed the OS your employment contract; each initiative and
  download gets a boundary check — personal, employer, or unclear — before it
  is worked on with company scope. This is a scope on the store plus a
  reviewed classification, so it fits without new machinery.
- **People.** Agents will need humans. A person is an agent with a different
  presence and no scopes you did not give them.
