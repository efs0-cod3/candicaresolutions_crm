import { useEffect, useMemo, useState } from 'react'
import { supabase, OUTCOMES } from '../lib/supabase'

export default function Dashboard() {
  const [leads, setLeads] = useState([])
  const [activity, setActivity] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const [leadsRes, actRes, profRes] = await Promise.all([
        supabase.from('leads').select('id, call_status, amount'),
        supabase
          .from('call_activity')
          .select('id, lead_id, agent_id, outcome, created_at')
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, role'),
      ])
      if (leadsRes.error) setError(leadsRes.error.message)
      setLeads(leadsRes.data || [])
      setActivity(actRes.data || [])
      setProfiles(profRes.data || [])
      setLoading(false)
    })()
  }, [])

  const profileMap = useMemo(() => {
    const m = {}
    profiles.forEach((p) => (m[p.id] = p))
    return m
  }, [profiles])

  const stats = useMemo(() => {
    const total = leads.length
    const byStatus = {}
    leads.forEach((l) => {
      byStatus[l.call_status] = (byStatus[l.call_status] || 0) + 1
    })
    const contacted = total - (byStatus.pending || 0)
    const interested = byStatus.interested || 0
    const conversion = contacted > 0 ? (interested / contacted) * 100 : 0
    return { total, byStatus, contacted, interested, conversion }
  }, [leads])

  const agentRows = useMemo(() => {
    const rows = {}
    activity.forEach((a) => {
      const id = a.agent_id
      if (!rows[id]) rows[id] = { id, calls: 0, interested: 0, leads: new Set() }
      rows[id].calls += 1
      rows[id].leads.add(a.lead_id)
      if (a.outcome === 'interested') rows[id].interested += 1
    })
    return Object.values(rows)
      .map((r) => ({
        ...r,
        leadCount: r.leads.size,
        name: profileMap[r.id]?.full_name || 'Agente desconocido',
        rate: r.calls > 0 ? Math.round((r.interested / r.calls) * 100) : 0,
      }))
      .sort((a, b) => b.calls - a.calls)
  }, [activity, profileMap])

  const outcomeBars = useMemo(() => {
    const max = Math.max(1, ...Object.values(stats.byStatus))
    return Object.keys(OUTCOMES).map((key) => ({
      key,
      meta: OUTCOMES[key],
      count: stats.byStatus[key] || 0,
      pct: ((stats.byStatus[key] || 0) / max) * 100,
    }))
  }, [stats.byStatus])

  return (
    <>
      <div className="stats">
        <div className="stat">
          <div className="num">{stats.conversion.toFixed(1)}%</div>
          <div className="lbl">Tasa de conversión</div>
        </div>
        <div className="stat">
          <div className="num">{stats.total}</div>
          <div className="lbl">Leads totales</div>
        </div>
        <div className="stat">
          <div className="num">{stats.contacted}</div>
          <div className="lbl">Contactados</div>
        </div>
        <div className="stat">
          <div className="num">{activity.length}</div>
          <div className="lbl">Llamadas registradas</div>
        </div>
      </div>

      <div className="content">
        <h2 className="page-heading">Panel del equipo</h2>
        <p className="page-note">Desempeño sobre todos los contactos</p>

        {error && <div className="alert alert-error">{error}</div>}
        {loading ? (
          <div className="spinner" />
        ) : (
          <div className="panel-grid">
            <div className="card">
              <h3 className="card-title">Leads por estado</h3>
              {outcomeBars.map(({ key, meta, count, pct }) => (
                <div className="bar-row" key={key}>
                  <div className="bar-label" style={{ color: meta.color }}>
                    {meta.label}
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${pct}%`, background: meta.color }}
                    />
                  </div>
                  <div className="bar-count">{count}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <h3 className="card-title">Ranking de agentes</h3>
              {agentRows.length === 0 ? (
                <p className="muted">Aún no hay llamadas registradas.</p>
              ) : (
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>Agente</th>
                      <th>Llamadas</th>
                      <th>Leads</th>
                      <th>Interesados</th>
                      <th>Tasa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentRows.map((a) => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600 }}>{a.name}</td>
                        <td>{a.calls}</td>
                        <td>{a.leadCount}</td>
                        <td style={{ color: '#8A5A0E', fontWeight: 700 }}>
                          {a.interested}
                        </td>
                        <td>{a.rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <h3 className="card-title">Actividad reciente</h3>
              {activity.length === 0 ? (
                <p className="muted">Sin actividad de llamadas todavía.</p>
              ) : (
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>Cuándo</th>
                      <th>Agente</th>
                      <th>Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.slice(0, 15).map((a) => {
                      const m = OUTCOMES[a.outcome] || OUTCOMES.pending
                      return (
                        <tr key={a.id}>
                          <td className="muted">
                            {new Date(a.created_at).toLocaleString()}
                          </td>
                          <td>
                            {profileMap[a.agent_id]?.full_name || 'Desconocido'}
                          </td>
                          <td>
                            <span
                              className="badge"
                              style={{ background: m.pillBg, color: m.color }}
                            >
                              {m.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
