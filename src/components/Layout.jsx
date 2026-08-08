import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../i18n'
import NotificationBell from './NotificationBell'

export default function Layout() {
  const { profile, user, isAdmin, signOut } = useAuth()
  const { lang, setLang, t } = useLang()
  const displayName = profile?.full_name || user?.email || 'Agente'

  const tabs = [
    { to: '/leads', label: 'Lista' },
    { to: '/call', label: 'Modo Llamada' },
    { to: '/dashboard', label: 'Panel' },
    { to: '/tareas', label: 'Tareas' },
    ...(isAdmin
      ? [
          { to: '/amounts', label: 'Montos' },
          { to: '/import', label: 'Importar' },
          { to: '/usuarios', label: 'Usuarios' },
        ]
      : []),
  ]

  return (
    <>
      <header className="topbar">
        <div>
          <div className="eyebrow">{t('Seguimiento de afiliaciones')}</div>
          <h1 className="display">Central de Llamadas</h1>
        </div>
        <div className="topbar-right">
          <nav className="tabs">
            {tabs.map((tb) => (
              <NavLink
                key={tb.to}
                to={tb.to}
                className={({ isActive }) =>
                  `tab-btn ${isActive ? 'active' : ''}`
                }
              >
                {t(tb.label)}
              </NavLink>
            ))}
          </nav>
          <NotificationBell />
          <div className="lang-toggle">
            <button
              className={lang === 'es' ? 'active' : ''}
              onClick={() => setLang('es')}
            >
              ES
            </button>
            <button
              className={lang === 'en' ? 'active' : ''}
              onClick={() => setLang('en')}
            >
              EN
            </button>
          </div>
          <div className="topbar-user">
            <div>
              <div className="u-name">{displayName}</div>
              <div className="u-role">{profile?.role || 'agent'}</div>
            </div>
            <button className="signout-btn" onClick={signOut}>
              {t('Salir')}
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </>
  )
}
