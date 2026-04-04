import { useEffect, useRef, useCallback, useState } from 'react'

interface PipelineEvent {
  event: string
  stage?: string
  duration?: number
  progress?: string
  video_id?: string
  video_path?: string
  error?: string
  timestamp?: number
}

const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

export function usePipelineWebSocket(videoId: string | null) {
  const [events, setEvents] = useState<PipelineEvent[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const retriesRef = useRef(0)
  const closedByUserRef = useRef(false)

  useEffect(() => {
    if (!videoId) return

    closedByUserRef.current = false
    retriesRef.current = 0

    function connectWs() {
      const ws = new WebSocket(`ws://${window.location.host}/ws/pipeline/${videoId}`)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        retriesRef.current = 0
      }

      ws.onclose = () => {
        setConnected(false)

        if (
          !closedByUserRef.current &&
          retriesRef.current < MAX_RETRIES
        ) {
          const delay = BASE_DELAY_MS * Math.pow(2, retriesRef.current)
          retriesRef.current += 1
          setTimeout(connectWs, delay)
        }
      }

      ws.onmessage = (e) => {
        const event: PipelineEvent = JSON.parse(e.data)
        setEvents((prev) => [...prev, event])

        // Stop reconnecting after terminal events
        if (event.event === 'pipeline_done' || event.event === 'pipeline_error') {
          closedByUserRef.current = true
        }
      }
    }

    connectWs()

    return () => {
      closedByUserRef.current = true
      wsRef.current?.close()
      setConnected(false)
    }
  }, [videoId])

  const reset = useCallback(() => setEvents([]), [])
  return { events, connected, reset }
}
