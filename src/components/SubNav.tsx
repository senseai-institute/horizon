import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'

export interface SubNavItem {
  to: string
  label: string
  end?: boolean
  badge?: number
}

/** Tabs under a section. Keeps each area to one screen with a few views. */
export default function SubNav({ items, cta }: { items: SubNavItem[]; cta?: ReactNode }) {
  return (
    <nav className="subnav" aria-label="Section">
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
          {i.label}
          {i.badge ? <span className="nav-count" style={{ marginLeft: 8 }}>{i.badge}</span> : null}
        </NavLink>
      ))}
      {cta && <div className="subnav-cta">{cta}</div>}
    </nav>
  )
}
