import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../i18n'

const PAGE_SIZE = 25

// Field name → Spanish label (wrapped with t() at render).
const FIELD_LABELS = {
  name: 'Nombre',
  phone: 'Teléfono',
  birth_date: 'Fecha de nacimiento',
  stage: 'Etapa',
  previous_plan: 'Plan anterior',
  new_plan: 'Plan nuevo',
  sep: 'SEP',
  enroll_date: 'Fecha de afiliación',
  enroll_status: 'Estatus de afiliación',
  call_status: 'Estado de llamada',
  notes: 'Notas',
  assigned_to: 'Asignado a',
  amount: 'Monto',
  hra: 'HRA',
  deleted: 'Eliminado',
}

export default function AuditLog() {
  const { isAdmin, loading: authLoading } = useAuth()
  const { t } = useLang()
  const [rows, setRows] = useState([])
  const [profiles, setProfiles] = useState([])
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [fieldFilter, setFieldFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (authLoading || !isAdmin) return
    ;(async () => {
      setLoading(true)
      const [aRes, pRes, lRes] = await Promise.all([
        supabase
          .from('audit_log')
          .select('id, table_name, record_id, changed_by, field_name, old_value, new_value, changed_at')
          .order('changed_at', { ascending: false })
          .limit(500),
        supabase.from('profiles').select('id, full_name'),
        supabase.from('leads').select('id, name'),
      ])
      if (aRes.error) setError(aRes.error.message)
      setRows(aRes.data || [])
      setProfiles(pRes.data || [])
      setLeads(lRes.data || [])
      setLoading(false)
    })()
  }, [authLoading, isAdmin])

  const profileMap = useMemo(() => {
    const m = {}
    profiles.forEach((p) => (m[p.id] = p.full_name))
    return m
  }, [profiles])
  const leadMap = useMemo(() => {
    const m = {}
    leads.forEach((l) => (m[l.id] = l.name))
    return m
  }, [leads])

  const fields = useMemo(
    () => [...new Set(rows.map((r) => r.field_name))].sort(),
    [rows]
  )

  // Map uuid-looking values to a person's name (for assigned_to, etc.).
  const showValue = (v) => {
    if (v === null || v === undefined || v === '') return '—'
    return profileMap[v] || v
  }
  const recordName = (r) =>
    r.field_name === 'deleted'
      ? r.old_value
      : leadMap[r.record_id] || `${r.table_name} · ${String(r.record_id).slice(0, 8)}`

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (fieldFilter !== 'all' && r.field_name !== fieldFilter) return false
      if (q) {
        const hay = [
          profileMap[r.changed_by],
          recordName(r),
          r.old_value,
          r.new_value,
        ]
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, fieldFilter, search, profileMap, leadMap])

  useEffect(() => setPage(1), [fieldFilter, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  if (!authLoading && !isAdmin) return <Navigate to="/leads" replace />

  return (
    <div className="content">
      <h2 className="page-heading">{t('Auditoría')}</h2>
      <p className="page-note">
        {t('Registro de cambios: quién modificó qué y cuándo. Solo administradores.')}
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="filters">
        <input
          type="text"
          placeholder={t('Buscar por persona, contacto o valor…')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="chip" value={fieldFilter} onChange={(e) => setFieldFilter(e.target.value)}>
          <option value="all">{t('Todos los campos')}</option>
          {fields.map((f) => (
            <option key={f} value={f}>{t(FIELD_LABELS[f] || f)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : filtered.length === 0 ? (
        <div className="empty">{t('Sin registros de auditoría.')}</div>
      ) : (
        <>
          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="mini-table">
              <thead>
                <tr>
                  <th>{t('Cuándo')}</th>
                  <th>{t('Quién')}</th>
                  <th>{t('Registro')}</th>
                  <th>{t('Campo')}</th>
                  <th>{t('Antes')}</th>
                  <th>{t('Después')}</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => (
                  <tr key={r.id}>
                    <td className="muted" style={{ whiteSpace: 'nowrap' }}>
                      {new Date(r.changed_at).toLocaleString()}
                    </td>
                    <td>{profileMap[r.changed_by] || t('Sistema')}</td>
                    <td style={{ fontWeight: 600 }}>{recordName(r)}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background: r.field_name === 'deleted' ? 'var(--brick-soft)' : 'var(--slate-soft)',
                          color: r.field_name === 'deleted' ? 'var(--brick)' : 'var(--slate)',
                        }}
                      >
                        {t(FIELD_LABELS[r.field_name] || r.field_name)}
                      </span>
                    </td>
                    <td className="muted">{showValue(r.old_value)}</td>
                    <td>{showValue(r.new_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pager">
            <span className="pager-info">
              {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filtered.length)} {t('de')} {filtered.length}
            </span>
            <div className="pager-controls">
              <button className="btn-secondary" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                {t('← Anterior')}
              </button>
              <span className="pager-page">
                {t('Página')} {safePage} {t('de')} {pageCount}
              </span>
              <button className="btn-secondary" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)}>
                {t('Siguiente →')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
