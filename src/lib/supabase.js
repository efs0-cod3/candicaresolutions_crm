import { createClient } from '@supabase/supabase-js'

// Public client-side credentials, provided via Vite env vars (see .env.example).
// The publishable key is safe to expose in the browser bundle — access is still
// governed by Row Level Security.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_K

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan las variables de entorno VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_K.'
  )
}

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
