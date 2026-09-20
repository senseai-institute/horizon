import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../../components/Toast'
import { Stat } from '../../components/ui'
import { bluetoothAvailable, connectHeartRate, FLOW_HINT, FLOW_LABEL } from '../../os/bio'
import { breathAt, PHI } from '../../os/geometry'
import { useOS } from '../../store/useOS'

/**
 * Flow. Biometrics decide what state the OS thinks you are in; the OS changes
 * what it shows you accordingly. The breathing figure is two circles sharing a
 * centre line — the vesica piscis — opening on the in-breath.
 */
export default function FlowScreen() {
  const bio = useOS((s) => s.bio)
  const flow = useOS((s) => s.flow)
  const session = useOS((s) => s.session)
  const focus = useOS((s) => s.focus)
  const bioSource = useOS((s) => s.bioSource)
  const pieces = useOS((s) => s.pieces)
  const { startSession, endSession, setFocus, setBioSource, pushBio } = useOS.getState()
  const toast = useToast()
  const [t, setT] = useState(0)
  const last = bio[bio.length - 1]
  const piece = session?.pieceId ? pieces.find((p) => p.id === session.pieceId) : undefined

  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const loop = () => {
      setT((performance.now() - start) / 1000)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const fill = breathAt(t)
  const R = 96
  const gap = R * (1 - fill) * 0.9
  const elapsed = session ? Math.round((Date.now() - Date.parse(session.startedAt)) / 60_000) : 0

  const connect = async () => {
    try {
      const { name } = await connectHeartRate((s) => {
        const prev = useOS.getState().bio.at(-1)
        pushBio({ at: s.at ?? Date.now(), hr: s.hr ?? prev?.hr ?? 70, hrv: s.hrv ?? prev?.hrv ?? 50, breath: prev?.breath ?? 11 })
      })
      setBioSource(name)
      toast({ text: `Connected to ${name}. Flow tracking is on real data now.` })
    } catch (e) {
      toast({ text: `Could not connect: ${(e as Error).message}` })
    }
  }

  return (
    <div className="page" style={{ maxWidth: 960 }}>
      <div className="page-head">
        <div className="page-head-text">
          <h1>Flow</h1>
          <p className="lede">
            The OS reads your heart and breath and gets out of the way when you are working well. Nothing here is
            a score to chase. It is a mirror.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {session ? (
            <button type="button" className="btn btn-primary" onClick={endSession}>
              End session · {elapsed} min
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => startSession()}>
              Start a focus session
            </button>
          )}
          <button type="button" className={`btn${focus ? ' btn-primary' : ''}`} onClick={() => setFocus(!focus)}>
            {focus ? 'Leave focus' : 'Focus mode'}
          </button>
        </div>
      </div>

      <div className="desk is-even">
        <section className="card stack stack-md">
          <div className="breath-stage" aria-hidden="true">
            <svg width={R * 3.2} height={R * 2.4} viewBox={`${-R * 1.6} ${-R * 1.2} ${R * 3.2} ${R * 2.4}`}>
              <circle cx={-gap / 2} cy={0} r={R} fill="var(--accent)" fillOpacity={0.06 + fill * 0.08} stroke="var(--accent)" strokeOpacity={0.5} strokeWidth={1} />
              <circle cx={gap / 2} cy={0} r={R} fill="var(--accent)" fillOpacity={0.06 + fill * 0.08} stroke="var(--accent)" strokeOpacity={0.5} strokeWidth={1} />
              <circle cx={0} cy={0} r={R * (0.32 + fill * 0.28)} fill="none" stroke="var(--ink-3)" strokeWidth={0.8} strokeOpacity={0.7} />
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="label">{fill > 0.97 ? 'Hold' : t % (4 + 2 + 4 * PHI) < 4 ? 'Breathe in' : 'Breathe out'}</div>
            <div className="meta" style={{ marginTop: 4 }}>
              Four in, two held, six and a half out. The out-breath is the in-breath times phi.
            </div>
          </div>
        </section>

        <section className="stack stack-md">
          <div className="card stack stack-sm">
            <div className="row row-between">
              <span className="label">Right now</span>
              <span className="meta">{bioSource === 'simulator' ? 'simulated heart' : bioSource}</span>
            </div>
            <div className="row" style={{ gap: 10, alignItems: 'baseline' }}>
              <span className={`status-dot ${flow}`} style={{ width: 10, height: 10 }} />
              <span style={{ fontFamily: 'var(--serif)', fontSize: 24 }}>{FLOW_LABEL[flow]}</span>
            </div>
            <p className="prose-sm" style={{ margin: 0 }}>
              {FLOW_HINT[flow]}
            </p>
            <div className="bio-strip" style={{ paddingTop: 6 }}>
              <Stat label="Heart" value={last ? `${last.hr}` : '—'} sub="bpm" />
              <Stat label="Variability" value={last ? `${last.hrv}` : '—'} sub="ms · higher is calmer" />
              <Stat label="Breath" value={last ? `${last.breath}` : '—'} sub="per minute" />
            </div>
            <Spark data={bio.map((b) => b.hr)} />
          </div>

          <div className="card stack stack-sm">
            <span className="label">Session</span>
            {session ? (
              <>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 20 }}>{piece ? piece.title : 'Open session'}</div>
                <div className="meta">
                  {elapsed} minutes · {Math.round(session.flowMinutes)} in flow · peak {FLOW_LABEL[session.peak].toLowerCase()}
                </div>
                {piece && (
                  <Link to="/journey" className="link-button" style={{ fontSize: 13 }}>
                    On the journey
                  </Link>
                )}
              </>
            ) : (
              <p className="meta" style={{ margin: 0 }}>
                Start one from here, from the Desk, or from any open piece on the journey. Focus mode comes on with it
                and the chats tuck away.
              </p>
            )}
          </div>

          <div className="card stack stack-sm">
            <span className="label">Device</span>
            {bluetoothAvailable() ? (
              <>
                <p className="meta" style={{ margin: 0 }}>
                  Any Bluetooth heart-rate monitor that speaks the standard profile — a chest strap, most watches in
                  broadcast mode.
                </p>
                <button type="button" className="btn btn-sm" onClick={connect} style={{ alignSelf: 'flex-start' }}>
                  Connect a heart-rate monitor
                </button>
              </>
            ) : (
              <p className="meta" style={{ margin: 0 }}>
                Web Bluetooth is not available in this browser, so the simulator is running. Chrome or Edge on the
                workstation will offer a real device here.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function Spark({ data }: { data: number[] }) {
  if (data.length < 2) return <div className="spark" />
  const w = 300
  const h = 36
  const min = Math.min(...data) - 2
  const max = Math.max(...data) + 2
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / (max - min)) * h}`).join(' ')
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.2" strokeOpacity="0.8" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
