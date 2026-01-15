import { useRef, useEffect } from 'react'
import type { ContainerLog } from '../../types'
import { Trash2, AlertCircle, CheckCircle, Info, Terminal } from 'lucide-react'

interface ConsolePanelProps {
  logs: ContainerLog[]
  onClear: () => void
}

const LOG_ICONS = {
  error: AlertCircle,
  success: CheckCircle,
  info: Info,
  command: Terminal,
}

const LOG_COLORS = {
  error: 'text-red-400',
  success: 'text-green-400',
  info: 'text-blue-400',
  command: 'text-yellow-400',
}

export function ConsolePanel({ logs, onClear }: ConsolePanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Console
        </span>
        <button
          onClick={onClear}
          className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
          title="Clear console"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No logs yet
          </div>
        ) : (
          logs.map((log) => {
            const Icon = LOG_ICONS[log.type]
            const colorClass = LOG_COLORS[log.type]

            return (
              <div
                key={log.id}
                className="flex items-start gap-2 py-1 hover:bg-white/5 rounded px-1"
              >
                {/* Timestamp */}
                <span className="text-gray-600 flex-shrink-0 w-16">
                  {formatTime(log.timestamp)}
                </span>

                {/* Icon */}
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${colorClass}`} />

                {/* Message */}
                <span className={`${colorClass} break-all`}>
                  {log.message}
                </span>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
