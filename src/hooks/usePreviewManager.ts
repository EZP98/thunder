import { useState, useEffect, useCallback, useRef } from 'react'
import type { ElementInfo, SelectionRect } from '../types'

export interface UsePreviewManagerOptions {
  iframeRef: React.RefObject<HTMLIFrameElement | null>
  onElementSelect?: (element: ElementInfo) => void
  onElementHover?: (id: string, rect: SelectionRect) => void
  zoom?: number
}

export interface UsePreviewManagerReturn {
  isConnected: boolean
  isEditMode: boolean
  selectedElement: ElementInfo | null
  selectionRect: SelectionRect | null
  hoverRect: SelectionRect | null
  enableEditMode: () => void
  disableEditMode: () => void
  selectElement: (id: string) => void
  highlightElement: (id: string) => void
  updateStyle: (id: string, styles: Record<string, string>) => void
  clearSelection: () => void
}

export function usePreviewManager(
  options: UsePreviewManagerOptions
): UsePreviewManagerReturn {
  const { iframeRef, onElementSelect, onElementHover, zoom = 1 } = options

  const [isConnected, setIsConnected] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null)
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null)
  const [hoverRect, setHoverRect] = useState<SelectionRect | null>(null)

  const pingIntervalRef = useRef<number | null>(null)

  // Scale rect based on zoom
  const scaleRect = useCallback(
    (rect: SelectionRect): SelectionRect => ({
      top: rect.top * zoom,
      left: rect.left * zoom,
      width: rect.width * zoom,
      height: rect.height * zoom,
    }),
    [zoom]
  )

  // Send message to iframe
  const sendMessage = useCallback(
    (type: string, payload?: unknown) => {
      const iframe = iframeRef.current
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ type, payload }, '*')
      }
    },
    [iframeRef]
  )

  // Enable edit mode
  const enableEditMode = useCallback(() => {
    sendMessage('thunder:enable-edit-mode')
    setIsEditMode(true)
  }, [sendMessage])

  // Disable edit mode
  const disableEditMode = useCallback(() => {
    sendMessage('thunder:disable-edit-mode')
    setIsEditMode(false)
    setSelectedElement(null)
    setSelectionRect(null)
    setHoverRect(null)
  }, [sendMessage])

  // Select element by ID
  const selectElement = useCallback(
    (id: string) => {
      sendMessage('thunder:select-element', { id })
    },
    [sendMessage]
  )

  // Highlight element by ID
  const highlightElement = useCallback(
    (id: string) => {
      sendMessage('thunder:highlight-element', { id })
    },
    [sendMessage]
  )

  // Update element style
  const updateStyle = useCallback(
    (id: string, styles: Record<string, string>) => {
      sendMessage('thunder:update-style', { id, styles })
    },
    [sendMessage]
  )

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedElement(null)
    setSelectionRect(null)
    setHoverRect(null)
  }, [])

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data || {}

      switch (type) {
        case 'thunder:ready':
          setIsConnected(true)
          // Stop ping interval once connected
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current)
            pingIntervalRef.current = null
          }
          break

        case 'thunder:pong':
          setIsConnected(true)
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current)
            pingIntervalRef.current = null
          }
          break

        case 'thunder:element-selected':
          if (payload) {
            const elementInfo = payload as ElementInfo
            setSelectedElement(elementInfo)
            setSelectionRect(scaleRect(elementInfo.rect as SelectionRect))
            onElementSelect?.(elementInfo)
          }
          break

        case 'thunder:element-hover':
          if (payload) {
            const { id, rect } = payload as { id: string; rect: SelectionRect }
            setHoverRect(scaleRect(rect))
            onElementHover?.(id, scaleRect(rect))
          }
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onElementSelect, onElementHover, scaleRect])

  // Start ping interval to detect when iframe is ready
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    // Reset connection state when iframe changes
    setIsConnected(false)

    // Start pinging
    pingIntervalRef.current = window.setInterval(() => {
      sendMessage('thunder:ping')
    }, 500)

    // Cleanup
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }
    }
  }, [iframeRef, sendMessage])

  return {
    isConnected,
    isEditMode,
    selectedElement,
    selectionRect,
    hoverRect,
    enableEditMode,
    disableEditMode,
    selectElement,
    highlightElement,
    updateStyle,
    clearSelection,
  }
}
