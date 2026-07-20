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
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (authLoading || !isAdmin) return
    ;(async () => {
      setLoading(true)
      // Admin-only: financials joined to each lead's enrollment date.
      const { data, error } = await supabase
        .from('lead_financials')
        .select('amount, hra, leads(name, enroll_date)')
      if (error) setError(error.message)
      setRows(data || [])
      setLoading(false)
    })()
  }, [authLoading, isAdmin])

  const { months, totals } = useMemo(() => {
    const buckets = {}
    let totalAmount = 0
    let totalHra = 0
    rows.forEach((r) => {
      const date = r.leads?.enroll_date
      const key = date ? date.slice(0, 7) : 'unknown'
      if (!buckets[key]) buckets[key] = { key, amount: 0, hra: 0, count: 0 }
      buckets[key].amount += Number(r.amount || 0)
      buckets[key].hra += Number(r.hra || 0)
      buckets[key].count += 1
      totalAmount += Number(r.amount || 0)
      totalHra += Number(r.hra || 0)
    })
    const months = Object.values(buckets).sort((a, b) =>
      a.key < b.key ? 1 : -1
    )
    return {
      months,
      totals: { amount: totalAmount, hra: totalHra, count: rows.length },
    }
  }, [rows])

  const maxAmount = useMemo(
    () => Math.max(1, ...months.map((m) => m.amount)),
    [months]
  )

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
          <div className="lbl">Afiliaciones</div>
        </div>
        <div className="stat">
          <div className="num">{months.filter((m) => m.key !== 'unknown').length}</div>
          <div className="lbl">Meses con producción</div>
        </div>
      </div>

      <div className="content">
        <h2 className="page-heading">Montos por mes</h2>
        <p className="page-note">
          Sumas de monto y HRA agrupadas por mes de afiliación · solo administradores
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="spinner" />
        ) : months.length === 0 ? (
          <div className="empty">Aún no hay montos registrados.</div>
        ) : (
          <div className="card">
            <table className="mini-table">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Afiliaciones</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                  <th style={{ textAlign: 'right' }}>HRA</th>
                  <th style={{ width: '30%' }}></th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.key}>
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
                          style={{
                            width: `${(m.amount / maxAmount) * 100}%`,
                            background: 'var(--amber)',
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ fontWeight: 700 }}>Total</td>
                  <td style={{ fontWeight: 700 }}>{totals.count}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--navy-deep)' }}>
                    {money(totals.amount)}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    {money(totals.hra)}
                  </td>
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
