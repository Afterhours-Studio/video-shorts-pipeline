import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

interface Schedule {
  id: number
  name: string
  cron_expr: string
  niche: string
  action: string
  is_active: boolean
  last_run_at: string | null
  next_run_at: string | null
  created_at: string
}

export function useSchedules() {
  return useQuery({
    queryKey: ['schedules'],
    queryFn: () => api.get('schedules').json<Schedule[]>(),
  })
}

export function useCreateSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Schedule, 'id' | 'is_active' | 'last_run_at' | 'next_run_at' | 'created_at'>) =>
      api.post('schedules', { json: data }).json<Schedule>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  })
}

export function useToggleSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.post(`schedules/${id}/toggle`).json<Schedule>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  })
}

export function useDeleteSchedule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`schedules/${id}`).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  })
}
