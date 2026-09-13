import { NavLink, Outlet } from 'react-router-dom'
import { usePendingCount } from '../store/derived'
import { useHorizon } from '../store/useHorizon'
import {
  IconChat,
  IconDoc,
  IconJournal,
  IconMap,
  IconQueue,
  IconReset,
  IconSearchCompanies,
  IconSleeves,
} from './icons'
import { ConfirmButton } from './ui'

const NAV = [
  { to: '/map', label: 'Thesis map', icon: <IconMap /> },
  { to: '/discovery', label: 'Discovery', icon: <IconSearchCompanies /> },
  { to: '/evidence', label: 'Evidence', icon: <IconDoc /> },
]
const NAV_DEPLOY = [
  { to: '/sleeves', label: 'Sleeves', icon: <IconSleeves /> },
  { to: '/review', label: 'Review queue', icon: <IconQueue />, counter: true },
]
const NAV_RECORD = [{ to: '/journal', label: 'Journal', icon: <IconJournal /> }]

export default function Layout() {
  const pending = usePendingCount()
  const reset = useHorizon((s) => s.resetNotebook)
  const item = (n: { to: string; label: string; icon: React.ReactNode; counter?: boolean }) => (
    <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
      <span className="nav-item-icon">{n.icon}</span>
      <span>{n.label}</span>
      {n.counter && pending > 0 && <span className="nav-count">{pending}</span>}
    </NavLink>
  )

  return (
    <div className="shell">
      <aside className="sidebar">
        <NavLink to="/map" className="brand">
          <span className="brand-mark">Horizon</span>
          <span className="brand-sub">Notebook</span>
        </NavLink>

        <nav className="nav">
          <div className="nav-group-label label">Think</div>
          <NavLink to="/onboarding" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-item-icon">
              <IconChat />
            </span>
            <span>New belief</span>
          </NavLink>
          {NAV.map(item)}
          <div className="nav-group-label label">Deploy</div>
          {NAV_DEPLOY.map(item)}
          <div className="nav-group-label label">Record</div>
          {NAV_RECORD.map(item)}
        </nav>

        <div className="sidebar-foot">
          <p className="meta" style={{ margin: 0, lineHeight: 1.5 }}>
            Everything here is sample data held in your browser. Nothing is sent anywhere and no orders
            are placed.
          </p>
          <ConfirmButton
            className="btn btn-sm btn-ghost"
            confirmLabel="Yes, start over"
            onConfirm={() => {
              reset()
              window.location.hash = '#/map'
            }}
          >
            <IconReset /> Reset the notebook
          </ConfirmButton>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
