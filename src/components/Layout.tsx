import { NavLink, Outlet } from 'react-router-dom'
import { usePendingCount } from '../store/derived'
import { useHorizon } from '../store/useHorizon'
import { IconGoal, IconMap, IconReset, IconSleeves, IconToday, IconValues } from './icons'
import { ConfirmButton } from './ui'

const NAV = [
  { to: '/today', label: 'Today', icon: <IconToday /> },
  { to: '/goals', label: 'Goals', icon: <IconGoal /> },
  { to: '/beliefs', label: 'Beliefs', icon: <IconMap /> },
  { to: '/values', label: 'Values', icon: <IconValues /> },
  { to: '/money', label: 'Money', icon: <IconSleeves />, counter: true },
]

export default function Layout() {
  const pending = usePendingCount()
  const reset = useHorizon((s) => s.resetNotebook)

  return (
    <div className="shell">
      <aside className="sidebar">
        <NavLink to="/today" className="brand">
          <span className="brand-mark">Horizon</span>
        </NavLink>

        <nav className="nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-item-icon">{n.icon}</span>
              <span>{n.label}</span>
              {n.counter && pending > 0 && <span className="nav-count">{pending}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <p className="meta" style={{ margin: 0, lineHeight: 1.5 }}>
            Sample data, held in your browser. Nothing is sent anywhere and no orders are placed.
          </p>
          <ConfirmButton
            className="btn btn-sm btn-ghost"
            confirmLabel="Yes, start over"
            onConfirm={() => {
              reset()
              window.location.hash = '#/onboarding'
            }}
          >
            <IconReset /> Start over
          </ConfirmButton>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
