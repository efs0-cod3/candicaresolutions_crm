import { useEffect, useMemo, useState } from 'react'
import { supabase, OUTCOMES } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import LeadModal from '../components/LeadModal'

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

export default function Leads() {
  const { user, isAdmin } = useAuth()
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sepFilter, setSepFilter] = useState('all')

  const [modalLead, setModalLead] = useState(undefined) // undefined=closed, null=new, obj=edit

  async function load() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('leads')
      .select(
        'id, name, previous_plan, new_plan, sep, enroll_date, enroll_status, amount, hra, call_status, notes, updated_at'
      )
      .order('enroll_date', { ascending: true })
    if (error) setError(error.message)
    setLeads(data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const stats = useMemo(() => {
    const total = leads.length
    const called = leads.filter((l) => l.call_status !== 'pending').length
    const interested = leads.filter((l) => l.call_status === 'interested').length
    const rate = called > 0 ? Math.round((interested / called) * 100) : 0
    return { total, called, interested, rate }
  }, [leads])

  const seps = useMemo(
    () => [...new Set(leads.map((l) => l.sep).filter(Boolean))],
    [leads]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return leads.filter((l) => {
      if (statusFilter !== 'all' && l.call_status !== statusFilter) return false
      if (sepFilter !== 'all' && l.sep !== sepFilter) return false
      if (q && !(l.name || '').toLowerCase().includes(q)) return false
      return true
    })
  }, [leads, search, statusFilter, sepFilter])

  async function setStatus(id, status) {
    // optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, call_status: status } : l))
    )
    const { error } = await supabase
      .from('leads')
      .update({ call_status: status, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      setError(error.message)
      load()
    }
  }

  async function remove(id) {
    if (!window.confirm('¿Eliminar este contacto?')) return
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) {
      setError(
        error.message.includes('policy')
          ? 'Solo un administrador puede eliminar contactos.'
          : error.message
      )
      return
    }
    setLeads((prev) => prev.filter((l) => l.id !== id))
  }

  return (
    <>
      <div className="stats">
        <div className="stat">
          <div className="num">{stats.total}</div>
          <div className="lbl">Leads totales</div>
        </div>
        <div className="stat">
          <div className="num">{stats.called}</div>
          <div className="lbl">Contactados</div>
        </div>
        <div className="stat">
          <div className="num">{stats.interested}</div>
          <div className="lbl">Interesados</div>
        </div>
        <div className="stat">
          <div className="num">{stats.rate}%</div>
          <div className="lbl">Tasa de interés</div>
        </div>
      </div>

      <div className="content">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="filters">
          <input
            type="text"
            placeholder="Buscar por nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="chip"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            {Object.entries(OUTCOMES).map(([k, m]) => (
              <option key={k} value={k}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            className="chip"
            value={sepFilter}
            onChange={(e) => setSepFilter(e.target.value)}
          >
            <option value="all">Todos los SEP</option>
            {seps.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button className="add-btn" onClick={() => setModalLead(null)}>
            + Agregar contacto
          </button>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : filtered.length === 0 ? (
          <div className="empty">No hay leads que coincidan con el filtro.</div>
        ) : (
          <div className="lead-table">
            {filtered.map((l) => {
              const meta = OUTCOMES[l.call_status] || OUTCOMES.pending
              return (
                <div className="lead-row" key={l.id}>
                  <div>
                    <div className="lead-name">{l.name}</div>
                    <div className="lead-sub">{fmtDate(l.enroll_date)}</div>
                  </div>
                  <div className="plan-move">
                    {l.previous_plan || '—'} → <b>{l.new_plan || '—'}</b>
                  </div>
                  <div>
                    <span className="badge sep">{l.sep || '—'}</span>
                  </div>
                  <div className="amt">
                    {money(l.amount)}
                    <div className="sub">HRA {money(l.hra)}</div>
                  </div>
                  <div>
                    <select
                      className="status-pill"
                      value={l.call_status}
                      onChange={(e) => setStatus(l.id, e.target.value)}
                      style={{ background: meta.pillBg, color: meta.color }}
                    >
                      {Object.entries(OUTCOMES).map(([k, m]) => (
                        <option key={k} value={k}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="row-actions">
                    <button
                      className="icon-btn"
                      title="Editar / notas"
                      onClick={() => setModalLead(l)}
                    >
                      ✎
                    </button>
                    {isAdmin && (
                      <button
                        className="icon-btn danger"
                        title="Eliminar"
                        onClick={() => remove(l.id)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modalLead !== undefined && (
        <LeadModal
          lead={modalLead}
          onClose={() => setModalLead(undefined)}
          onSaved={() => {
            setModalLead(undefined)
            load()
          }}
        />
      )}
    </>
  )
}
