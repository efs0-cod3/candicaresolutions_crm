import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const EMPTY = {
  name: '',
  phone: '',
  previous_plan: '',
  new_plan: '',
  sep: '',
  enroll_date: '',
  enroll_status: '',
  amount: '',
  hra: '',
  notes: '',
}

// Modal for adding a new lead or editing an existing one.
// `lead` = null → create; otherwise edit. Calls onSaved() after success.
export default function LeadModal({ lead, onClose, onSaved }) {
  const { user } = useAuth()
  const isNew = !lead
  const [form, setForm] = useState(() =>
    isNew
      ? { ...EMPTY }
      : {
          name: lead.name || '',
          phone: lead.phone || '',
          previous_plan: lead.previous_plan || '',
          new_plan: lead.new_plan || '',
          sep: lead.sep || '',
          enroll_date: lead.enroll_date || '',
          enroll_status: lead.enroll_status || '',
          amount: lead.amount ?? '',
          hra: lead.hra ?? '',
          notes: lead.notes || '',
        }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    setSaving(true)
    setError('')

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      previous_plan: form.previous_plan.trim() || null,
      new_plan: form.new_plan.trim() || null,
      sep: form.sep.trim() || null,
      enroll_date: form.enroll_date || null,
      enroll_status: form.enroll_status.trim() || null,
      amount: form.amount === '' ? null : Number(form.amount),
      hra: form.hra === '' ? null : Number(form.hra),
      notes: form.notes.trim() || null,
    }

    let res
    if (isNew) {
      // created_by is stamped by the stamp_created_by trigger.
      res = await supabase.from('leads').insert(payload)
    } else {
      res = await supabase
        .from('leads')
        .update({ ...payload, updated_by: user.id, updated_at: new Date().toISOString() })
        .eq('id', lead.id)
    }

    if (res.error) {
      setError(res.error.message)
      setSaving(false)
      return
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div
      className="modal-bg"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal">
        <h3 className="display">
          {isNew ? 'Agregar contacto' : 'Editar contacto'}
        </h3>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="field">
          <label>Nombre</label>
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            autoFocus
          />
        </div>
        <div className="field">
          <label>Teléfono</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>
        <div className="field">
          <label>Plan anterior</label>
          <input
            value={form.previous_plan}
            onChange={(e) => set('previous_plan', e.target.value)}
          />
        </div>
        <div className="field">
          <label>Plan nuevo</label>
          <input
            value={form.new_plan}
            onChange={(e) => set('new_plan', e.target.value)}
          />
        </div>
        <div className="field">
          <label>SEP</label>
          <input value={form.sep} onChange={(e) => set('sep', e.target.value)} />
        </div>
        <div className="field">
          <label>Fecha de afiliación</label>
          <input
            type="date"
            value={form.enroll_date}
            onChange={(e) => set('enroll_date', e.target.value)}
          />
        </div>
        <div className="field">
          <label>Estatus de afiliación</label>
          <input
            value={form.enroll_status}
            onChange={(e) => set('enroll_status', e.target.value)}
            placeholder="Approved, Pending…"
          />
        </div>
        <div className="field">
          <label>Monto</label>
          <input
            type="number"
            step="0.01"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
          />
        </div>
        <div className="field">
          <label>HRA</label>
          <input
            type="number"
            step="0.01"
            value={form.hra}
            onChange={(e) => set('hra', e.target.value)}
          />
        </div>
        <div className="field">
          <label>Notas</label>
          <input
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
