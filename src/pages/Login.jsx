import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { session, loading: authLoading } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  if (!authLoading && session) {
    return <Navigate to="/leads" replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        })
        if (error) throw error
        if (!data.session) {
          setInfo(
            'Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.'
          )
          setMode('signin')
        }
      }
    } catch (err) {
      setError(traducirError(err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-eyebrow">Seguimiento de afiliaciones</div>
        <h1 className="auth-title display">Central de Llamadas</h1>
        <p className="auth-sub">
          {mode === 'signin'
            ? 'Inicia sesión para trabajar tus contactos.'
            : 'Solo puedes registrarte si un administrador invitó tu correo.'}
        </p>

        {error && <div className="alert alert-error">{error}</div>}
        {info && <div className="alert alert-success">{info}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="field">
              <label htmlFor="fullName">Nombre completo</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ana Pérez"
                required
                autoComplete="name"
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Correo</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@candicare.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete={
                mode === 'signin' ? 'current-password' : 'new-password'
              }
            />
          </div>

          <button
            type="submit"
            className="btn-primary btn-block"
            disabled={loading}
          >
            {loading
              ? 'Un momento…'
              : mode === 'signin'
                ? 'Iniciar sesión'
                : 'Crear cuenta'}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === 'signin' ? (
            <>
              ¿Tienes una invitación?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup')
                  setError('')
                  setInfo('')
                }}
              >
                Crea tu cuenta
              </button>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signin')
                  setError('')
                  setInfo('')
                }}
              >
                Inicia sesión
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function traducirError(msg = '') {
  const m = msg.toLowerCase()
  if (
    m.includes('not_invited') ||
    m.includes('not on the invite') ||
    m.includes('database error saving new user')
  )
    return 'Este correo no tiene una invitación. Pídele al administrador que te invite.'
  if (m.includes('invalid login credentials'))
    return 'Correo o contraseña incorrectos.'
  if (m.includes('already registered') || m.includes('already exists'))
    return 'Ese correo ya está registrado. Inicia sesión.'
  if (m.includes('password'))
    return 'La contraseña debe tener al menos 6 caracteres.'
  return msg || 'Algo salió mal. Intenta de nuevo.'
}
