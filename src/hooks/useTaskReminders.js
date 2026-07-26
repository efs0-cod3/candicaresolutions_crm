import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

// Fire a browser notification if the user has granted permission.
export function notify(title, body) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: '/favicon.svg' })
    } catch {
      /* ignore */
    }
  }
}

// Tracks the current user's pending tasks and surfaces overdue / due-today
// reminders, plus live notifications when a new task is assigned.
export function useTaskReminders() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const remindedRef = useRef(false)

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('tasks')
      .select('id, title, due_date, status')
      .eq('assigned_to', user.id)
      .eq('status', 'pending')
    setTasks(data || [])
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  // Live updates: refetch on any change to my tasks; notify on new assignment.
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`tasks-reminders-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `assigned_to=eq.${user.id}`,
        },
        (payload) => {
          load()
          if (payload.eventType === 'INSERT' && payload.new?.status === 'pending') {
            notify('Nueva tarea asignada', payload.new.title || '')
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, load])

  const { overdue, dueToday, actionable } = useMemo(() => {
    const today = todayStr()
    const overdue = tasks.filter((t) => t.due_date && t.due_date < today)
    const dueToday = tasks.filter((t) => t.due_date === today)
    return { overdue, dueToday, actionable: [...overdue, ...dueToday] }
  }, [tasks])

  // One reminder per session once tasks have loaded.
  useEffect(() => {
    if (remindedRef.current) return
    if (overdue.length + dueToday.length > 0) {
      remindedRef.current = true
      notify(
        'Recordatorio de tareas',
        `${overdue.length} vencida(s) · ${dueToday.length} para hoy`
      )
    }
  }, [overdue.length, dueToday.length])

  return { tasks, overdue, dueToday, actionable, reload: load }
}
