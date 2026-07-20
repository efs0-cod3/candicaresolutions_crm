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

  // Per-agent performance from call_activity (who worked which lead).
  const agentRows = useMemo(() => {
    const rows = {}
    activity.forEach((a) => {
      const id = a.agent_id
      if (!rows[id]) {
        rows[id] = { id, calls: 0, interested: 0, leads: new Set() }
      }
      rows[id].calls += 1
      rows[id].leads.add(a.lead_id)
      if (a.outcome === 'interested') rows[id].interested += 1
    })
    return Object.values(rows)
      .map((r) => ({
        ...r,
        leadCount: r.leads.size,
        name: profileMap[r.id]?.full_name || 'Unknown agent',
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

  if (loading) return <div className="spinner" />

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Team performance across all leads</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stat-grid">
        <div className="stat-tile">
          <div className="stat-label">Conversion rate</div>
          <div className="stat-value" style={{ color: '#16a34a' }}>
            {stats.conversion.toFixed(1)}%
          </div>
          <div className="stat-sub">
            {stats.interested} interested of {stats.contacted} contacted
          </div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Total leads</div>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-sub">{stats.byStatus.pending || 0} still pending</div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Contacted</div>
          <div className="stat-value">{stats.contacted}</div>
          <div className="stat-sub">
            {stats.total > 0
              ? Math.round((stats.contacted / stats.total) * 100)
              : 0}
            % of all leads
          </div>
        </div>
        <div className="stat-tile">
          <div className="stat-label">Calls logged</div>
          <div className="stat-value">{activity.length}</div>
          <div className="stat-sub">{agentRows.length} active agent(s)</div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
        }}
      >
        <div className="card card-pad">
          <h3 className="section-title">Leads by status</h3>
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

        <div className="card card-pad">
          <h3 className="section-title">Agent leaderboard</h3>
          {agentRows.length === 0 ? (
            <p className="muted">No calls logged yet.</p>
          ) : (
            <div className="table-wrap" style={{ border: 'none', boxShadow: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Calls</th>
                    <th>Leads</th>
                    <th>Interested</th>
                    <th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {agentRows.map((a) => (
                    <tr key={a.id}>
                      <td className="lead-name">{a.name}</td>
                      <td>{a.calls}</td>
                      <td>{a.leadCount}</td>
                      <td style={{ color: '#16a34a', fontWeight: 700 }}>
                        {a.interested}
                      </td>
                      <td>{a.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card card-pad" style={{ marginTop: '1.25rem' }}>
        <h3 className="section-title">Recent activity</h3>
        {activity.length === 0 ? (
          <p className="muted">No call activity yet.</p>
        ) : (
          <div className="table-wrap" style={{ border: 'none', boxShadow: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Agent</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {activity.slice(0, 15).map((a) => {
                  const meta = OUTCOMES[a.outcome] || OUTCOMES.pending
                  return (
                    <tr key={a.id}>
                      <td className="muted">
                        {new Date(a.created_at).toLocaleString()}
                      </td>
                      <td>{profileMap[a.agent_id]?.full_name || 'Unknown'}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: `${meta.color}18`,
                            color: meta.color,
                          }}
                        >
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
