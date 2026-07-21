import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function money(v) {
  return '$' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function monthLabel(key) {
  if (key === 'unknown') return 'Sin fecha'
  const [y, m] = key.split('-')
  return `${MONTHS[Number(m) - 1]} ${y}`
}

export default function AmountsDashboard() {
  const { isAdmin, loading: authLoading } = useAuth()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [yearFilter, setYearFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [expanded, setExpanded] = useState(null) // month key with open detail

  useEffect(() => {
    if (authLoading || !isAdmin) return
    ;(async () => {
      setLoading(true)
      // Every enrolled user + their (admin-only) financials.
      const [leadsRes, finRes] = await Promise.all([
        supabase.from('leads').select('id, name, enroll_date, new_plan'),
        supabase.from('lead_financials').select('lead_id, amount, hra'),
      ])
      if (leadsRes.error) setError(leadsRes.error.message)
      if (finRes.error) setError(finRes.error.message)
      const fin = {}
      ;(finRes.data || []).forEach((f) => (fin[f.lead_id] = f))
      const recs = (leadsRes.data || []).map((l) => ({
        id: l.id,
        name: l.name,
        enroll_date: l.enroll_date,
        new_plan: l.new_plan,
        amount: Number(fin[l.id]?.amount || 0),
        hra: Number(fin[l.id]?.hra || 0),
      }))
      setRecords(recs)
      setLoading(false)
    })()
  }, [authLoading, isAdmin])

  const years = useMemo(
    () =>
      [...new Set(records.map((r) => r.enroll_date?.slice(0, 4)).filter(Boolean))].sort().reverse(),
    [records]
  )
  const plans = useMemo(
    () => [...new Set(records.map((r) => r.new_plan).filter(Boolean))].sort(),
    [records]
  )

  const filtered = useMemo(
    () =>
      records.filter((r) => {
        if (yearFilter !== 'all' && r.enroll_date?.slice(0, 4) !== yearFilter) return false
        if (planFilter !== 'all' && r.new_plan !== planFilter) return false
        return true
      }),
    [records, yearFilter, planFilter]
  )

  const { months, totals } = useMemo(() => {
    const buckets = {}
    let amount = 0
    let hra = 0
    filtered.forEach((r) => {
      const key = r.enroll_date ? r.enroll_date.slice(0, 7) : 'unknown'
      if (!buckets[key]) buckets[key] = { key, amount: 0, hra: 0, count: 0, records: [] }
      buckets[key].amount += r.amount
      buckets[key].hra += r.hra
      buckets[key].count += 1
      buckets[key].records.push(r)
      amount += r.amount
      hra += r.hra
    })
    const months = Object.values(buckets).sort((a, b) => (a.key < b.key ? 1 : -1))
    return { months, totals: { amount, hra, count: filtered.length } }
  }, [filtered])

  const maxAmount = useMemo(() => Math.max(1, ...months.map((m) => m.amount)), [months])

  if (!authLoading && !isAdmin) return <Navigate to="/leads" replace />

  return (
    <>
      <div className="stats">
        <div className="stat">
          <div className="num">{money(totals.amount)}</div>
          <div className="lbl">Monto total</div>
        </div>
        <div className="stat">
          <div className="num">{money(totals.hra)}</div>
          <div className="lbl">HRA total</div>
        </div>
        <div className="stat">
          <div className="num">{totals.count}</div>
          <div className="lbl">Usuarios ingresados</div>
        </div>
        <div className="stat">
          <div className="num">{months.filter((m) => m.key !== 'unknown').length}</div>
          <div className="lbl">Meses con producción</div>
        </div>
      </div>

      <div className="content">
        <h2 className="page-heading">Ingresos por mes</h2>
        <p className="page-note">
          Usuarios ingresados y montos generados, agrupados por mes de afiliación · solo administradores
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="filters">
          <select
            className="chip"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="all">Todos los años</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            className="chip"
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
          >
            <option value="all">Todos los planes</option>
            {plans.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="spinner" />
        ) : months.length === 0 ? (
          <div className="empty">No hay ingresos que coincidan con los filtros.</div>
        ) : (
          <div className="card">
            <table className="mini-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Mes</th>
                  <th>Usuarios</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                  <th style={{ textAlign: 'right' }}>HRA</th>
                  <th style={{ width: '25%' }}></th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <MonthRow
                    key={m.key}
                    m={m}
                    open={expanded === m.key}
                    onToggle={() => setExpanded(expanded === m.key ? null : m.key)}
                    maxAmount={maxAmount}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td></td>
                  <td style={{ fontWeight: 700 }}>Total</td>
                  <td style={{ fontWeight: 700 }}>{totals.count}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy-deep)' }}>
                    {money(totals.amount)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{money(totals.hra)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  )
}

function MonthRow({ m, open, onToggle, maxAmount }) {
  return (
    <>
      <tr onClick={onToggle} style={{ cursor: 'pointer' }}>
        <td style={{ width: 24, color: 'var(--ink-soft)' }}>{open ? '▾' : '▸'}</td>
        <td style={{ fontWeight: 600 }}>{monthLabel(m.key)}</td>
        <td>{m.count}</td>
        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--navy)' }}>
          {money(m.amount)}
        </td>
        <td style={{ textAlign: 'right' }}>{money(m.hra)}</td>
        <td>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(m.amount / maxAmount) * 100}%`, background: 'var(--amber)' }}
            />
          </div>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} style={{ background: 'var(--bg)', padding: '4px 12px 12px' }}>
            <table className="mini-table" style={{ background: 'transparent' }}>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Plan</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                  <th style={{ textAlign: 'right' }}>HRA</th>
                </tr>
              </thead>
              <tbody>
                {m.records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td className="muted">{r.new_plan || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{money(r.amount)}</td>
                    <td style={{ textAlign: 'right' }}>{money(r.hra)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  )
}
