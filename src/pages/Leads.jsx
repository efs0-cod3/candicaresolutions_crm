import { useEffect, useMemo, useState } from 'react'
import { supabase, OUTCOMES } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import LeadModal from '../components/LeadModal'

const PAGE_SIZE = 20
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

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
  const [planFilter, setPlanFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')

  const [view, setView] = useState(
    () => localStorage.getItem('leadsView') || 'list'
  )
  const [page, setPage] = useState(1)
  const [modalLead, setModalLead] = useState(undefined) // undefined=closed, null=new, obj=edit

  function changeView(v) {
    setView(v)
    localStorage.setItem('leadsView', v)
  }

  async function load() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('leads')
      .select(
        'id, name, phone, birth_date, previous_plan, new_plan, sep, enroll_date, enroll_status, call_status, notes, updated_at, lead_financials(amount, hra)'
      )
      .order('enroll_date', { ascending: true })
    if (error) setError(error.message)
    const rows = (data || []).map((l) => {
      const fin = Array.isArray(l.lead_financials)
        ? l.lead_financials[0]
        : l.lead_financials
      return { ...l, amount: fin?.amount ?? null, hra: fin?.hra ?? null }
    })
    setLeads(rows)
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
  const plans = useMemo(
    () => [...new Set(leads.map((l) => l.new_plan).filter(Boolean))].sort(),
    [leads]
  )
  const years = useMemo(
    () =>
      [...new Set(leads.map((l) => l.enroll_date?.slice(0, 4)).filter(Boolean))]
        .sort()
        .reverse(),
    [leads]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return leads.filter((l) => {
      const ed = l.enroll_date || ''
      if (statusFilter !== 'all' && l.call_status !== statusFilter) return false
      if (sepFilter !== 'all' && l.sep !== sepFilter) return false
      if (planFilter !== 'all' && l.new_plan !== planFilter) return false
      if (yearFilter !== 'all' && ed.slice(0, 4) !== yearFilter) return false
      if (monthFilter !== 'all' && ed.slice(5, 7) !== monthFilter) return false
      if (q && !(l.name || '').toLowerCase().includes(q)) return false
      return true
    })
  }, [leads, search, statusFilter, sepFilter, planFilter, yearFilter, monthFilter])

  // Reset to first page whenever the filter set changes.
  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, sepFilter, planFilter, yearFilter, monthFilter])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  async function setStatus(id, status) {
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

  function StatusSelect({ l }) {
    const meta = OUTCOMES[l.call_status] || OUTCOMES.pending
    return (
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
    )
  }

  function Actions({ l }) {
    return (
      <div className="row-actions">
        <button className="icon-btn" title="Editar / notas" onClick={() => setModalLead(l)}>
          ✎
        </button>
        {isAdmin && (
          <button className="icon-btn danger" title="Eliminar" onClick={() => remove(l.id)}>
            ✕
          </button>
        )}
      </div>
    )
  }

  function Phone({ l }) {
    return l.phone ? (
      <a
        href={`tel:${l.phone.replace(/[^+\d]/g, '')}`}
        onClick={(e) => e.stopPropagation()}
      >
        📞 {l.phone}
      </a>
    ) : (
      <span className="muted">Sin teléfono</span>
    )
  }

  const monthOptions = useMemo(() => {
    // Only offer months that actually appear (respecting current year filter).
    const present = new Set(
      leads
        .filter((l) => yearFilter === 'all' || l.enroll_date?.slice(0, 4) === yearFilter)
        .map((l) => l.enroll_date?.slice(5, 7))
        .filter(Boolean)
    )
    return [...present].sort()
  }, [leads, yearFilter])

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
          <select className="chip" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Todos los estados</option>
            {Object.entries(OUTCOMES).map(([k, m]) => (
              <option key={k} value={k}>{m.label}</option>
            ))}
          </select>
          <select className="chip" value={sepFilter} onChange={(e) => setSepFilter(e.target.value)}>
            <option value="all">Todos los SEP</option>
            {seps.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
          <select className="chip" value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
            <option value="all">Todos los planes</option>
            {plans.map((p) => (<option key={p} value={p}>{p}</option>))}
          </select>
          <select className="chip" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="all">Todos los años</option>
            {years.map((y) => (<option key={y} value={y}>{y}</option>))}
          </select>
          <select className="chip" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
            <option value="all">Todos los meses</option>
            {monthOptions.map((mm) => (
              <option key={mm} value={mm}>{MONTHS[Number(mm) - 1]}</option>
            ))}
          </select>
          <div className="view-toggle">
            <button
              className={view === 'list' ? 'active' : ''}
              onClick={() => changeView('list')}
              title="Vista lista"
            >
              ☰ Lista
            </button>
            <button
              className={view === 'cards' ? 'active' : ''}
              onClick={() => changeView('cards')}
              title="Vista tarjetas"
            >
              ▦ Tarjetas
            </button>
          </div>
          <button className="add-btn" onClick={() => setModalLead(null)}>
            + Agregar contacto
          </button>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : filtered.length === 0 ? (
          <div className="empty">No hay leads que coincidan con el filtro.</div>
        ) : (
          <>
            {view === 'list' ? (
              <div className="lead-table">
                {paged.map((l) => (
                  <div className="lead-row" key={l.id}>
                    <div>
                      <div className="lead-name">{l.name}</div>
                      <div className="lead-sub"><Phone l={l} /> · {fmtDate(l.enroll_date)}</div>
                    </div>
                    <div className="plan-move">
                      {l.previous_plan || '—'} → <b>{l.new_plan || '—'}</b>
                    </div>
                    <div><span className="badge sep">{l.sep || '—'}</span></div>
                    {isAdmin ? (
                      <div className="amt">
                        {money(l.amount)}
                        <div className="sub">HRA {money(l.hra)}</div>
                      </div>
                    ) : (
                      <div />
                    )}
                    <div><StatusSelect l={l} /></div>
                    <Actions l={l} />
                    {l.call_status === 'interested' && l.notes && (
                      <div className="lead-note">
                        <span className="lead-note-tag">Interesado</span>
                        {l.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="lead-cards">
                {paged.map((l) => (
                  <div className="lead-card" key={l.id}>
                    <div className="lead-card-head">
                      <div className="lead-name">{l.name}</div>
                      <Actions l={l} />
                    </div>
                    <div className="lead-sub"><Phone l={l} /> · {fmtDate(l.enroll_date)}</div>
                    <div className="lead-card-facts">
                      <div className="plan-move">
                        {l.previous_plan || '—'} → <b>{l.new_plan || '—'}</b>
                      </div>
                      <span className="badge sep">{l.sep || '—'}</span>
                      {isAdmin && (
                        <div className="amt" style={{ textAlign: 'left' }}>
                          {money(l.amount)}
                          <span className="sub"> · HRA {money(l.hra)}</span>
                        </div>
                      )}
                    </div>
                    <StatusSelect l={l} />
                    {l.call_status === 'interested' && l.notes && (
                      <div className="lead-note" style={{ marginTop: 10 }}>
                        <span className="lead-note-tag">Interesado</span>
                        {l.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pager">
              <span className="pager-info">
                {(safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, filtered.length)} de {filtered.length}
              </span>
              <div className="pager-controls">
                <button
                  className="btn-secondary"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                >
                  ← Anterior
                </button>
                <span className="pager-page">
                  Página {safePage} de {pageCount}
                </span>
                <button
                  className="btn-secondary"
                  disabled={safePage >= pageCount}
                  onClick={() => setPage(safePage + 1)}
                >
                  Siguiente →
                </button>
              </div>
            </div>
          </>
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
