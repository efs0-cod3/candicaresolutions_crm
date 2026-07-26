import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTaskReminders } from '../hooks/useTaskReminders'

function fmtDate(d) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${m}/${day}/${y}`
}

export default function NotificationBell() {
  const { overdue, dueToday, actionable } = useTaskReminders()
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
        title="Notificaciones de tareas"
      >
        🔔
        {count > 0 && <span className="bell-badge">{count > 9 ? '9+' : count}</span>}
      </button>

      {open && (
        <div className="bell-menu">
          <div className="bell-head">Recordatorios de tareas</div>

          {count === 0 ? (
            <div className="bell-empty">Sin tareas vencidas o para hoy 🎉</div>
          ) : (
            <div className="bell-list">
              {overdue.map((t) => (
                <button key={t.id} className="bell-item" onClick={go}>
                  <span className="bell-tag overdue">Vencida</span>
                  <span className="bell-title">{t.title}</span>
                  <span className="bell-date">{fmtDate(t.due_date)}</span>
                </button>
              ))}
              {dueToday.map((t) => (
                <button key={t.id} className="bell-item" onClick={go}>
                  <span className="bell-tag today">Hoy</span>
                  <span className="bell-title">{t.title}</span>
                </button>
              ))}
            </div>
          )}

          <button className="bell-foot" onClick={go}>
            Ver todas las tareas →
          </button>

          {perm === 'default' && (
            <button className="bell-enable" onClick={enableNotifications}>
              Activar notificaciones del navegador
            </button>
          )}
          {perm === 'denied' && (
            <div className="bell-denied">
              Notificaciones del navegador bloqueadas (actívalas en el navegador).
            </div>
          )}
        </div>
      )}
    </div>
  )
}
