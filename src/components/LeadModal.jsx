import { useState } from 'react'
import { supabase, STAGES, STAGE_ORDER } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../i18n'

const EMPTY = {
  name: '',
  stage: 'lead',
  phone: '',
  birth_date: '',
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
// Amount / HRA fields are shown and saved only for admins; they live in the
// admin-only `lead_financials` table.
export default function LeadModal({ lead, onClose, onSaved }) {
  const { isAdmin } = useAuth()
  const { t } = useLang()
  const isNew = !lead
  const [form, setForm] = useState(() =>
    isNew
      ? { ...EMPTY }
      : {
          name: lead.name || '',
          stage: lead.stage || 'lead',
          phone: lead.phone || '',
          birth_date: lead.birth_date || '',
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

  // Upsert the admin-only financial row for a given lead id.
  async function saveFinancials(leadId) {
    const amount = form.amount === '' ? null : Number(form.amount)
    const hra = form.hra === '' ? null : Number(form.hra)
    return supabase.from('lead_financials').upsert({
      lead_id: leadId,
      amount,
      hra,
      updated_at: new Date().toISOString(),
    })
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError(t('El nombre es obligatorio.'))
      return
    }
    setSaving(true)
    setError('')

    const payload = {
      name: form.name.trim(),
      stage: form.stage,
      phone: form.phone.trim() || null,
      birth_date: form.birth_date || null,
      previous_plan: form.previous_plan.trim() || null,
      new_plan: form.new_plan.trim() || null,
      sep: form.sep.trim() || null,
      enroll_date: form.enroll_date || null,
      enroll_status: form.enroll_status.trim() || null,
      notes: form.notes.trim() || null,
    }

    let leadId = lead?.id
    if (isNew) {
      // created_by is stamped by the stamp_created_by trigger.
      const { data, error } = await supabase
        .from('leads')
        .insert(payload)
        .select('id')
        .single()
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
      leadId = data.id
    } else {
      const { error } = await supabase
        .from('leads')
        .update(payload)
        .eq('id', lead.id)
      if (error) {
        setError(error.message)
        setSaving(false)
        return
      }
    }

    // Only admins can read/write financials.
    if (isAdmin) {
      const { error } = await saveFinancials(leadId)
      if (error) {
        setError(`Contacto guardado, pero falló guardar el monto: ${error.message}`)
        setSaving(false)
        return
      }
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
          {isNew ? t('Agregar contacto') : t('Editar contacto')}
        </h3>

        {error && <div className="alert alert-error">{error}</div>}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSave()
          }}
        >
        <div className="field">
          <label>{t('Nombre')}</label>
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            autoFocus
          />
        </div>
        <div className="field">
          <label>{t('Etapa')}</label>
          <select value={form.stage} onChange={(e) => set('stage', e.target.value)}>
            {STAGE_ORDER.map((s) => (
              <option key={s} value={s}>{STAGES[s]}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{t('Teléfono')}</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>
        <div className="field">
          <label>{t('Fecha de nacimiento')}</label>
          <input
            type="date"
            value={form.birth_date}
            onChange={(e) => set('birth_date', e.target.value)}
          />
        </div>
        <div className="field">
          <label>{t('Plan anterior')}</label>
          <input
            value={form.previous_plan}
            onChange={(e) => set('previous_plan', e.target.value)}
          />
        </div>
        <div className="field">
          <label>{t('Plan nuevo')}</label>
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
          <label>{t('Fecha de afiliación')}</label>
          <input
            type="date"
            value={form.enroll_date}
            onChange={(e) => set('enroll_date', e.target.value)}
          />
        </div>
        <div className="field">
          <label>{t('Estatus de afiliación')}</label>
          <input
            value={form.enroll_status}
            onChange={(e) => set('enroll_status', e.target.value)}
            placeholder={t('Approved, Pending…')}
          />
        </div>

        {isAdmin && (
          <>
            <div className="field">
              <label>{t('Monto')}</label>
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
          </>
        )}

        <div className="field">
          <label>{t('Notas')}</label>
          <input
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            {t('Cancelar')}
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? t('Guardando…') : t('Guardar')}
          </button>
        </div>
        </form>
      </div>
    </div>
  )
}
