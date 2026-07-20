import { OUTCOMES } from '../lib/supabase'

export default function StatusBadge({ status }) {
  const meta = OUTCOMES[status] || OUTCOMES.pending
  return (
    <span
      className="badge"
      style={{ background: `${meta.color}18`, color: meta.color }}
    >
      <span className="badge-dot" style={{ background: meta.color }} />
      {meta.label}
    </span>
  )
}
