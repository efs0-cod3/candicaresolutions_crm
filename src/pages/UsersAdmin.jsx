import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function fmtDate(v) {
  return v ? new Date(v).toLocaleDateString() : '—'
}

export default function UsersAdmin() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const [invites, setInvites] = useState([])
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [copied, setCopied] = useState(false)

  async function load() {
    setLoading(true)
    const [invRes, teamRes] = await Promise.all([
      supabase
        .from('allowed_signups')
        .select('email, accepted, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, role').order('full_name'),
    ])
    if (invRes.error) setError(invRes.error.message)
    setInvites(invRes.data || [])
    setTeam(teamRes.data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!authLoading && isAdmin) load()
  }, [authLoading, isAdmin])

  const pending = useMemo(() => invites.filter((i) => !i.accepted), [invites])
  const accepted = useMemo(() => invites.filter((i) => i.accepted), [invites])

  async function invite(e) {
    e.preventDefault()
    setError('')
    setOk('')
    const clean = email.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) {
      setError('Correo no válido.')
      return
    }
    setInviting(true)
    const { error } = await supabase
      .from('allowed_signups')
      .insert({ email: clean, invited_by: user.id })
    setInviting(false)
    if (error) {
      setError(
        error.message.includes('duplicate')
          ? 'Ese correo ya estaba invitado.'
          : error.message
      )
      return
    }
    setOk(`Invitación creada para ${clean}. Ya puede registrarse con ese correo.`)
    setEmail('')
    load()
  }

  async function removeInvite(em) {
    const { error } = await supabase.from('allowed_signups').delete().eq('email', em)
    if (error) setError(error.message)
    else setInvites((prev) => prev.filter((i) => i.email !== em))
  }

  async function setRole(id, role) {
    setTeam((prev) => prev.map((t) => (t.id === id ? { ...t, role } : t)))
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (error) {
      setError(error.message)
      load()
    }
  }

  function copyLink() {
    navigator.clipboard?.writeText(window.location.origin).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!authLoading && !isAdmin) return <Navigate to="/leads" replace />

  return (
    <div className="content">
      <h2 className="page-heading">Usuarios</h2>
      <p className="page-note">
        El registro es <b>solo por invitación</b>. Autoriza un correo aquí y esa
        persona podrá crear su cuenta; nadie más puede registrarse.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {ok && <div className="alert alert-success">{ok}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="card-title">Invitar a un usuario</h3>
        <form onSubmit={invite} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ flex: '1 1 240px' }}
          />
          <button className="add-btn" type="submit" disabled={inviting}>
            {inviting ? 'Invitando…' : 'Invitar'}
          </button>
          <button type="button" className="btn-secondary" onClick={copyLink}>
            {copied ? '¡Enlace copiado!' : 'Copiar enlace de registro'}
          </button>
        </form>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 10, marginBottom: 0 }}>
          Pásale a la persona el enlace de la app; se registra con el correo que autorizaste.
        </p>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : (
        <div className="panel-grid">
          <div className="card">
            <h3 className="card-title">Invitaciones pendientes ({pending.length})</h3>
            {pending.length === 0 ? (
              <p className="muted">No hay invitaciones pendientes.</p>
            ) : (
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Correo</th>
                    <th>Invitado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((i) => (
                    <tr key={i.email}>
                      <td>{i.email}</td>
                      <td className="muted">{fmtDate(i.created_at)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="icon-btn danger"
                          title="Revocar invitación"
                          onClick={() => removeInvite(i.email)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h3 className="card-title">Equipo ({team.length})</h3>
            {team.length === 0 ? (
              <p className="muted">Sin usuarios todavía.</p>
            ) : (
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Rol</th>
                  </tr>
                </thead>
                <tbody>
                  {team.map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>
                        {t.full_name}
                        {t.id === user.id && <span className="muted"> (tú)</span>}
                      </td>
                      <td>
                        <select
                          value={t.role}
                          onChange={(e) => setRole(t.id, e.target.value)}
                          style={{ width: 'auto', minWidth: 110 }}
                          disabled={t.id === user.id}
                        >
                          <option value="agent">Agente</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {accepted.length > 0 && (
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <h3 className="card-title">Invitaciones ya usadas ({accepted.length})</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {accepted.map((i) => (
                  <span key={i.email} className="badge" style={{ background: '#dff3e6', color: '#1b7a44' }}>
                    {i.email}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
