import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { profile, user, isAdmin, signOut } = useAuth()
  const displayName = profile?.full_name || user?.email || 'Agente'

  const tabs = [
    { to: '/leads', label: 'Lista' },
    { to: '/call', label: 'Modo Llamada' },
    { to: '/dashboard', label: 'Panel' },
    ...(isAdmin ? [{ to: '/amounts', label: 'Montos' }] : []),
  ]

  return (
    <>
      <header className="topbar">
        <div>
          <div className="eyebrow">Seguimiento de afiliaciones</div>
          <h1 className="display">Central de Llamadas</h1>
        </div>
        <div className="topbar-right">
          <nav className="tabs">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  `tab-btn ${isActive ? 'active' : ''}`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
          <div className="topbar-user">
            <div>
              <div className="u-name">{displayName}</div>
              <div className="u-role">{profile?.role || 'agent'}</div>
            </div>
            <button className="signout-btn" onClick={signOut}>
              Salir
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </>
  )
}
