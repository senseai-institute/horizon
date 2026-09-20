import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHorizon } from '../store/useHorizon'
import { useOS } from '../store/useOS'
import Glyph from './Glyph'

interface Hit {
  id: string
  group: 'Apps' | 'Actions' | 'Goals' | 'Pieces' | 'Agents' | 'Initiatives' | 'Beliefs' | 'Downloads'
  label: string
  hint?: string
  run: () => void
}

const APPS: { label: string; to: string; hint: string }[] = [
  { label: 'Desk', to: '/desk', hint: 'inbox, approvals, the nearest piece' },
  { label: 'Journey', to: '/journey', hint: 'the map of pieces' },
  { label: 'Initiatives', to: '/initiatives', hint: 'idea → outcome' },
  { label: 'Stream', to: '/stream', hint: 'type, speak, draw' },
  { label: 'Flow', to: '/flow', hint: 'breath, heart, focus' },
  { label: 'Agents', to: '/agents', hint: 'runs and permissions' },
  { label: 'Overview', to: '/life', hint: 'goals and habits at a glance' },
  { label: 'Goals', to: '/goals', hint: 'what the money is for' },
  { label: 'Beliefs', to: '/beliefs', hint: 'the thesis map' },
  { label: 'Values', to: '/values', hint: 'what you will not own' },
  { label: 'Money', to: '/money', hint: 'sleeves, queue, journal' },
  { label: 'System', to: '/system', hint: 'runtime, export, senses' },
]

/**
 * ⌘K. Type the name of anything and it is there; type a sentence and Horizon
 * takes it. This is the "why can't I find an app" answer: there is exactly
 * one place to look, and it understands words.
 */
export default function Palette() {
  const open = useOS((s) => s.paletteOpen)
  const setPalette = useOS((s) => s.setPalette)
  const agents = useOS((s) => s.agents)
  const pieces = useOS((s) => s.pieces)
  const initiatives = useOS((s) => s.initiatives)
  const downloads = useOS((s) => s.downloads)
  const goals = useHorizon((s) => s.goals)
  const nodes = useHorizon((s) => s.nodes)
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette(!useOS.getState().paletteOpen)
      } else if (e.key === 'Escape' && useOS.getState().paletteOpen) setPalette(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setPalette])

  useEffect(() => {
    if (open) {
      setQ('')
      setIdx(0)
      setTimeout(() => inputRef.current?.focus(), 20)
    }
  }, [open])

  const go = (to: string) => {
    setPalette(false)
    navigate(to)
  }

  const hits = useMemo<Hit[]>(() => {
    const t = q.trim().toLowerCase()
    const os = useOS.getState()
    const all: Hit[] = [
      ...APPS.map((a) => ({ id: `app-${a.to}`, group: 'Apps' as const, label: a.label, hint: a.hint, run: () => go(a.to) })),
      { id: 'act-focus', group: 'Actions', label: 'Start a focus session', hint: 'focus mode on, chats away', run: () => { setPalette(false); os.startSession() } },
      { id: 'act-goal', group: 'Actions', label: 'New goal', run: () => go('/goals') },
      { id: 'act-belief', group: 'Actions', label: 'New belief', run: () => go('/beliefs/new') },
      { id: 'act-initiative', group: 'Actions', label: 'New initiative', hint: 'an idea, all the way to an outcome', run: () => go('/initiatives?new=1') },
      { id: 'act-walk', group: 'Actions', label: 'Log a walk', hint: 'resets the desk timer', run: () => { setPalette(false); os.logWalk() } },
      { id: 'act-export', group: 'Actions', label: 'Export everything', run: () => go('/system') },
      ...agents.filter((a) => a.enabled).map((a) => ({ id: `ag-${a.id}`, group: 'Agents' as const, label: `Chat with ${a.name}`, hint: a.role, run: () => { setPalette(false); os.openChat(a.id) } })),
      ...goals.filter((g) => g.status === 'active').map((g) => ({ id: `g-${g.id}`, group: 'Goals' as const, label: g.title, hint: g.why.slice(0, 60), run: () => go(`/goals/${g.id}`) })),
      ...initiatives.map((i) => ({ id: `in-${i.id}`, group: 'Initiatives' as const, label: i.title, hint: i.stage, run: () => go(`/initiatives?id=${i.id}`) })),
      ...pieces.filter((p) => p.status !== 'done').map((p) => ({ id: `pc-${p.id}`, group: 'Pieces' as const, label: p.title, hint: p.status, run: () => go('/journey') })),
      ...nodes.filter((n) => !n.archived && (n.kind === 'pillar' || n.kind === 'thesis' || n.kind === 'company')).map((n) => ({ id: `nd-${n.id}`, group: 'Beliefs' as const, label: n.label, hint: n.kind, run: () => go(`/beliefs/${n.id}`) })),
      ...downloads.slice(0, 30).map((d) => ({ id: `dl-${d.id}`, group: 'Downloads' as const, label: d.kind === 'drawing' ? 'A drawing' : d.content.slice(0, 70), hint: d.kind, run: () => go('/stream') })),
    ]
    if (!t) return all.filter((h) => h.group === 'Apps' || h.group === 'Actions').slice(0, 14)
    const scored = all
      .map((h) => {
        const l = h.label.toLowerCase()
        const score = l === t ? 100 : l.startsWith(t) ? 60 : l.includes(t) ? 30 : (h.hint ?? '').toLowerCase().includes(t) ? 10 : 0
        return { h, score }
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((x) => x.h)
    const sentence = t.split(' ').length >= 3
    if (sentence || scored.length === 0)
      scored.push(
        { id: 'ask', group: 'Actions', label: `Ask Horizon: "${q.trim()}"`, hint: 'opens a chat and sends it', run: () => { setPalette(false); const id = os.openChat('ag-horizon'); void os.send(id, q.trim()) } },
        { id: 'keep', group: 'Actions', label: `Keep in the stream: "${q.trim().slice(0, 40)}${q.trim().length > 40 ? '…' : ''}"`, run: () => { setPalette(false); os.addDownload({ kind: 'text', content: q.trim() }) } },
      )
    return scored
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, agents, goals, initiatives, pieces, nodes, downloads])

  useEffect(() => setIdx(0), [q])

  if (!open) return null

  let lastGroup = ''
  return (
    <div className="palette-scrim" onClick={() => setPalette(false)}>
      <div className="palette" role="dialog" aria-label="Find anything" onClick={(e) => e.stopPropagation()}>
        <div className="palette-input">
          <Glyph size={18} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type an app, a goal, a piece, an agent — or just say what you want"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(hits.length - 1, i + 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)) }
              if (e.key === 'Enter' && hits[idx]) hits[idx].run()
            }}
          />
          <kbd className="mono meta">esc</kbd>
        </div>
        <div className="palette-list">
          {hits.map((h, i) => {
            const head = h.group !== lastGroup ? h.group : null
            lastGroup = h.group
            return (
              <div key={h.id}>
                {head && <div className="palette-group label">{head}</div>}
                <button type="button" className={`palette-hit${i === idx ? ' is-active' : ''}`} onMouseEnter={() => setIdx(i)} onClick={h.run}>
                  <span className="truncate">{h.label}</span>
                  {h.hint && <span className="meta truncate" style={{ maxWidth: '45%' }}>{h.hint}</span>}
                </button>
              </div>
            )
          })}
        </div>
        <div className="palette-foot meta">↑↓ to move · ↵ to open · a sentence goes to Horizon</div>
      </div>
    </div>
  )
}
