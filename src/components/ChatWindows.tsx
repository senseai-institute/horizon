import { useEffect, useRef, useState } from 'react'
import { useOS } from '../store/useOS'
import Glyph from './Glyph'
import { IconClose, IconMinus } from './icons'

/** The AIM layer: every open thread is a window you can drag, resize, minimise. */
export function ChatLayer() {
  const windows = useOS((s) => s.windows)
  return (
    <div className="chat-layer">
      {windows.map((w) => (
        <ChatWindow key={w.threadId} threadId={w.threadId} />
      ))}
    </div>
  )
}

function ChatWindow({ threadId }: { threadId: string }) {
  const win = useOS((s) => s.windows.find((w) => w.threadId === threadId))!
  const thread = useOS((s) => s.threads.find((t) => t.id === threadId))
  const agent = useOS((s) => s.agents.find((a) => a.id === thread?.agentId))
  const pending = useOS((s) => s.pending[threadId])
  const { closeWindow, minimiseWindow, moveWindow, focusWindow, send, applyAction } = useOS.getState()
  const [draft, setDraft] = useState('')
  const bodyRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const resize = useRef<{ x: number; y: number; w: number; h: number } | null>(null)

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [thread?.messages.length, pending])

  if (!thread || !agent) return null

  const submit = () => {
    const text = draft.trim()
    if (!text || pending) return
    setDraft('')
    void send(threadId, text)
  }

  return (
    <div
      className={`chat-win${win.minimised ? ' is-min' : ''}`}
      style={{ left: win.x, top: win.y, width: win.w, height: win.minimised ? undefined : win.h, zIndex: win.z }}
      onPointerDown={() => focusWindow(threadId)}
      role="dialog"
      aria-label={`Chat with ${agent.name}`}
    >
      <div
        className="chat-head"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return
          drag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y }
          ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!drag.current) return
          moveWindow(threadId, { x: Math.max(0, e.clientX - drag.current.dx), y: Math.max(0, e.clientY - drag.current.dy - 44) })
        }}
        onPointerUp={() => (drag.current = null)}
        onDoubleClick={() => minimiseWindow(threadId, !win.minimised)}
      >
        <Glyph size={18} hue={agent.hue} active={agent.presence === 'working'} />
        <span className="chat-head-title">
          {agent.name}
          <span className="meta"> · {thread.title === agent.name ? agent.role : thread.title}</span>
        </span>
        <button type="button" aria-label="Minimise" onClick={() => minimiseWindow(threadId, !win.minimised)}>
          <IconMinus />
        </button>
        <button type="button" aria-label="Close" onClick={() => closeWindow(threadId)}>
          <IconClose />
        </button>
      </div>

      {!win.minimised && (
        <>
          <div className="chat-body" ref={bodyRef}>
            {thread.messages.map((m) => (
              <div key={m.id} className={`bubble ${m.from}`}>
                {m.text}
                {m.downloadId && <div className="meta" style={{ marginTop: 4, opacity: 0.8 }}>attached a download</div>}
                {m.actions && m.actions.length > 0 && (
                  <div className="bubble-actions">
                    {m.actions.map((a) => (
                      <button key={a.id} type="button" className={`btn btn-sm${a.applied ? '' : ' btn-primary'}`} disabled={a.applied} onClick={() => applyAction(threadId, m.id, a.id)}>
                        {a.applied ? `✓ ${a.label}` : a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {pending && (
              <div className="typing" aria-label={`${agent.name} is thinking`}>
                <span />
                <span />
                <span />
              </div>
            )}
          </div>
          <div className="chat-input">
            <textarea
              className="input"
              placeholder={`Message ${agent.name}…`}
              value={draft}
              rows={1}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
            />
            <button type="button" className="btn btn-primary btn-sm" disabled={!draft.trim() || !!pending} onClick={submit}>
              Send
            </button>
          </div>
          <div
            className="chat-resize"
            onPointerDown={(e) => {
              e.stopPropagation()
              resize.current = { x: e.clientX, y: e.clientY, w: win.w, h: win.h }
              ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
            }}
            onPointerMove={(e) => {
              if (!resize.current) return
              moveWindow(threadId, { w: Math.max(300, resize.current.w + e.clientX - resize.current.x), h: Math.max(220, resize.current.h + e.clientY - resize.current.y) })
            }}
            onPointerUp={() => (resize.current = null)}
            aria-hidden="true"
          />
        </>
      )}
    </div>
  )
}

/** The buddy list. Click an agent to open (or raise) its window. */
export function BuddyDock() {
  const agents = useOS((s) => s.agents)
  const threads = useOS((s) => s.threads)
  const windows = useOS((s) => s.windows)
  const openChat = useOS((s) => s.openChat)
  return (
    <aside className="dock" aria-label="Agents">
      <div className="label" style={{ padding: '4px 8px 8px' }}>
        Agents
      </div>
      {agents.map((a) => {
        const open = windows.some((w) => threads.find((t) => t.id === w.threadId)?.agentId === a.id)
        return (
          <button key={a.id} type="button" className={`buddy${a.enabled ? '' : ' is-off'}`} onClick={() => a.enabled && openChat(a.id)} disabled={!a.enabled} title={a.enabled ? a.greeting : 'Switched off under Agents'}>
            <Glyph size={22} hue={a.hue} active={open} />
            <span style={{ minWidth: 0 }}>
              <div className="buddy-name">{a.name}</div>
              <div className="buddy-role">{a.role}</div>
            </span>
            <span className={`presence ${a.presence}`} aria-label={a.presence} />
          </button>
        )
      })}
      <div className="meta" style={{ padding: '14px 8px 0', lineHeight: 1.5 }}>
        Double-click a window's title to tuck it away. Nothing an agent proposes happens until you click it.
      </div>
    </aside>
  )
}
