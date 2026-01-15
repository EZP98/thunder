import { useCallback } from 'react'
import MonacoEditor from '@monaco-editor/react'
import type { OpenFile } from '../../types'
import { X, Circle } from 'lucide-react'

interface FileTabsProps {
  files: OpenFile[]
  activeFile: string | null
  onSelectFile: (path: string) => void
  onCloseFile: (path: string) => void
}

export function FileTabs({
  files,
  activeFile,
  onSelectFile,
  onCloseFile,
}: FileTabsProps) {
  if (files.length === 0) return null

  return (
    <div className="flex items-center bg-[#0d0d0d] border-b border-white/10 overflow-x-auto">
      {files.map((file) => {
        const isActive = file.path === activeFile
        const fileName = file.path.split('/').pop() || file.path

        return (
          <div
            key={file.path}
            className={`
              flex items-center gap-2 px-3 py-2 text-sm cursor-pointer
              border-r border-white/5 min-w-0
              ${isActive
                ? 'bg-[#1a1a1a] text-white'
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }
            `}
            onClick={() => onSelectFile(file.path)}
          >
            <span className="truncate max-w-[120px]">{fileName}</span>

            {/* Dirty indicator */}
            {file.isDirty && (
              <Circle className="w-2 h-2 fill-blue-400 text-blue-400 flex-shrink-0" />
            )}

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCloseFile(file.path)
              }}
              className="p-0.5 hover:bg-white/10 rounded flex-shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

interface CodeEditorProps {
  files: OpenFile[]
  activeFile: string | null
  onSelectFile: (path: string) => void
  onCloseFile: (path: string) => void
  onContentChange: (path: string, content: string) => void
  onSave?: (path: string, content: string) => void
}

export function CodeEditor({
  files,
  activeFile,
  onSelectFile,
  onCloseFile,
  onContentChange,
  onSave,
}: CodeEditorProps) {
  const activeOpenFile = files.find((f) => f.path === activeFile)

  // Get language from file extension
  const getLanguage = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase()
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      css: 'css',
      scss: 'scss',
      html: 'html',
      json: 'json',
      md: 'markdown',
    }
    return languageMap[ext || ''] || 'plaintext'
  }

  // Handle content change
  const handleChange = useCallback(
    (value: string | undefined) => {
      if (activeFile && value !== undefined) {
        onContentChange(activeFile, value)
      }
    },
    [activeFile, onContentChange]
  )

  // Handle save shortcut
  const handleEditorMount = useCallback(
    (editor: unknown) => {
      const monacoEditor = editor as { addCommand: (keyCode: number, handler: () => void) => void }
      // Ctrl/Cmd + S
      monacoEditor.addCommand(
        2048 + 49, // KeyMod.CtrlCmd + KeyCode.KeyS
        () => {
          if (activeFile && activeOpenFile && onSave) {
            onSave(activeFile, activeOpenFile.content)
          }
        }
      )
    },
    [activeFile, activeOpenFile, onSave]
  )

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      {/* File tabs */}
      <FileTabs
        files={files}
        activeFile={activeFile}
        onSelectFile={onSelectFile}
        onCloseFile={onCloseFile}
      />

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        {activeOpenFile ? (
          <MonacoEditor
            height="100%"
            language={getLanguage(activeFile || '')}
            value={activeOpenFile.content}
            onChange={handleChange}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              padding: { top: 12, bottom: 12 },
              lineNumbers: 'on',
              renderLineHighlight: 'line',
              cursorBlinking: 'smooth',
              smoothScrolling: true,
              tabSize: 2,
              wordWrap: 'on',
              automaticLayout: true,
              bracketPairColorization: { enabled: true },
              guides: {
                bracketPairs: true,
                indentation: true,
              },
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-sm">No file selected</p>
              <p className="text-xs mt-1 text-gray-600">
                Select a file from the explorer to edit
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
