import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function fmtDate(d) {
  if (!d) return null
  const [y, m, day] = d.split('-')
  if (!day) return d
  return `${m}/${day}/${y}`
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

function dueInfo(due, status) {
  if (!due || status === 'done') return null
  const today = todayStr()
  if (due < today) return { label: 'Vencida', cls: 'overdue' }
  if (due === today) return { label: 'Hoy', cls: 'today' }
  return null
}

export default function Tasks() {
  const { user, isAdmin } = useAuth()
  const [tasks, setTasks] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // new task form (admin)
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [assignee, setAssignee] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [tRes, pRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, details, assigned_to, due_date, status, created_at')
        .order('created_at', { ascending: false }),
      isAdmin
        ? supabase.from('profiles').select('id, full_name, role')
        : Promise.resolve({ data: [] }),
    ])
    if (tRes.error) setError(tRes.error.message)
    setTasks(tRes.data || [])
    setProfiles(pRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  const nameOf = useMemo(() => {
    const m = {}
    profiles.forEach((p) => (m[p.id] = p.full_name))
    return m
  }, [profiles])

  const { pending, done } = useMemo(() => {
    const sortByDue = (a, b) =>
      (a.due_date || '9999').localeCompare(b.due_date || '9999')
    return {
      pending: tasks.filter((t) => t.status === 'pending').sort(sortByDue),
      done: tasks.filter((t) => t.status === 'done'),
    }
  }, [tasks])

  async function createTask(e) {
    e.preventDefault()
    setError('')
    if (!title.trim() || !assignee) {
      setError('Escribe un título y elige a quién asignar.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('tasks').insert({
      title: title.trim(),
      details: details.trim() || null,
      assigned_to: assignee,
      due_date: dueDate || null,
    })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setTitle('')
    setDetails('')
    setAssignee('')
    setDueDate('')
    load()
  }

  async function toggle(t) {
    const next = t.status === 'done' ? 'pending' : 'done'
    setTasks((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, status: next } : x))
    )
    const { error } = await supabase
      .from('tasks')
      .update({
        status: next,
        completed_at: next === 'done' ? new Date().toISOString() : null,
      })
      .eq('id', t.id)
    if (error) {
      setError(error.message)
      load()
    }
  }

  async function remove(id) {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) setError(error.message)
    else setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  function TaskItem({ t }) {
    return (
      <div className={`task-item ${t.status === 'done' ? 'is-done' : ''}`}>
        <button
          className="task-check"
          onClick={() => toggle(t)}
          title={t.status === 'done' ? 'Marcar pendiente' : 'Marcar hecha'}
        >
          {t.status === 'done' ? '✓' : ''}
        </button>
        <div className="task-body">
          <div className="task-title">{t.title}</div>
          {t.details && <div className="task-details">{t.details}</div>}
          <div className="task-meta">
            {isAdmin && <span>👤 {nameOf[t.assigned_to] || 'Agente'}</span>}
            {t.due_date && <span>📅 {fmtDate(t.due_date)}</span>}
            {(() => {
              const info = dueInfo(t.due_date, t.status)
              return info ? (
                <span className={`bell-tag ${info.cls}`}>{info.label}</span>
              ) : null
            })()}
          </div>
        </div>
        {isAdmin && (
          <button className="icon-btn danger" title="Eliminar" onClick={() => remove(t.id)}>
            ✕
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="content">
      <h2 className="page-heading">Tareas</h2>
      <p className="page-note">
        {isAdmin
          ? 'Asigna tareas a tus agentes y sigue su avance.'
          : 'Tus tareas asignadas. Márcalas como hechas al completarlas.'}
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      {isAdmin && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 className="card-title">Asignar una tarea</h3>
          <form onSubmit={createTask}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <div>
                <label>Título</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Llamar lista FEMA" />
              </div>
              <div>
                <label>Asignar a</label>
                <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                  <option value="">— Elegir —</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} {p.role === 'admin' ? '(admin)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Fecha límite (opcional)</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label>Detalles (opcional)</label>
              <input value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Notas o instrucciones…" />
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="add-btn" type="submit" disabled={saving}>
                {saving ? 'Asignando…' : 'Asignar tarea'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="spinner" />
      ) : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 className="card-title">Pendientes ({pending.length})</h3>
            {pending.length === 0 ? (
              <p className="muted">No hay tareas pendientes.</p>
            ) : (
              <div className="task-list">
                {pending.map((t) => (<TaskItem key={t.id} t={t} />))}
              </div>
            )}
          </div>

          {done.length > 0 && (
            <div className="card">
              <h3 className="card-title">Completadas ({done.length})</h3>
              <div className="task-list">
                {done.map((t) => (<TaskItem key={t.id} t={t} />))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
