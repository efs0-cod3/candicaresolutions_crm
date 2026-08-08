import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTaskReminders } from '../hooks/useTaskReminders'
import { useLang } from '../i18n'

function fmtDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${m}/${day}/${y}`
}

export default function NotificationBell() {
  const { overdue, dueToday, actionable } = useTaskReminders()
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const [perm, setPerm] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function enableNotifications() {
    if (typeof Notification === 'undefined') return
    const res = await Notification.requestPermission()
    setPerm(res)
  }

  function go() {
    setOpen(false)
    navigate('/tareas')
  }

  const count = actionable.length

  return (
    <div className="bell-wrap" ref={ref}>
      <button
        className="bell-btn"
        onClick={() => setOpen((o) => !o)}
        title={t('Notificaciones de tareas')}
      >
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && <span className="bell-badge">{count > 9 ? '9+' : count}</span>}
      </button>

      {open && (
        <div className="bell-menu">
          <div className="bell-head">{t('Recordatorios de tareas')}</div>

          {count === 0 ? (
            <div className="bell-empty">{t('Sin tareas vencidas o para hoy 🎉')}</div>
          ) : (
            <div className="bell-list">
              {overdue.map((task) => (
                <button key={task.id} className="bell-item" onClick={go}>
                  <span className="bell-tag overdue">{t('Vencida')}</span>
                  <span className="bell-title">{task.title}</span>
                  <span className="bell-date">{fmtDate(task.due_date)}</span>
                </button>
              ))}
              {dueToday.map((task) => (
                <button key={task.id} className="bell-item" onClick={go}>
                  <span className="bell-tag today">{t('Hoy')}</span>
                  <span className="bell-title">{task.title}</span>
                </button>
              ))}
            </div>
          )}

          <button className="bell-foot" onClick={go}>
            {t('Ver todas las tareas →')}
          </button>

          {perm === 'default' && (
            <button className="bell-enable" onClick={enableNotifications}>
              {t('Activar notificaciones del navegador')}
            </button>
          )}
          {perm === 'denied' && (
            <div className="bell-denied">
              {t('Notificaciones del navegador bloqueadas (actívalas en el navegador).')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
