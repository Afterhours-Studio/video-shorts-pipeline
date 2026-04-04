import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'

interface Video {
  id: string
  topic: string
  niche: string
  title: string
  caption: string
  hashtags: string
  status: string
  duration: number
  file_size: number
  tiktok_url: string
  created_at: string
}

interface VideoListResponse {
  videos: Video[]
  total: number
  limit: number
  offset: number
}

export function useVideos(params?: { niche?: string; status?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['videos', params],
    queryFn: () => api.get('videos', { searchParams: params as Record<string, string> }).json<VideoListResponse>(),
  })
}

export function useVideo(id: string) {
  return useQuery({
    queryKey: ['video', id],
    queryFn: () => api.get(`videos/${id}`).json<Video>(),
    enabled: !!id,
  })
}

export function useDeleteVideo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`videos/${id}`).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['videos'] }),
  })
}
