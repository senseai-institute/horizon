import type { Goal } from '../lib/types'
import { roadmapFor, roadmapTotal } from './planner'
import type { Agent, ChatAction, ChatMsg, RunEffect } from './types'

/**
 * How the workstation talks to a model.
 *
 * `LocalProvider` runs entirely in the browser: it reads intent from what you
 * type and answers in each agent's voice with concrete proposals. It is what
 * runs when there is no runtime to talk to.
 *
 * `RuntimeProvider` speaks to a service you run yourself — see runtime/ in
 * the repository — which holds the model and the tools. The browser never
 * holds a key. Both return the same shape, so the UI does not care which.
 */

export interface BrainContext {
  agent: Agent
  history: ChatMsg[]
  goals: Goal[]
  sleeves: { id: string; name: string; driftUsd: number; driftPct: number }[]
  freeCashUsd: number
  inboxScore: number
}

export interface BrainReply {
  text: string
  actions?: ChatAction[]
  /** Set when a real model answered. */
  model?: string
}

export interface ModelProvider {
  name: string
  reply: (input: string, ctx: BrainContext) => Promise<BrainReply>
}

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
const money = (n: number) => `$${Math.round(Math.abs(n)).toLocaleString('en-US')}`
const num = (s: string) => {
  const m = s.replace(/,/g, '').match(/\$?\s?(\d+(?:\.\d+)?)\s*(k|m)?\b/i)
  if (!m) return null
  const n = parseFloat(m[1])
  return m[2]?.toLowerCase() === 'k' ? n * 1000 : m[2]?.toLowerCase() === 'm' ? n * 1_000_000 : n
}

function findGoal(text: string, goals: Goal[]): Goal | undefined {
  const t = text.toLowerCase()
  return goals.find((g) => t.includes(g.title.toLowerCase().split(' ')[0].toLowerCase()) && g.title.length > 3) ??
    goals.find((g) => g.title.toLowerCase().split(' ').some((w) => w.length > 4 && t.includes(w.toLowerCase())))
}

/** Reads intent from plain text. Deliberately simple and transparent. */
export function readIntent(text: string): 'trade' | 'roadmap' | 'analyse' | 'goal' | 'habit' | 'note' | 'status' | 'help' {
  const t = text.toLowerCase()
  if (/\b(buy|sell|trim|trade|order|position|rebalance)\b/.test(t)) return 'trade'
  if (/\b(roadmap|cost|estimate|plan|build|ship|launch|product)\b/.test(t)) return 'roadmap'
  if (/\b(transactions?|spend(ing)?|where.*money|analy[sz]e|statement|ledger)\b/.test(t)) return 'analyse'
  if (/\b(spend less|cut back|quit|stop (smoking|drinking|buying)|habit|less on)\b/.test(t)) return 'habit'
  if (/\b(want|need|goal|save|buy a|house|deposit|trip|sabbatical|fund|give)\b/.test(t)) return 'goal'
  if (/\b(how am i|status|where do i stand|update|summary)\b/.test(t)) return 'status'
  if (/\b(help|what can you do)\b/.test(t)) return 'help'
  return 'note'
}

export const LocalProvider: ModelProvider = {
  name: 'Local (offline)',
  async reply(input, ctx) {
    await new Promise((r) => setTimeout(r, 420 + Math.random() * 600))
    const intent = readIntent(input)
    const a = ctx.agent
    const goal = findGoal(input, ctx.goals)
    const amount = num(input)

    if (intent === 'trade' || a.id === 'ag-trader') {
      const over = [...ctx.sleeves].sort((x, y) => y.driftUsd - x.driftUsd)[0]
      if (!over || over.driftUsd < 500)
        return { text: 'Nothing is meaningfully over target right now. I would rather not trade for the sake of it — the sleeves are within a point of where you set them.' }
      const usd = amount && amount > 100 ? Math.min(amount, over.driftUsd) : Math.round(over.driftUsd / 100) * 100
      const effect: RunEffect = { kind: 'trade', sleeveId: over.id, companyId: over.id === 'sl-grid' ? 'co-etn' : over.id === 'sl-outsourced' ? 'co-dash' : 'co-tost', deltaUsd: -usd }
      return {
        text: `${over.name} is ${over.driftPct.toFixed(1)} points over target — about ${money(over.driftUsd)} nobody decided to keep. I can prepare an order to trim ${money(usd)} from its largest position. It goes to the review queue; nothing is sent until you approve it there.`,
        actions: [{ id: uid('act'), label: `Prepare the ${money(usd)} trim`, effect }],
      }
    }

    if (intent === 'roadmap' || a.id === 'ag-planner') {
      const g = goal ?? ctx.goals.find((x) => x.kind === 'build') ?? ctx.goals[0]
      if (!g) return { text: 'Give me a goal first and I will break it into pieces.' }
      const lines = roadmapFor(g)
      const total = roadmapTotal(lines)
      const diff = total - g.targetUsd
      return {
        text: `Here is a first roadmap for ${g.title}: ${lines.map((l) => `${l.label} ${money(l.costUsd)}`).join('; ')}. Total ${money(total)} over ${lines.reduce((s, l) => s + l.weeks, 0)} weeks. ${
          diff > 0 ? `That is ${money(diff)} over the current target, so I would raise the target when you approve it.` : `That fits inside the current target with ${money(-diff)} to spare.`
        } I can also lay the pieces on the journey.`,
        actions: [
          { id: uid('act'), label: 'Send the roadmap for review', effect: { kind: 'roadmap', goalId: g.id, lines } },
        ],
      }
    }

    if (intent === 'analyse' || a.id === 'ag-ledger') {
      const behind = ctx.goals.filter((g) => g.status === 'active')
      const g = goal ?? behind[0]
      const idle = ctx.freeCashUsd
      const text = `Three things from the last month. Delivery spend clustered on weekends — four of five orders were Friday or Saturday. Two subscriptions renewed that were marked for cancellation, $31 together. And ${money(idle)} of cash is sitting unallocated${g ? `, which is more than ${g.title} needs to get back on track` : ''}. ${
        g ? `I can earmark ${money(Math.min(idle, 5000))} of it to ${g.title} now.` : ''
      }`
      return {
        text,
        actions: g ? [{ id: uid('act'), label: `Earmark ${money(Math.min(idle, 5000))} to ${g.title}`, effect: { kind: 'earmark', goalId: g.id, usd: Math.min(idle, 5000), reason: 'Idle cash found by Ledger.' } }] : undefined,
      }
    }

    if (intent === 'habit') {
      return {
        text: 'That is a habit, not a goal — the useful version is: what does a month of it cost now, what would you be happy with, and which goal should the difference feed? Open Goals and track it, or tell me those three numbers here.',
      }
    }

    if (intent === 'goal') {
      const target = amount && amount > 500 ? amount : 10_000
      const title = input.replace(/^(i (want|need|would like) (to )?)/i, '').replace(/\.$/, '').trim()
      const short = title.charAt(0).toUpperCase() + title.slice(1, 60)
      return {
        text: `Written down as a goal: "${short}", ${money(target)}${amount ? '' : ' as a placeholder'}. Tell me a date and a monthly amount and I will say whether it lands. Or put it on the board as is and Planner will break it into pieces.`,
        actions: [
          { id: uid('act'), label: 'Put it on the board', effect: { kind: 'goal', title: short, targetUsd: target, horizon: 'soon', why: '' } },
        ],
      }
    }

    if (intent === 'status') {
      const active = ctx.goals.filter((g) => g.status === 'active').length
      return {
        text: `${active} goals in progress. Inbox score ${ctx.inboxScore}${ctx.inboxScore < 10 ? ', which is quiet' : ctx.inboxScore < 25 ? ', manageable' : ' — worth an hour'}. ${money(ctx.freeCashUsd)} of cash not pointed at anything. The journey has open pieces waiting; the Desk shows the nearest one.`,
      }
    }

    if (intent === 'help') {
      return { text: `${a.greeting} Things I can do here: ${a.tools.map((t) => t.label.toLowerCase()).join('; ')}. Anything marked for review goes to the queue first.` }
    }

    // note
    return {
      text: a.id === 'ag-scribe'
        ? 'Got it. I can make that a piece on the journey, attach it to a goal, or just keep it as a note. Which?'
        : `Noted. If you want it to become work, say so and I will hand it to Scribe; if it is a goal, say what it costs and by when.`,
      actions: [{ id: uid('act'), label: 'Keep as a note', effect: { kind: 'note', text: input } }, { id: uid('act'), label: 'Make it a journey piece', effect: { kind: 'pieces', pieces: [{ title: input.slice(0, 72), detail: 'From a chat.', weight: 2, dependsOn: [], agentId: undefined }] } }],
    }
  },
}

/**
 * Talks to the runtime service in runtime/. Contract:
 *   POST {baseUrl}/chat  { agent, messages:[{role,text}], context }
 *   → { text, actions?: ChatAction[], model }
 */
export function makeRuntimeProvider(baseUrl: string): ModelProvider {
  return {
    name: `Runtime at ${baseUrl}`,
    async reply(input, ctx) {
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          agent: { id: ctx.agent.id, name: ctx.agent.name, role: ctx.agent.role, scopes: ctx.agent.scopes, tools: ctx.agent.tools },
          messages: [...ctx.history.map((m) => ({ role: m.from === 'me' ? 'user' : 'assistant', text: m.text })), { role: 'user', text: input }],
          context: { goals: ctx.goals, sleeves: ctx.sleeves, freeCashUsd: ctx.freeCashUsd, inboxScore: ctx.inboxScore },
        }),
      })
      if (!res.ok) throw new Error(`Runtime replied ${res.status}`)
      const data = (await res.json()) as BrainReply
      return { ...data, actions: data.actions?.map((a) => ({ ...a, id: a.id || uid('act') })) }
    },
  }
}
