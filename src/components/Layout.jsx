import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  IconLeads,
  IconPhone,
  IconChart,
  IconLogout,
  IconMenu,
} from './Icons'

function initials(name = '') {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || '?'
  )
}

export default function Layout() {
  const { profile, user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const displayName = profile?.full_name || user?.email || 'User'

  const nav = [
    { to: '/leads', label: 'Leads', Icon: IconLeads },
    { to: '/call', label: 'Call mode', Icon: IconPhone },
    { to: '/dashboard', label: 'Dashboard', Icon: IconChart },
  ]

  return (
    <div className="app-shell">
      <div
        className={`backdrop ${open ? 'show' : ''}`}
        onClick={() => setOpen(false)}
      />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <img src="/favicon.svg" alt="" className="brand-logo" />
          <span>Candi Care</span>
        </div>
        <nav className="nav">
          {nav.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
              onClick={() => setOpen(false)}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="avatar">{initials(displayName)}</div>
            <div className="user-meta">
              <div className="user-name">{displayName}</div>
              <div className="user-role">{profile?.role || 'agent'}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-block" onClick={signOut}>
            <IconLogout width={16} height={16} />
            Sign out
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="mobile-topbar">
          <button className="btn btn-ghost" onClick={() => setOpen((o) => !o)}>
            <IconMenu width={20} height={20} />
          </button>
          <div className="brand" style={{ padding: 0, fontSize: '1rem' }}>
            <img src="/favicon.svg" alt="" className="brand-logo" style={{ width: 28, height: 28 }} />
            Candi Care
          </div>
        </div>
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
