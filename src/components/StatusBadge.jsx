import { OUTCOMES } from '../lib/supabase'

export default function StatusBadge({ status }) {
  const meta = OUTCOMES[status] || OUTCOMES.pending
  return (
    <span
      className="badge"
      style={{ background: meta.pillBg, color: meta.color }}
    >
      {meta.label}
    </span>
  )
}
