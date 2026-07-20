import { createClient } from '@supabase/supabase-js'

// Public client-side credentials. The publishable/anon key is safe to expose in
// the browser bundle — access is still governed by Row Level Security.
// Values come from .env (VITE_*), with a fallback so the app runs out of the box.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://gtuknjbftbmkenfwqlsp.supabase.co'
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_BsiUH6rbCjVh3l37dCoQVw_nUaHTuBH'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Human-friendly labels + colors for each call outcome / status.
export const OUTCOMES = {
  pending: { label: 'Pending', color: '#64748b', short: 'Pending' },
  interested: { label: 'Interested', color: '#16a34a', short: 'Interested' },
  notinterested: { label: 'Not interested', color: '#dc2626', short: 'Not int.' },
  noanswer: { label: 'No answer', color: '#d97706', short: 'No answer' },
  callback: { label: 'Call back', color: '#2563eb', short: 'Callback' },
  voicemail: { label: 'Voicemail', color: '#7c3aed', short: 'Voicemail' },
}

// Outcomes an agent can log from call mode (everything except the initial "pending").
export const CALL_OUTCOMES = [
  'interested',
  'notinterested',
  'noanswer',
  'callback',
  'voicemail',
]
