/**
 * Horizon runtime — the piece that lives in your data centre.
 *
 * The workstation in the browser talks to this over HTTP. This service holds
 * the model credentials and the tool definitions; the browser never sees a
 * key. Every tool the model calls comes back to the browser as a proposed
 * action, and nothing is applied until a person clicks it there. That is the
 * human-review gate, kept where it is visible.
 *
 *   POST /chat   { agent, messages:[{role:'user'|'assistant', text}], context }
 *   →            { text, actions:[{id,label,effect}], model }
 *
 *   GET  /feed?url=…   fetch and parse an RSS/Atom feed for the Feed widget
 *   GET  /healthz
 *
 * Run:  ANTHROPIC_API_KEY=... PORT=8787 node server.mjs
 * (or `ant auth login` first and leave the key unset — the SDK finds the profile.)
 * Then in the workstation: System → Runtime → http://localhost:8787 → Use runtime.
 */
import Anthropic from '@anthropic-ai/sdk'
import { createServer } from 'node:http'

const client = new Anthropic()
const MODEL = process.env.HORIZON_MODEL || 'claude-opus-5'
const PORT = Number(process.env.PORT) || 8787

/**
 * Tools mirror the effects the workstation knows how to apply. The model
 * proposes; the browser applies after review. Inputs are strict so the
 * browser can trust the shape.
 */
const tools = [
  {
    name: 'propose_goal',
    description: 'Propose a new goal for the person. Use when they express something they want that has a cost and a horizon.',
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'targetUsd', 'horizon', 'why'],
      properties: {
        title: { type: 'string' },
        targetUsd: { type: 'number' },
        horizon: { type: 'string', enum: ['now', 'soon', 'later', 'someday'] },
        why: { type: 'string', description: 'One honest sentence in their words.' },
      },
    },
  },
  {
    name: 'prepare_trade',
    description: 'Prepare (never send) an order that changes a sleeve position. Always reviewed by the person.',
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['sleeveId', 'companyId', 'deltaUsd', 'reason'],
      properties: {
        sleeveId: { type: 'string' },
        companyId: { type: 'string' },
        deltaUsd: { type: 'number', description: 'Negative to sell, positive to buy.' },
        reason: { type: 'string' },
      },
    },
  },
  {
    name: 'earmark_cash',
    description: 'Earmark unallocated cash to a goal.',
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['goalId', 'usd', 'reason'],
      properties: { goalId: { type: 'string' }, usd: { type: 'number' }, reason: { type: 'string' } },
    },
  },
  {
    name: 'draft_roadmap',
    description: 'Draft a costed roadmap for a build or give goal. The total becomes the goal target if it is higher.',
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['goalId', 'lines'],
      properties: {
        goalId: { type: 'string' },
        lines: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['label', 'costUsd', 'weeks'],
            properties: { label: { type: 'string' }, costUsd: { type: 'number' }, weeks: { type: 'number' } },
          },
        },
      },
    },
  },
  {
    name: 'add_pieces',
    description: 'Add discrete pieces of work to the journey.',
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['pieces'],
      properties: {
        pieces: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['title', 'detail', 'weight'],
            properties: {
              title: { type: 'string' },
              detail: { type: 'string' },
              weight: { type: 'number', enum: [1, 2, 3, 5, 8] },
              goalId: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
  },
  {
    name: 'keep_note',
    description: 'Keep something as a note in the journal.',
    strict: true,
    input_schema: { type: 'object', additionalProperties: false, required: ['text'], properties: { text: { type: 'string' } } },
  },
]

const LABEL = {
  propose_goal: (i) => `Put "${i.title}" on the board`,
  prepare_trade: (i) => `Prepare the ${i.deltaUsd < 0 ? 'sell' : 'buy'} of $${Math.abs(i.deltaUsd).toLocaleString()}`,
  earmark_cash: (i) => `Earmark $${i.usd.toLocaleString()}`,
  draft_roadmap: () => 'Send the roadmap for review',
  add_pieces: (i) => `Add ${i.pieces.length} piece${i.pieces.length === 1 ? '' : 's'} to the journey`,
  keep_note: () => 'Keep as a note',
}

/** Turns a tool call into the effect shape the workstation applies. */
function toAction(block) {
  const i = block.input
  const effect =
    block.name === 'propose_goal' ? { kind: 'goal', title: i.title, targetUsd: i.targetUsd, horizon: i.horizon, why: i.why }
    : block.name === 'prepare_trade' ? { kind: 'trade', sleeveId: i.sleeveId, companyId: i.companyId, deltaUsd: i.deltaUsd }
    : block.name === 'earmark_cash' ? { kind: 'earmark', goalId: i.goalId, usd: i.usd, reason: i.reason }
    : block.name === 'draft_roadmap' ? { kind: 'roadmap', goalId: i.goalId, lines: i.lines }
    : block.name === 'add_pieces' ? { kind: 'pieces', pieces: i.pieces.map((p) => ({ ...p, dependsOn: [], goalId: p.goalId ?? undefined })) }
    : { kind: 'note', text: i.text }
  return { id: block.id, label: LABEL[block.name](i), effect }
}

function system(agent, context) {
  return [
    `You are ${agent.name}, one agent inside Horizon — a personal operating system for someone's goals, money, beliefs and work. Your role: ${agent.role}.`,
    `You are allowed to touch only these scopes: ${agent.scopes.join(', ')}. If a request needs a scope you lack, say which agent has it.`,
    `You never act on your own. When something should happen, call a tool; the person sees it as a proposal and decides. Money-moving tools are always reviewed. Prefer one clear proposal over several.`,
    `Speak plainly, in short paragraphs, no bullet-point spam, no exclamation marks, no urgency. Numbers should be specific.`,
    `Current state: ${JSON.stringify(context)}.`,
  ].join('\n\n')
}

async function chat(body) {
  const { agent, messages, context } = body
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    system: [{ type: 'text', text: system(agent, context), cache_control: { type: 'ephemeral' } }],
    tools,
    tool_choice: { type: 'auto' },
    messages: messages.map((m) => ({ role: m.role, content: m.text })),
  })
  if (response.stop_reason === 'refusal') {
    return { text: 'I can\'t help with that one.', actions: [], model: response.model }
  }
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n\n')
  const actions = response.content.filter((b) => b.type === 'tool_use').map(toAction)
  return { text: text || (actions.length ? 'Here is what I propose.' : ''), actions, model: response.model }
}

/** Minimal RSS/Atom → items. Enough for a widget; not a feed reader. */
function parseFeed(xml, source) {
  const items = []
  const entries = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/g) ?? []
  const pick = (block, tag) => {
    const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
    return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim() : ''
  }
  for (const e of entries.slice(0, 20)) {
    const link = pick(e, 'link') || (e.match(/<link[^>]*href="([^"]+)"/)?.[1] ?? '')
    items.push({
      id: pick(e, 'guid') || pick(e, 'id') || link,
      title: pick(e, 'title'),
      source,
      at: new Date(pick(e, 'pubDate') || pick(e, 'updated') || pick(e, 'published') || Date.now()).toISOString(),
      url: link,
      summary: (pick(e, 'description') || pick(e, 'summary') || pick(e, 'content')).slice(0, 240),
    })
  }
  return items
}

createServer(async (req, res) => {
  res.setHeader('access-control-allow-origin', '*')
  res.setHeader('access-control-allow-headers', 'content-type')
  res.setHeader('access-control-allow-methods', 'POST, GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.writeHead(204).end()
  if (req.url === '/healthz') return res.writeHead(200, { 'content-type': 'text/plain' }).end('ok')
  if (req.method === 'GET' && req.url?.startsWith('/feed')) {
    const url = new URL(req.url, 'http://x').searchParams.get('url')
    if (!url) return res.writeHead(400).end('url required')
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'horizon-runtime' } })
      const xml = await r.text()
      const source = new URL(url).hostname.replace(/^www\./, '')
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ items: parseFeed(xml, source) }))
    } catch (e) {
      res.writeHead(502, { 'content-type': 'application/json' }).end(JSON.stringify({ error: e.message }))
    }
    return
  }
  if (req.method === 'POST' && req.url === '/chat') {
    let raw = ''
    for await (const chunk of req) raw += chunk
    try {
      const out = await chat(JSON.parse(raw))
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(out))
    } catch (e) {
      const status = e instanceof Anthropic.AuthenticationError ? 401 : e instanceof Anthropic.RateLimitError ? 429 : e instanceof Anthropic.APIError ? e.status ?? 502 : 500
      res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify({ error: e.message }))
    }
    return
  }
  res.writeHead(404).end()
}).listen(PORT, () => console.log(`horizon runtime on :${PORT} using ${MODEL}`))
