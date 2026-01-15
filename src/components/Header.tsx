import { Monitor, Tablet, Smartphone, MousePointer2, Copy, Download, RotateCcw, Save, Check } from 'lucide-react'

interface HeaderProps {
  viewport: 'desktop' | 'tablet' | 'mobile'
  onViewportChange: (viewport: 'desktop' | 'tablet' | 'mobile') => void
  isEditMode: boolean
  onToggleEditMode: () => void
  onCopyCode: () => void
  onExport: () => void
  onRestart: () => void
  onSave: () => void
  status: string
  lastSaved?: string
}

export function Header({
  viewport,
  onViewportChange,
  isEditMode,
  onToggleEditMode,
  onCopyCode,
  onExport,
  onRestart,
  onSave,
  status,
  lastSaved,
}: HeaderProps) {
  return (
    <header className="h-14 bg-[#0d0d0d] border-b border-white/10 flex items-center justify-between px-4">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <span className="text-white font-semibold text-lg">Thunder</span>
        </div>
        <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
          v2
        </span>

        {/* Status indicator */}
        {status !== 'ready' && status !== 'idle' && (
          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded capitalize">
            {status}
          </span>
        )}
      </div>

      {/* Center - Viewport switcher */}
      <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
        <button
          onClick={() => onViewportChange('desktop')}
          className={`
            p-2 rounded-md transition-colors
            ${viewport === 'desktop'
              ? 'bg-white/10 text-white'
              : 'text-gray-500 hover:text-gray-300'
            }
          `}
          title="Desktop view"
        >
          <Monitor className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewportChange('tablet')}
          className={`
            p-2 rounded-md transition-colors
            ${viewport === 'tablet'
              ? 'bg-white/10 text-white'
              : 'text-gray-500 hover:text-gray-300'
            }
          `}
          title="Tablet view"
        >
          <Tablet className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewportChange('mobile')}
          className={`
            p-2 rounded-md transition-colors
            ${viewport === 'mobile'
              ? 'bg-white/10 text-white'
              : 'text-gray-500 hover:text-gray-300'
            }
          `}
          title="Mobile view"
        >
          <Smartphone className="w-4 h-4" />
        </button>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-2">
        {/* Last saved indicator */}
        {lastSaved && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mr-2">
            <Check className="w-3 h-3 text-green-500" />
            <span>Saved {lastSaved}</span>
          </div>
        )}

        {/* Save button */}
        <button
          onClick={onSave}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg text-sm transition-colors"
          title="Save project"
        >
          <Save className="w-4 h-4" />
          <span className="hidden sm:inline">Save</span>
        </button>

        {/* Edit mode toggle */}
        <button
          onClick={onToggleEditMode}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors
            ${isEditMode
              ? 'bg-blue-600 text-white'
              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }
          `}
        >
          <MousePointer2 className="w-4 h-4" />
          <span className="hidden sm:inline">Edit</span>
        </button>

        {/* Copy code */}
        <button
          onClick={onCopyCode}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg text-sm transition-colors"
        >
          <Copy className="w-4 h-4" />
          <span className="hidden sm:inline">Copy</span>
        </button>

        {/* Export */}
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg text-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* Restart */}
        <button
          onClick={onRestart}
          className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors"
          title="Restart container"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
