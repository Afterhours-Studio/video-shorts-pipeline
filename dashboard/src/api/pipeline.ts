import { useMutation, useQuery } from '@tanstack/react-query'
import api from '../lib/api'

interface PipelineRunRequest {
  topic: string
  niche?: string
  provider?: string
}

interface PipelineRunResponse {
  video_id: string
  status: string
  message: string
}

interface PipelineStageStatus {
  stage: string
  status: string
  started_at: string | null
  finished_at: string | null
  error: string | null
}

interface PipelineStatusResponse {
  video_id: string
  video_status: string
  stages: PipelineStageStatus[]
}

export function useRunPipeline() {
  return useMutation({
    mutationFn: (data: PipelineRunRequest) =>
      api.post('pipeline/run', { json: data }).json<PipelineRunResponse>(),
  })
}

export function usePipelineStatus(videoId: string | null) {
  return useQuery({
    queryKey: ['pipeline-status', videoId],
    queryFn: () => api.get(`pipeline/status/${videoId}`).json<PipelineStatusResponse>(),
    enabled: !!videoId,
    refetchInterval: 2000,
  })
}
