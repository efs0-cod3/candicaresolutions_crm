import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, OUTCOMES } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'
import { IconPhone } from '../components/Icons'

function money(v) {
  if (v === null || v === undefined || v === '') return '—'
  return `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 0 })}`
}

export default function Leads() {
  const [leads, setLeads] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [agentFilter, setAgentFilter] = useState('all')

  async function load() {
    setLoading(true)
    setError('')
    const [leadsRes, profilesRes] = await Promise.all([
      supabase
        .from('leads')
        .select(
          'id, name, previous_plan, new_plan, sep, enroll_date, enroll_status, amount, hra, call_status, notes, assigned_to, updated_at'
        )
        .order('updated_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, role'),
    ])
    if (leadsRes.error) setError(leadsRes.error.message)
    setLeads(leadsRes.data || [])
    setProfiles(profilesRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const profileMap = useMemo(() => {
    const m = {}
    profiles.forEach((p) => (m[p.id] = p))
    return m
  }, [profiles])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return leads.filter((l) => {
      if (statusFilter !== 'all' && l.call_status !== statusFilter) return false
      if (agentFilter !== 'all') {
        if (agentFilter === 'unassigned' && l.assigned_to) return false
        if (agentFilter !== 'unassigned' && l.assigned_to !== agentFilter)
          return false
      }
      if (q && !(l.name || '').toLowerCase().includes(q)) return false
      return true
    })
  }, [leads, search, statusFilter, agentFilter])

  const statusCounts = useMemo(() => {
    const c = {}
    leads.forEach((l) => {
      c[l.call_status] = (c[l.call_status] || 0) + 1
    })
    return c
  }, [leads])

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">
            {leads.length} contacts · {statusCounts.pending || 0} still pending
          </p>
        </div>
        <Link to="/call" className="btn btn-primary">
          <IconPhone width={16} height={16} />
          Start calling
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filters">
        <div className="filter-field grow">
          <label>Search</label>
          <input
            type="text"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-field">
          <label>Call status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            {Object.entries(OUTCOMES).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-field">
          <label>Assigned to</label>
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
          >
            <option value="all">Anyone</option>
            <option value="unassigned">Unassigned</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : filtered.length === 0 ? (
        <div className="card card-pad empty">
          <div className="empty-icon">🔍</div>
          No leads match your filters.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Plan change</th>
                <th>SEP</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Assigned to</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id}>
                  <td className="lead-name">{l.name}</td>
                  <td className="muted">
                    {l.previous_plan || '—'}
                    {' → '}
                    {l.new_plan || '—'}
                  </td>
                  <td className="muted">{l.sep || '—'}</td>
                  <td>{money(l.amount)}</td>
                  <td>
                    <StatusBadge status={l.call_status} />
                  </td>
                  <td className="muted">
                    {l.assigned_to
                      ? profileMap[l.assigned_to]?.full_name || 'Unknown'
                      : '—'}
                  </td>
                  <td className="muted">
                    {l.updated_at
                      ? new Date(l.updated_at).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
