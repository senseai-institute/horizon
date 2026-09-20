import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { FLOW_LABEL } from '../os/bio'
import { inboxScore } from '../os/inbox'
import { usePendingCount } from '../store/derived'
import { useHorizon } from '../store/useHorizon'
import { bioSimulator, useOS } from '../store/useOS'
import { BuddyDock, ChatLayer } from './ChatWindows'
import Glyph from './Glyph'
import Palette from './Palette'
import NudgeBar from './NudgeBar'
import { IconDoc, IconGoal, IconMap, IconQueue, IconSleeves, IconToday, IconValues } from './icons'
import { ConfirmButton } from './ui'

const WORK = [
  { to: '/desk', label: 'Desk', icon: <IconToday /> },
  { to: '/initiatives', label: 'Initiatives', icon: <IconGoal /> },
  { to: '/journey', label: 'Journey', icon: <IconQueue /> },
  { to: '/stream', label: 'Stream', icon: <IconDoc /> },
  { to: '/flow', label: 'Flow', icon: <IconValues /> },
  { to: '/agents', label: 'Agents', icon: <IconMap /> },
]
const LIFE = [
  { to: '/life', label: 'Overview', icon: <IconToday /> },
  { to: '/goals', label: 'Goals', icon: <IconGoal /> },
  { to: '/beliefs', label: 'Beliefs', icon: <IconMap /> },
  { to: '/values', label: 'Values', icon: <IconValues /> },
  { to: '/money', label: 'Money', icon: <IconSleeves />, counter: true },
]

/**
 * The operating-system chrome: a status bar, an app rail, the work surface,
 * the buddy dock, and the chat layer floating over everything. Focus mode
 * collapses the rail and the dock and tucks the chats away.
 */
export default function OSShell() {
  const pending = usePendingCount()
  const inbox = useOS((s) => s.inbox)
  const flow = useOS((s) => s.flow)
  const focus = useOS((s) => s.focus)
  const bio = useOS((s) => s.bio)
  const bioSource = useOS((s) => s.bioSource)
  const tick = useOS((s) => s.tick)
  const pushBio = useOS((s) => s.pushBio)
  const setFocus = useOS((s) => s.setFocus)
  const regenerate = useOS((s) => s.regeneratePieces)
  const ensureDay = useOS((s) => s.ensureDay)
  const refreshNudges = useOS((s) => s.refreshNudges)
  const setPalette = useOS((s) => s.setPalette)
  const resetOS = useOS((s) => s.resetOS)
  const resetNotebook = useHorizon((s) => s.resetNotebook)
  const goals = useHorizon((s) => s.goals)
  const score = inboxScore(inbox)
  const last = bio[bio.length - 1]

  /* The scheduler and the heart. Both run while the shell is mounted. */
  useEffect(() => {
    const runs = setInterval(tick, 1400)
    const heart = setInterval(() => {
      if (bioSource === 'simulator') pushBio(bioSimulator.next())
    }, 2000)
    const nudges = setInterval(refreshNudges, 15_000)
    ensureDay()
    refreshNudges()
    return () => {
      clearInterval(runs)
      clearInterval(heart)
      clearInterval(nudges)
    }
  }, [tick, pushBio, bioSource, refreshNudges, ensureDay])

  /* New goals get pieces on the journey. */
  useEffect(() => {
    regenerate()
  }, [goals.length, regenerate])

  return (
    <div className={`os${focus ? ' is-focus' : ''}`}>
      <header className="topbar">
        <NavLink to="/desk" className="topbar-brand">
          <Glyph size={22} />
          Horizon
        </NavLink>
        <span className="meta">personal operating system</span>
        <button type="button" className="palette-trigger" onClick={() => setPalette(true)} title="Find anything (⌘K)">
          <span>Find anything…</span>
          <kbd className="mono">⌘K</kbd>
        </button>
        <div className="topbar-status">
          <NavLink to="/desk" className="status-pill" title="Inbox score — bring it down by doing the work">
            <span>Inbox</span>
            <span className="num">{score}</span>
          </NavLink>
          <NavLink to="/flow" className="status-pill" title="Flow state from biometrics">
            <span className={`status-dot ${flow}`} />
            <span>{FLOW_LABEL[flow]}</span>
            {last && <span className="num">{last.hr} bpm</span>}
          </NavLink>
          <button type="button" className={`btn btn-sm${focus ? ' btn-primary' : ''}`} onClick={() => setFocus(!focus)} title="Focus mode hides the rail, the dock and the chats">
            {focus ? 'Leave focus' : 'Focus'}
          </button>
        </div>
      </header>

      <nav className="rail" aria-label="Apps">
        <div className="nav-group-label label">Work</div>
        {WORK.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-item-icon">{n.icon}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}
        <div className="nav-group-label label">Life</div>
        {LIFE.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-item-icon">{n.icon}</span>
            <span>{n.label}</span>
            {n.counter && pending > 0 && <span className="nav-count">{pending}</span>}
          </NavLink>
        ))}
        <div className="nav-group-label label">System</div>
        <NavLink to="/system" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <span className="nav-item-icon">
            <Glyph size={14} />
          </span>
          <span>System</span>
        </NavLink>
        <div className="rail-foot">
          <ConfirmButton
            className="btn btn-sm btn-ghost"
            confirmLabel="Yes, start over"
            onConfirm={() => {
              resetOS()
              resetNotebook()
              window.location.hash = '#/onboarding'
            }}
          >
            Start over
          </ConfirmButton>
        </div>
      </nav>

      <main className="os-main">
        <NudgeBar />
        <Outlet />
      </main>
      <Palette />

      <BuddyDock />
      <ChatLayer />
      {focus && <div className="focus-veil" />}
    </div>
  )
}
