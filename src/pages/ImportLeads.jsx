import { useMemo, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Papa from 'papaparse'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Lead fields we can import into, with Spanish labels and header synonyms
// used to auto-guess the mapping from the CSV's own column names.
const FIELDS = [
  { key: 'name', label: 'Nombre', required: true, syn: ['name', 'nombre', 'fullname', 'contacto', 'cliente', 'nombrecompleto'] },
  { key: 'phone', label: 'Teléfono', syn: ['phone', 'telefono', 'tel', 'celular', 'movil', 'mobile', 'number', 'numero', 'phonenumber'] },
  { key: 'birth_date', label: 'Fecha de nacimiento', syn: ['birthdate', 'birth', 'dob', 'nacimiento', 'fechanacimiento', 'fechadenacimiento', 'dateofbirth'] },
  { key: 'previous_plan', label: 'Plan anterior', syn: ['previousplan', 'plananterior', 'prevplan', 'planviejo', 'oldplan', 'planprevio'] },
  { key: 'new_plan', label: 'Plan nuevo', syn: ['newplan', 'plannuevo', 'plan', 'planactual'] },
  { key: 'sep', label: 'SEP', syn: ['sep'] },
  { key: 'enroll_date', label: 'Fecha de afiliación', syn: ['enrolldate', 'date', 'fecha', 'fechaafiliacion', 'fechadeafiliacion', 'enrollmentdate', 'effectivedate'] },
  { key: 'enroll_status', label: 'Estatus de afiliación', syn: ['enrollstatus', 'estatus', 'status', 'estatusafiliacion', 'enrollmentstatus'] },
  { key: 'amount', label: 'Monto', adminOnly: true, syn: ['amount', 'monto', 'importe', 'premium', 'prima'] },
  { key: 'hra', label: 'HRA', adminOnly: true, syn: ['hra'] },
  { key: 'notes', label: 'Notas', syn: ['notes', 'notas', 'note', 'nota', 'comentarios', 'comments', 'observaciones'] },
]

const norm = (s) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '')

function guessMapping(headers) {
  const map = {}
  const used = new Set()
  FIELDS.forEach((f) => {
    const hit = headers.find((h) => {
      if (used.has(h)) return false
      const nh = norm(h)
      return f.syn.some((s) => nh === s || nh.includes(s))
    })
    if (hit) {
      map[f.key] = hit
      used.add(hit)
    } else {
      map[f.key] = ''
    }
  })
  return map
}

// Normalize a date cell to YYYY-MM-DD (assumes US M/D/Y for slash dates).
function normDate(v) {
  if (!v) return null
  const s = v.toString().trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const slash = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (slash) {
    let [, m, d, y] = slash
    if (y.length === 2) y = '20' + y
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const t = Date.parse(s)
  if (!isNaN(t)) return new Date(t).toISOString().slice(0, 10)
  return null
}

function parseAmount(v) {
  if (v === null || v === undefined || v === '') return null
  const cleaned = v.toString().replace(/[^0-9.-]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null
  const n = Number(cleaned)
  return isNaN(n) ? null : n
}

// Dedup key: prefer phone (7+ digits), else the lowercased name.
function dedupeKey(name, phone) {
  const digits = (phone || '').replace(/\D/g, '')
  if (digits.length >= 7) return 'p:' + digits
  return 'n:' + (name || '').toLowerCase().trim()
}

export default function ImportLeads() {
  const { isAdmin, loading: authLoading } = useAuth()
  const fileInput = useRef(null)
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])
  const [mapping, setMapping] = useState({})
  const [existingKeys, setExistingKeys] = useState(new Set())
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  function reset() {
    setFileName('')
    setHeaders([])
    setRows([])
    setMapping({})
    setError('')
    setResult(null)
    if (fileInput.current) fileInput.current.value = ''
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setResult(null)
    setFileName(file.name)

    // Load existing leads to dedupe against the current database.
    const { data: existing, error: exErr } = await supabase
      .from('leads')
      .select('name, phone')
    if (exErr) {
      setError(`No se pudieron cargar los contactos existentes: ${exErr.message}`)
      return
    }
    setExistingKeys(
      new Set((existing || []).map((l) => dedupeKey(l.name, l.phone)))
    )

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const cols = (res.meta.fields || []).filter(Boolean)
        if (cols.length === 0) {
          setError('El archivo no tiene encabezados de columna legibles.')
          return
        }
        setHeaders(cols)
        setRows(res.data || [])
        setMapping(guessMapping(cols))
      },
      error: (err) => setError(`Error al leer el CSV: ${err.message}`),
    })
  }

  // Map + classify rows into new / duplicate / invalid using the current mapping.
  const analysis = useMemo(() => {
    if (!rows.length || !mapping.name) {
      return { newRows: [], duplicates: 0, invalid: 0, preview: [] }
    }
    const val = (row, key) => {
      const col = mapping[key]
      if (!col) return ''
      return (row[col] ?? '').toString().trim()
    }
    const seen = new Set(existingKeys)
    const newRows = []
    let duplicates = 0
    let invalid = 0
    const preview = []

    rows.forEach((row) => {
      const name = val(row, 'name')
      const phone = val(row, 'phone')
      let status
      if (!name) {
        invalid++
        status = 'invalid'
      } else {
        const key = dedupeKey(name, phone)
        if (seen.has(key)) {
          duplicates++
          status = 'duplicate'
        } else {
          seen.add(key)
          status = 'new'
          newRows.push({
            lead: {
              name,
              phone: phone || null,
              birth_date: normDate(val(row, 'birth_date')),
              previous_plan: val(row, 'previous_plan') || null,
              new_plan: val(row, 'new_plan') || null,
              sep: val(row, 'sep') || null,
              enroll_date: normDate(val(row, 'enroll_date')),
              enroll_status: val(row, 'enroll_status') || null,
              notes: val(row, 'notes') || null,
            },
            amount: parseAmount(val(row, 'amount')),
            hra: parseAmount(val(row, 'hra')),
          })
        }
      }
      if (preview.length < 25) preview.push({ name, phone, status })
    })
    return { newRows, duplicates, invalid, preview }
  }, [rows, mapping, existingKeys])

  async function doImport() {
    if (!analysis.newRows.length) return
    setImporting(true)
    setError('')
    let inserted = 0
    const CHUNK = 200

    try {
      for (let i = 0; i < analysis.newRows.length; i += CHUNK) {
        const slice = analysis.newRows.slice(i, i + CHUNK)
        const { data, error } = await supabase
          .from('leads')
          .insert(slice.map((r) => r.lead))
          .select('id')
        if (error) throw error

        // Correlate returned ids by input order to write admin-only financials.
        if (isAdmin) {
          const fin = []
          data.forEach((rec, idx) => {
            const src = slice[idx]
            if (src.amount !== null || src.hra !== null) {
              fin.push({ lead_id: rec.id, amount: src.amount, hra: src.hra })
            }
          })
          if (fin.length) {
            const { error: fErr } = await supabase
              .from('lead_financials')
              .upsert(fin)
            if (fErr) throw fErr
          }
        }
        inserted += data.length
      }
      setResult({ inserted, duplicates: analysis.duplicates, invalid: analysis.invalid })
      setRows([])
      setHeaders([])
      setMapping({})
      setFileName('')
      if (fileInput.current) fileInput.current.value = ''
    } catch (err) {
      setError(`Falló la importación tras insertar ${inserted}: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  if (!authLoading && !isAdmin) return <Navigate to="/leads" replace />

  const badge = {
    new: { label: 'Nuevo', bg: '#dff3e6', color: '#1b7a44' },
    duplicate: { label: 'Repetido', bg: '#eee', color: '#777' },
    invalid: { label: 'Sin nombre', bg: '#f5e1dd', color: '#a5493d' },
  }

  return (
    <div className="content">
      <h2 className="page-heading">Importar contactos</h2>
      <p className="page-note">
        Sube un CSV de tu base. Mapea tus columnas a los campos del CRM; los
        repetidos (dentro del archivo y contra los contactos ya cargados) se
        omiten automáticamente.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {result && (
        <div className="alert alert-success">
          Importados <b>{result.inserted}</b> contactos nuevos ·{' '}
          {result.duplicates} repetidos omitidos · {result.invalid} sin nombre
          descartados.
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFile}
            style={{ maxWidth: 320 }}
          />
          {fileName && (
            <>
              <span className="muted" style={{ fontSize: 13 }}>{fileName} · {rows.length} filas</span>
              <button className="btn-secondary" onClick={reset}>Limpiar</button>
            </>
          )}
        </div>
      </div>

      {headers.length > 0 && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 className="card-title">Mapeo de columnas</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 12,
              }}
            >
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label>
                    {f.label}
                    {f.required && <span style={{ color: 'var(--brick)' }}> *</span>}
                    {f.adminOnly && <span className="muted"> (admin)</span>}
                  </label>
                  <select
                    value={mapping[f.key] || ''}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, [f.key]: e.target.value }))
                    }
                  >
                    <option value="">— No importar —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {!mapping.name && (
              <p className="alert alert-error" style={{ marginTop: 12 }}>
                Debes mapear la columna de <b>Nombre</b> para poder importar.
              </p>
            )}
          </div>

          <div className="stats" style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)' }}>
            <div className="stat">
              <div className="num" style={{ color: '#1b7a44' }}>{analysis.newRows.length}</div>
              <div className="lbl">Nuevos a importar</div>
            </div>
            <div className="stat">
              <div className="num" style={{ color: 'var(--ink-soft)' }}>{analysis.duplicates}</div>
              <div className="lbl">Repetidos (omitidos)</div>
            </div>
            <div className="stat">
              <div className="num" style={{ color: 'var(--brick)' }}>{analysis.invalid}</div>
              <div className="lbl">Sin nombre</div>
            </div>
            <div className="stat">
              <div className="num">{rows.length}</div>
              <div className="lbl">Filas en el archivo</div>
            </div>
          </div>

          <div style={{ margin: '16px 0' }}>
            <button
              className="btn-primary"
              disabled={!analysis.newRows.length || importing}
              onClick={doImport}
            >
              {importing
                ? 'Importando…'
                : `Importar ${analysis.newRows.length} contactos nuevos`}
            </button>
          </div>

          <div className="card">
            <h3 className="card-title">Vista previa (primeras 25 filas)</h3>
            <div className="table-wrap" style={{ border: 'none', boxShadow: 'none' }}>
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.preview.map((r, i) => {
                    const b = badge[r.status]
                    return (
                      <tr key={i}>
                        <td>{r.name || <span className="muted">(vacío)</span>}</td>
                        <td className="muted">{r.phone || '—'}</td>
                        <td>
                          <span
                            className="badge"
                            style={{ background: b.bg, color: b.color }}
                          >
                            {b.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
