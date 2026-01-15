import { forwardRef } from 'react'
import type { SelectionRect } from '../../types'
import { Loader2 } from 'lucide-react'

interface SelectionOverlayProps {
  rect: SelectionRect | null
  type: 'selection' | 'hover'
}

export function SelectionOverlay({ rect, type }: SelectionOverlayProps) {
  if (!rect) return null

  const isSelection = type === 'selection'

  return (
    <div
      className={`
        absolute pointer-events-none transition-all duration-100
        ${isSelection
          ? 'border-2 border-blue-500 bg-blue-500/10'
          : 'border border-blue-400/50 bg-blue-400/5'
        }
      `}
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      }}
    >
      {/* Selection handles */}
      {isSelection && (
        <>
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 rounded-full" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
        </>
      )}
    </div>
  )
}

interface PreviewProps {
  url: string | null
  isLoading: boolean
  status: string
  zoom?: number
  viewport?: 'desktop' | 'tablet' | 'mobile'
  selectionRect?: SelectionRect | null
  hoverRect?: SelectionRect | null
  isEditMode?: boolean
}

const VIEWPORT_SIZES = {
  desktop: { width: '100%', height: '100%' },
  tablet: { width: '768px', height: '1024px' },
  mobile: { width: '375px', height: '667px' },
}

export const Preview = forwardRef<HTMLIFrameElement, PreviewProps>(
  function Preview(
    {
      url,
      isLoading,
      status,
      zoom = 1,
      viewport = 'desktop',
      selectionRect,
      hoverRect,
      isEditMode,
    },
    ref
  ) {
    const viewportSize = VIEWPORT_SIZES[viewport]
    const isDesktop = viewport === 'desktop'

    return (
      <div className="relative w-full h-full bg-[#0a0a0a] overflow-hidden">
        {/* Loading state */}
        {(isLoading || !url) && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a] z-10">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-400 capitalize">{status}...</p>
              <p className="text-xs text-gray-600 mt-1">
                {status === 'booting' && 'Starting WebContainer...'}
                {status === 'installing' && 'Installing dependencies...'}
                {status === 'starting' && 'Starting dev server...'}
              </p>
            </div>
          </div>
        )}

        {/* Preview container */}
        <div
          className={`
            relative mx-auto h-full
            ${!isDesktop ? 'flex items-start justify-center pt-8 overflow-auto' : ''}
          `}
        >
          {/* Viewport wrapper */}
          <div
            className={`
              relative bg-white overflow-hidden
              ${!isDesktop ? 'rounded-lg shadow-2xl border border-white/10' : 'w-full h-full'}
            `}
            style={{
              width: viewportSize.width,
              height: isDesktop ? '100%' : viewportSize.height,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
            }}
          >
            {/* Iframe */}
            {url && (
              <iframe
                ref={ref}
                src={url}
                className="w-full h-full border-0"
                title="Thunder Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            )}

            {/* Overlays (only when in edit mode) */}
            {isEditMode && (
              <>
                <SelectionOverlay rect={hoverRect || null} type="hover" />
                <SelectionOverlay rect={selectionRect || null} type="selection" />
              </>
            )}
          </div>
        </div>

        {/* Edit mode indicator */}
        {isEditMode && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-blue-500/20 border border-blue-500/50 rounded text-xs text-blue-400">
            Edit Mode
          </div>
        )}

        {/* Viewport indicator for non-desktop */}
        {!isDesktop && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/80 rounded-full text-xs text-gray-400">
            {viewport === 'tablet' ? '768 × 1024' : '375 × 667'}
          </div>
        )}
      </div>
    )
  }
)
