import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, OUTCOMES, CALL_OUTCOMES } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'

function money(v) {
  if (v === null || v === undefined || v === '') return '—'
  return `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 0 })}`
}
function fmtDate(v) {
  return v ? new Date(v).toLocaleDateString() : '—'
}

// A lead is "open" (still needs work) unless it reached a terminal outcome.
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
      .order('created_at', { ascending: true })

    if (nextScope === 'pending') {
      query = query.eq('call_status', 'pending')
    } else {
      query = query.not('call_status', 'in', `(${TERMINAL.join(',')})`)
    }

    const { data, error } = await query
    if (error) setError(error.message)
    setQueue(data || [])
    setIndex(0)
    setNotes('')
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

  const progressPct = useMemo(() => {
    if (queue.length === 0) return 0
    return Math.round((index / queue.length) * 100)
  }, [index, queue.length])

  async function logOutcome(outcome) {
    if (!current || saving) return
    setSaving(true)
    setError('')

    const trimmedNotes = notes.trim() || null

    // 1) record the call activity (RLS requires agent_id = auth.uid())
    const { error: actErr } = await supabase.from('call_activity').insert({
      lead_id: current.id,
      agent_id: user.id,
      outcome,
      notes: trimmedNotes,
    })
    if (actErr) {
      setError(`Could not log the call: ${actErr.message}`)
      setSaving(false)
      return
    }

    // 2) update the lead — stamp who worked it (updated_by) and claim it.
    const { error: updErr } = await supabase
      .from('leads')
      .update({
        call_status: outcome,
        notes: trimmedNotes,
        assigned_to: user.id,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', current.id)
    if (updErr) {
      setError(`Call logged, but updating the lead failed: ${updErr.message}`)
      setSaving(false)
      return
    }

    setWorked((w) => w + 1)
    setSaving(false)
    goNext()
  }

  function goNext() {
    setNotes('')
    setIndex((i) => i + 1)
  }
  function goPrev() {
    if (index > 0) setIndex((i) => i - 1)
  }

  function changeScope(next) {
    setScope(next)
    loadQueue(next)
  }

  if (loading) return <div className="spinner" />

  const done = !current

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Call mode</h1>
          <p className="page-subtitle">
            One contact at a time · {worked} logged this session
          </p>
        </div>
        <div className="filter-field" style={{ minWidth: 180 }}>
          <label>Queue</label>
          <select value={scope} onChange={(e) => changeScope(e.target.value)}>
            <option value="pending">Pending only</option>
            <option value="open">All open (incl. follow-ups)</option>
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {done ? (
        <div className="card card-pad empty">
          <div className="empty-icon">🎉</div>
          <h2 className="section-title" style={{ marginBottom: '0.25rem' }}>
            Queue cleared!
          </h2>
          <p className="muted" style={{ marginBottom: '1.25rem' }}>
            {worked > 0
              ? `You worked ${worked} lead${worked === 1 ? '' : 's'} this session. Nice work.`
              : 'No leads left in this queue.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => loadQueue()}>
              Refresh queue
            </button>
            <Link to="/dashboard" className="btn btn-primary">
              View dashboard
            </Link>
          </div>
        </div>
      ) : (
        <div className="call-stage">
          <div className="call-card">
            <div className="call-progress">
              <span>
                Lead {index + 1} of {queue.length}
              </span>
              <StatusBadge status={current.call_status} />
            </div>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <h2 className="call-name">{current.name}</h2>
            <span className="muted">
              {current.enroll_status
                ? `Enrollment: ${current.enroll_status}`
                : 'No enrollment status on file'}
            </span>

            <div className="detail-grid">
              <div className="detail-item">
                <div className="detail-label">Previous plan</div>
                <div className="detail-value">{current.previous_plan || '—'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">New plan</div>
                <div className="detail-value">{current.new_plan || '—'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">SEP</div>
                <div className="detail-value">{current.sep || '—'}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Enroll date</div>
                <div className="detail-value">{fmtDate(current.enroll_date)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">Amount</div>
                <div className="detail-value">{money(current.amount)}</div>
              </div>
              <div className="detail-item">
                <div className="detail-label">HRA</div>
                <div className="detail-value">{money(current.hra)}</div>
              </div>
            </div>

            <div>
              <label htmlFor="callnotes">Call notes</label>
              <textarea
                id="callnotes"
                rows={3}
                placeholder="What happened on the call…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                className="btn btn-ghost"
                onClick={goPrev}
                disabled={index === 0 || saving}
              >
                ← Previous
              </button>
              <button
                className="btn btn-secondary"
                onClick={goNext}
                disabled={saving}
                style={{ marginLeft: 'auto' }}
              >
                Skip →
              </button>
            </div>
          </div>

          <div className="call-card">
            <h3 className="section-title">Log outcome</h3>
            <p className="muted" style={{ marginTop: '-0.5rem', fontSize: '0.85rem' }}>
              Records the call and updates the lead's status.
            </p>
            <div className="outcome-grid">
              {CALL_OUTCOMES.map((key) => {
                const meta = OUTCOMES[key]
                return (
                  <button
                    key={key}
                    className="outcome-btn"
                    disabled={saving}
                    onClick={() => logOutcome(key)}
                    style={{ borderColor: meta.color, color: meta.color }}
                  >
                    <span
                      className="badge-dot"
                      style={{ background: meta.color }}
                    />
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
