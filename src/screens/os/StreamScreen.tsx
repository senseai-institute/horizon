import { useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '../../components/Toast'
import { relativeTime } from '../../components/ui'
import { useHorizon } from '../../store/useHorizon'
import { useOS } from '../../store/useOS'

type Recognition = {
  start: () => void
  stop: () => void
  continuous: boolean
  interimResults: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
}

function speech(): (new () => Recognition) | null {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/**
 * The stream: everything that comes out of your head, typed, spoken or drawn,
 * kept as a download and routed into work. This is the front door for
 * creativity; the agents turn it into pieces, goals and notes.
 */
export default function StreamScreen() {
  const downloads = useOS((s) => s.downloads)
  const { addDownload, routeDownload } = useOS.getState()
  const allGoals = useHorizon((s) => s.goals)
  const goals = useMemo(() => allGoals.filter((g) => g.status === 'active'), [allGoals])
  const toast = useToast()
  const [mode, setMode] = useState<'text' | 'voice' | 'draw'>('text')
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recRef = useRef<Recognition | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokes = useRef<string[]>([])
  const drawing = useRef(false)
  const canSpeak = !!speech()

  useEffect(() => () => recRef.current?.stop(), [])

  const keep = (kind: 'text' | 'voice' | 'drawing', content: string) => {
    if (!content.trim()) return
    addDownload({ kind, content })
    toast({ text: 'Kept. Route it when you are ready — or leave it in the stream.' })
  }

  const toggleVoice = () => {
    const Ctor = speech()
    if (!Ctor) return
    if (listening) {
      recRef.current?.stop()
      return
    }
    const r = new Ctor()
    r.continuous = true
    r.interimResults = true
    r.onresult = (e) => {
      let s = ''
      for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript
      setTranscript(s)
    }
    r.onend = () => setListening(false)
    recRef.current = r
    r.start()
    setListening(true)
  }

  /* Drawing on a canvas; strokes kept as SVG path data so they stay small. */
  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * 1000, y: ((e.clientY - r.top) / r.height) * 618 }
  }
  const ctx = () => {
    const c = canvasRef.current
    if (!c) return null
    const g = c.getContext('2d')
    if (!g) return null
    g.lineCap = 'round'
    g.lineJoin = 'round'
    g.lineWidth = 2.2
    g.strokeStyle = '#1f1e1b'
    return g
  }
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true
    const p = pos(e)
    strokes.current.push(`M${p.x.toFixed(0)},${p.y.toFixed(0)}`)
    ctx()?.beginPath()
    ctx()?.moveTo(p.x, p.y)
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    const p = pos(e)
    strokes.current[strokes.current.length - 1] += `L${p.x.toFixed(0)},${p.y.toFixed(0)}`
    const g = ctx()
    g?.lineTo(p.x, p.y)
    g?.stroke()
  }
  const up = () => (drawing.current = false)
  const clear = () => {
    strokes.current = []
    const c = canvasRef.current
    c?.getContext('2d')?.clearRect(0, 0, c.width, c.height)
  }

  return (
    <div className="page" style={{ maxWidth: 1000 }}>
      <div className="page-head">
        <div className="page-head-text">
          <h1>Stream</h1>
          <p className="lede">
            Whatever comes out — typed, spoken, drawn — lands here as a download. Then you decide: hand it to Scribe,
            make it a piece on the journey, or attach it to a goal. The point is that nothing gets lost between having
            an idea and doing something with it.
          </p>
        </div>
      </div>

      <div className="segmented" style={{ marginBottom: 18 }}>
        <button type="button" aria-pressed={mode === 'text'} onClick={() => setMode('text')}>
          Type
        </button>
        <button type="button" aria-pressed={mode === 'voice'} onClick={() => setMode('voice')}>
          Speak
        </button>
        <button type="button" aria-pressed={mode === 'draw'} onClick={() => setMode('draw')}>
          Draw
        </button>
      </div>

      <section className="card stack stack-sm" style={{ marginBottom: 30 }}>
        {mode === 'text' && (
          <>
            <textarea className="textarea" autoFocus style={{ minHeight: 120, fontSize: 18 }} placeholder="Just start." value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { keep('text', text); setText('') } }} />
            <div className="row row-between">
              <span className="meta">⌘↵ to keep</span>
              <button type="button" className="btn btn-primary" disabled={!text.trim()} onClick={() => { keep('text', text); setText('') }}>
                Keep
              </button>
            </div>
          </>
        )}
        {mode === 'voice' && (
          <>
            <div className="row" style={{ gap: 12 }}>
              <button type="button" className={`btn${listening ? '' : ' btn-primary'}`} disabled={!canSpeak} onClick={toggleVoice}>
                {listening ? (
                  <>
                    <span className="rec" /> Stop
                  </>
                ) : (
                  'Start listening'
                )}
              </button>
              {!canSpeak && <span className="meta">Speech recognition is not available in this browser. Type it, or use the runtime's transcription when it is wired up.</span>}
            </div>
            <div className="prose" style={{ minHeight: 80, color: transcript ? 'var(--ink)' : 'var(--ink-4)' }}>
              {transcript || 'Transcript appears here as you speak.'}
            </div>
            <div className="row row-between">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTranscript('')}>
                Clear
              </button>
              <button type="button" className="btn btn-primary" disabled={!transcript.trim()} onClick={() => { keep('voice', transcript); setTranscript('') }}>
                Keep
              </button>
            </div>
          </>
        )}
        {mode === 'draw' && (
          <>
            <canvas ref={canvasRef} className="sketch" width={1000} height={618} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="Drawing surface" />
            <div className="row row-between">
              <button type="button" className="btn btn-ghost btn-sm" onClick={clear}>
                Clear
              </button>
              <button type="button" className="btn btn-primary" onClick={() => { if (strokes.current.length) { keep('drawing', strokes.current.join(' ')); clear() } }}>
                Keep the drawing
              </button>
            </div>
          </>
        )}
      </section>

      <section className="stack stack-sm">
        <h3>Downloads</h3>
        {downloads.length === 0 && <p className="meta">Nothing yet.</p>}
        {downloads.map((d) => (
          <div key={d.id} className="download-row">
            <div className="dl-thumb">
              {d.kind === 'drawing' ? (
                <svg viewBox="0 0 1000 618" width="62" height="38">
                  <path d={d.content} fill="none" stroke="#1f1e1b" strokeWidth="6" strokeLinecap="round" />
                </svg>
              ) : (
                d.kind
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14.5, lineHeight: 1.5 }}>{d.kind === 'drawing' ? 'A drawing' : d.content}</div>
              <div className="meta">
                {relativeTime(d.at)}
                {d.routedTo?.pieceId ? ' · on the journey' : d.routedTo?.threadId ? ' · with Scribe' : d.routedTo?.goalId ? ` · ${goals.find((g) => g.id === d.routedTo?.goalId)?.title ?? 'attached to a goal'}` : ''}
              </div>
            </div>
            {!d.routedTo && (
              <div className="row row-wrap" style={{ gap: 6, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-sm" onClick={() => routeDownload(d.id, 'scribe')}>
                  Scribe
                </button>
                <button type="button" className="btn btn-sm" onClick={() => routeDownload(d.id, 'piece')}>
                  Journey
                </button>
                <select className="select" style={{ width: 'auto', padding: '4px 8px', fontSize: 12.5 }} defaultValue="" onChange={(e) => e.target.value && routeDownload(d.id, 'goal', e.target.value)}>
                  <option value="">Goal…</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  )
}
