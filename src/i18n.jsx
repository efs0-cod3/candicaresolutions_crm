import { createContext, useContext, useState, useCallback } from 'react'

// Spanish is the source language (keys are the Spanish strings). The EN map
// below provides English translations; anything missing falls back to Spanish.
const EN = {
  // Brand / chrome
  'Seguimiento de afiliaciones': 'Enrollment tracking',
  Salir: 'Sign out',
  // Tabs
  Lista: 'List',
  'Modo Llamada': 'Call Mode',
  Panel: 'Dashboard',
  Tareas: 'Tasks',
  Montos: 'Amounts',
  Importar: 'Import',
  Usuarios: 'Users',

  // Auth / login
  'Inicia sesión para trabajar tus contactos.': 'Sign in to work your contacts.',
  'Solo puedes registrarte si un administrador invitó tu correo.':
    'You can only register if an admin invited your email.',
  'Nombre completo': 'Full name',
  Correo: 'Email',
  Contraseña: 'Password',
  'Un momento…': 'One moment…',
  'Iniciar sesión': 'Sign in',
  'Crear cuenta': 'Create account',
  '¿Tienes una invitación?': 'Have an invitation?',
  'Crea tu cuenta': 'Create your account',
  '¿Ya tienes cuenta?': 'Already have an account?',
  'Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.':
    'Account created. Check your email to confirm, then sign in.',
  'Este correo no tiene una invitación. Pídele al administrador que te invite.':
    'This email has no invitation. Ask an admin to invite you.',
  'Correo o contraseña incorrectos.': 'Incorrect email or password.',
  'Ese correo ya está registrado. Inicia sesión.':
    'That email is already registered. Sign in.',
  'La contraseña debe tener al menos 6 caracteres.':
    'Password must be at least 6 characters.',
  'Algo salió mal. Intenta de nuevo.': 'Something went wrong. Try again.',

  // Stats
  'Total {stage}': 'Total {stage}',
  Contactados: 'Contacted',
  Interesados: 'Interested',
  'Tasa de interés': 'Interest rate',
  'Leads totales': 'Total leads',
  'Llamadas registradas': 'Calls logged',

  // Filters / list
  'Buscar por nombre…': 'Search by name…',
  'Todos los estados': 'All statuses',
  'Todos los SEP': 'All SEPs',
  'Todos los planes': 'All plans',
  'Todos los años': 'All years',
  'Todos los meses': 'All months',
  'Nombre (A→Z)': 'Name (A→Z)',
  'Nombre (Z→A)': 'Name (Z→A)',
  'Fecha de entrada (reciente)': 'Entry date (newest)',
  'Fecha de entrada (antigua)': 'Entry date (oldest)',
  Tarjetas: 'Cards',
  'Agregar contacto': 'Add contact',
  'No hay leads que coincidan con el filtro.': 'No leads match the filter.',
  Ver: 'Show',
  'por página': 'per page',
  '← Anterior': '← Previous',
  'Siguiente →': 'Next →',
  Página: 'Page',
  de: 'of',
  'Fecha de afiliación': 'Enrollment date',
  Interesado: 'Interested',
  'Sin teléfono': 'No phone',
  '¿Eliminar este contacto?': 'Delete this contact?',
  'Solo un administrador puede eliminar contactos.':
    'Only an admin can delete contacts.',

  // Call statuses (OUTCOMES labels)
  'Sin llamar': 'Not called',
  'No interesado': 'Not interested',
  'No contestó': 'No answer',
  'Volver a llamar': 'Call back',
  'Buzón de voz': 'Voicemail',

  // Lead modal
  'Agregar contacto': 'Add contact',
  'Editar contacto': 'Edit contact',
  Nombre: 'Name',
  Etapa: 'Stage',
  Teléfono: 'Phone',
  'Fecha de nacimiento': 'Date of birth',
  'Plan anterior': 'Previous plan',
  'Plan nuevo': 'New plan',
  'Estatus de afiliación': 'Enrollment status',
  Monto: 'Amount',
  Notas: 'Notes',
  Cancelar: 'Cancel',
  Guardar: 'Save',
  'Guardando…': 'Saving…',
  'El nombre es obligatorio.': 'Name is required.',
  'Approved, Pending…': 'Approved, Pending…',

  // Call mode
  'Un contacto a la vez · {n} registrados en esta sesión':
    'One contact at a time · {n} logged this session',
  'Solo pendientes': 'Pending only',
  'Todos los abiertos (con seguimiento)': 'All open (with follow-up)',
  '¡Terminaste la ronda! 🎉': 'You finished the round! 🎉',
  'Trabajaste {n} en esta sesión.': 'You worked {n} this session.',
  'No quedan contactos en esta cola.': 'No contacts left in this queue.',
  'Recargar cola': 'Reload queue',
  'Ver panel': 'View dashboard',
  Contacto: 'Contact',
  Afiliación: 'Enrollment',
  Nacimiento: 'Birth',
  'Notas de la llamada…': 'Call notes…',
  'Saltar por ahora →': 'Skip for now →',
  'No se pudo registrar la llamada: {e}': 'Could not log the call: {e}',

  // Dashboard
  'Panel del equipo': 'Team dashboard',
  'Desempeño sobre todos los contactos': 'Performance across all contacts',
  '🎂 Cumpleaños de hoy ({n})': "🎂 Today's birthdays ({n})",
  'Nadie cumple años hoy.': 'No birthdays today.',
  'Leads por estado': 'Leads by status',
  'Ranking de agentes': 'Agent ranking',
  'Aún no hay llamadas registradas.': 'No calls logged yet.',
  Agente: 'Agent',
  Llamadas: 'Calls',
  Leads: 'Leads',
  Tasa: 'Rate',
  'Actividad reciente': 'Recent activity',
  'Sin actividad de llamadas todavía.': 'No call activity yet.',
  Cuándo: 'When',
  Resultado: 'Outcome',
  Desconocido: 'Unknown',

  // Tasks
  'Asigna tareas a tus agentes y sigue su avance.':
    'Assign tasks to your agents and track progress.',
  'Tus tareas asignadas. Márcalas como hechas al completarlas.':
    'Your assigned tasks. Check them off when done.',
  'Asignar una tarea': 'Assign a task',
  Título: 'Title',
  'Llamar lista FEMA': 'Call FEMA list',
  'Asignar a': 'Assign to',
  '— Elegir —': '— Choose —',
  'Fecha límite (opcional)': 'Due date (optional)',
  'Detalles (opcional)': 'Details (optional)',
  'Notas o instrucciones…': 'Notes or instructions…',
  'Asignar tarea': 'Assign task',
  'Asignando…': 'Assigning…',
  'Escribe un título y elige a quién asignar.':
    'Enter a title and choose who to assign.',
  'Pendientes ({n})': 'Pending ({n})',
  'No hay tareas pendientes.': 'No pending tasks.',
  'Completadas ({n})': 'Completed ({n})',
  Vencida: 'Overdue',
  Hoy: 'Today',

  // Notifications
  'Recordatorios de tareas': 'Task reminders',
  'Sin tareas vencidas o para hoy 🎉': 'No overdue or due-today tasks 🎉',
  'Ver todas las tareas →': 'View all tasks →',
  'Activar notificaciones del navegador': 'Enable browser notifications',
  'Notificaciones del navegador bloqueadas (actívalas en el navegador).':
    'Browser notifications blocked (enable them in your browser).',
  'Nueva tarea asignada': 'New task assigned',
  'Recordatorio de tareas': 'Task reminder',

  // Users admin
  Invitar: 'Invite',
  'Invitando…': 'Inviting…',
  'Invitar a un usuario': 'Invite a user',
  'Copiar enlace de registro': 'Copy registration link',
  '¡Enlace copiado!': 'Link copied!',
  'Invitaciones pendientes ({n})': 'Pending invitations ({n})',
  'No hay invitaciones pendientes.': 'No pending invitations.',
  'Equipo ({n})': 'Team ({n})',
  'Sin usuarios todavía.': 'No users yet.',
  Rol: 'Role',
  Admin: 'Admin',
  'Correo no válido.': 'Invalid email.',
  'Ese correo ya estaba invitado.': 'That email was already invited.',
  'Invitaciones ya usadas ({n})': 'Used invitations ({n})',

  // Import
  'Importar contactos': 'Import contacts',
  'Etapa para los importados': 'Stage for imported',
  'Mapeo de columnas': 'Column mapping',
  '— No importar —': '— Don’t import —',
  Limpiar: 'Clear',
  'Nuevos a importar': 'New to import',
  'Repetidos (omitidos)': 'Duplicates (skipped)',
  'Sin nombre': 'No name',
  'Filas en el archivo': 'Rows in file',
  'Importar {n} contactos nuevos': 'Import {n} new contacts',
  'Importando…': 'Importing…',
  'Vista previa (primeras 25 filas)': 'Preview (first 25 rows)',
  Nuevo: 'New',
  Repetido: 'Duplicate',
  Estado: 'Status',

  // Amounts
  'Ingresos por mes': 'Income by month',
  'Monto total': 'Total amount',
  'HRA total': 'Total HRA',
  'Usuarios ingresados': 'Users enrolled',
  'Meses con producción': 'Months with production',
  Mes: 'Month',
  Usuarios: 'Users',
  Total: 'Total',
  Usuario: 'User',
  Plan: 'Plan',
  'No hay ingresos que coincidan con los filtros.':
    'No income matches the filters.',
  'Sin fecha': 'No date',
  'Usuarios ingresados y montos generados, agrupados por mes de afiliación · solo administradores':
    'Enrolled users and generated amounts, grouped by enrollment month · admins only',

  // Misc additions
  'Tasa de conversión': 'Conversion rate',
  'Marcar pendiente': 'Mark pending',
  'Marcar hecha': 'Mark done',
  Eliminar: 'Delete',
  'Editar / notas': 'Edit / notes',
  'Notificaciones de tareas': 'Task notifications',
  Invitado: 'Invited',
  'Revocar invitación': 'Revoke invitation',
  '(tú)': '(you)',
  '(vacío)': '(empty)',
  'El registro es solo por invitación. Autoriza un correo aquí y esa persona podrá crear su cuenta; nadie más puede registrarse.':
    'Registration is invite-only. Authorize an email here and that person can create their account; no one else can register.',
  'Pásale a la persona el enlace de la app; se registra con el correo que autorizaste.':
    'Share the app link with them; they register with the email you authorized.',
  'Invitación creada para {email}. Ya puede registrarse con ese correo.':
    'Invitation created for {email}. They can now register with that email.',
  'Sube un CSV de tu base. Mapea tus columnas a los campos del CRM; los repetidos (dentro del archivo y contra los contactos ya cargados) se omiten automáticamente.':
    'Upload a CSV of your database. Map your columns to the CRM fields; duplicates (within the file and against existing contacts) are skipped automatically.',
  'Importados {a} nuevos · {b} repetidos omitidos · {c} sin nombre descartados.':
    'Imported {a} new · {b} duplicates skipped · {c} without name discarded.',
  'Debes mapear la columna de Nombre para poder importar.':
    'You must map the Name column to import.',
}

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
export function monthName(index, lang) {
  return (lang === 'en' ? MONTHS_EN : MONTHS_ES)[index] || ''
}

const LangContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(
    () => localStorage.getItem('lang') || 'es'
  )
  const setLang = useCallback((l) => {
    setLangState(l)
    localStorage.setItem('lang', l)
  }, [])

  // t(str, vars?) — str is the Spanish source; returns the active-language text.
  const t = useCallback(
    (str, vars) => {
      let out = lang === 'en' ? EN[str] ?? str : str
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          out = out.replace(`{${k}}`, v)
        })
      }
      return out
    },
    [lang]
  )

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within a LanguageProvider')
  return ctx
}
