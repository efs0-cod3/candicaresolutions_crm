import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, OUTCOMES } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function money(v) {
  if (v === null || v === undefined || v === '') return '—'
  return '$' + Number(v).toFixed(2)
}
function fmtDate(d) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  if (!day) return d
  return `${m}/${day}/${y}`
}

// Terminal outcomes drop a lead out of the working queue.
const TERMINAL = ['interested', 'notinterested']

export default function CallMode() {
  const { user } = useAuth()
  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')
  const [scope, setScope] = useState('pending') // 'pending' | 'open'
  const [worked, setWorked] = useState(0)

  async function loadQueue(nextScope = scope) {
    setLoading(true)
    setError('')
    let query = supabase
      .from('leads')
      .select(
        'id, name, previous_plan, new_plan, sep, enroll_date, enroll_status, amount, hra, call_status, notes'
      )
      .order('enroll_date', { ascending: true })

    if (nextScope === 'pending') {
      query = query.eq('call_status', 'pending')
    } else {
      query = query.not('call_status', 'in', `(${TERMINAL.join(',')})`)
    }
    const { data, error } = await query
    if (error) setError(error.message)
    setQueue(data || [])
    setIndex(0)
    setLoading(false)
  }

  useEffect(() => {
    loadQueue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const current = queue[index]
  useEffect(() => {
    setNotes(current?.notes || '')
  }, [current])

  const outcomeButtons = useMemo(
    () => ['interested', 'notinterested', 'noanswer', 'callback', 'voicemail'],
    []
  )

  async function logOutcome(outcome) {
    if (!current || saving) return
    setSaving(true)
    setError('')
    const trimmed = notes.trim() || null

    const { error: actErr } = await supabase.from('call_activity').insert({
      lead_id: current.id,
      agent_id: user.id,
      outcome,
      notes: trimmed,
    })
    if (actErr) {
      setError(`No se pudo registrar la llamada: ${actErr.message}`)
      setSaving(false)
      return
    }

    const { error: updErr } = await supabase
      .from('leads')
      .update({
        call_status: outcome,
        notes: trimmed,
        assigned_to: user.id,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', current.id)
    if (updErr) {
      setError(`Llamada registrada, pero falló actualizar el contacto: ${updErr.message}`)
      setSaving(false)
      return
    }

    setWorked((w) => w + 1)
    setSaving(false)
    setIndex((i) => i + 1)
  }

  function changeScope(next) {
    setScope(next)
    loadQueue(next)
  }

  const done = !loading && !current

  return (
    <>
      <div className="content">
        <div
          className="filters"
          style={{ justifyContent: 'space-between', marginBottom: 6 }}
        >
          <div>
            <h2 className="page-heading">Modo Llamada</h2>
            <p className="page-note" style={{ margin: 0 }}>
              Un contacto a la vez · {worked} registrados en esta sesión
            </p>
          </div>
          <select
            className="chip"
            value={scope}
            onChange={(e) => changeScope(e.target.value)}
          >
            <option value="pending">Solo pendientes</option>
            <option value="open">Todos los abiertos (con seguimiento)</option>
          </select>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="spinner" />
        ) : done ? (
          <div className="call-wrap">
            <div className="call-card call-done">
              <div className="display">¡Terminaste la ronda! 🎉</div>
              <div className="muted" style={{ fontSize: 13.5, marginBottom: 20 }}>
                {worked > 0
                  ? `Trabajaste ${worked} contacto${worked === 1 ? '' : 's'} en esta sesión.`
                  : 'No quedan contactos en esta cola.'}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="btn-secondary" onClick={() => loadQueue()}>
                  Recargar cola
                </button>
                <Link to="/dashboard" className="btn-primary">
                  Ver panel
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="call-wrap">
            <div className="call-card">
              <div className="call-progress">
                Contacto {index + 1} de {queue.length}
              </div>
              <div className="call-name display">{current.name}</div>
              <div className="call-sep">
                <span className="badge sep">{current.sep || '—'}</span>
              </div>

              <div className="call-facts">
                <div>
                  <div className="fact-lbl">Plan anterior</div>
                  <div className="fact-val">{current.previous_plan || '—'}</div>
                </div>
                <div>
                  <div className="fact-lbl">Plan nuevo</div>
                  <div className="fact-val">{current.new_plan || '—'}</div>
                </div>
                <div>
                  <div className="fact-lbl">Fecha</div>
                  <div className="fact-val">{fmtDate(current.enroll_date)}</div>
                </div>
                <div>
                  <div className="fact-lbl">Monto / HRA</div>
                  <div className="fact-val">
                    {money(current.amount)} · {money(current.hra)}
                  </div>
                </div>
              </div>

              <div className="call-notes">
                <textarea
                  placeholder="Notas de la llamada…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="outcome-grid">
                {outcomeButtons.map((key) => {
                  const m = OUTCOMES[key]
                  return (
                    <button
                      key={key}
                      className="outcome-btn"
                      disabled={saving}
                      onClick={() => logOutcome(key)}
                      style={{
                        background: m.btnBg,
                        color: m.btnColor,
                        gridColumn: key === 'voicemail' ? 'span 2' : undefined,
                      }}
                    >
                      {m.label}
                    </button>
                  )
                })}
              </div>

              <button
                className="skip-btn"
                onClick={() => setIndex((i) => i + 1)}
                disabled={saving}
              >
                Saltar por ahora →
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
