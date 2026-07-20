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

// Labels (Spanish) + palette for each call outcome / status.
// color = text/dot color, pillBg = badge background, btnBg/btnColor = call-mode button.
export const OUTCOMES = {
  pending: {
    label: 'Sin llamar',
    color: '#6E7C90',
    pillBg: '#E7EBF0',
  },
  interested: {
    label: 'Interesado',
    color: '#8A5A0E',
    pillBg: '#FBEAD2',
    btnBg: '#D98E2B',
    btnColor: '#2A1B04',
  },
  notinterested: {
    label: 'No interesado',
    color: '#A5493D',
    pillBg: '#F5E1DD',
    btnBg: '#A5493D',
    btnColor: '#FFFFFF',
  },
  noanswer: {
    label: 'No contestó',
    color: '#777777',
    pillBg: '#EEEEEE',
    btnBg: '#DDDDDD',
    btnColor: '#333333',
  },
  callback: {
    label: 'Volver a llamar',
    color: '#2C6A72',
    pillBg: '#E4EEF0',
    btnBg: '#2C6A72',
    btnColor: '#FFFFFF',
  },
  voicemail: {
    label: 'Buzón de voz',
    color: '#6A4EA6',
    pillBg: '#EFEAF7',
    btnBg: '#6A4EA6',
    btnColor: '#FFFFFF',
  },
}

// Outcomes an agent can log from call mode (everything except the initial "pending").
export const CALL_OUTCOMES = [
  'interested',
  'notinterested',
  'noanswer',
  'callback',
  'voicemail',
]
