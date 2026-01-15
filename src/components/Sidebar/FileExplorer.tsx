import { useState, useMemo } from 'react'
import type { FileNode } from '../../types'
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, RefreshCw } from 'lucide-react'

// File type icons and colors
const FILE_ICONS: Record<string, { color: string }> = {
  tsx: { color: '#3b82f6' },
  jsx: { color: '#3b82f6' },
  ts: { color: '#3b82f6' },
  js: { color: '#eab308' },
  css: { color: '#a855f7' },
  scss: { color: '#ec4899' },
  html: { color: '#f97316' },
  json: { color: '#22c55e' },
  md: { color: '#6b7280' },
  svg: { color: '#f59e0b' },
  png: { color: '#06b6d4' },
  jpg: { color: '#06b6d4' },
  gif: { color: '#06b6d4' },
}

interface FileTreeItemProps {
  node: FileNode
  depth: number
  selectedPath: string | null
  onSelect: (node: FileNode) => void
}

function FileTreeItem({ node, depth, selectedPath, onSelect }: FileTreeItemProps) {
  const [isOpen, setIsOpen] = useState(depth < 2)

  const isSelected = selectedPath === node.path
  const isFolder = node.type === 'folder'

  // Get file extension
  const ext = node.name.split('.').pop()?.toLowerCase() || ''
  const fileConfig = FILE_ICONS[ext] || { color: '#6b7280' }

  const handleClick = () => {
    if (isFolder) {
      setIsOpen(!isOpen)
    } else {
      onSelect(node)
    }
  }

  return (
    <div>
      <div
        onClick={handleClick}
        className={`
          flex items-center gap-1 px-2 py-1 cursor-pointer
          text-sm transition-colors duration-150
          ${isSelected
            ? 'bg-blue-500/20 text-blue-400'
            : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
          }
        `}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {/* Folder chevron or spacer */}
        {isFolder ? (
          <span className="w-4 h-4 flex items-center justify-center text-gray-500">
            {isOpen ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </span>
        ) : (
          <span className="w-4" />
        )}

        {/* Icon */}
        {isFolder ? (
          isOpen ? (
            <FolderOpen className="w-4 h-4 text-yellow-500" />
          ) : (
            <Folder className="w-4 h-4 text-yellow-500" />
          )
        ) : (
          <File className="w-4 h-4" style={{ color: fileConfig.color }} />
        )}

        {/* Name */}
        <span className="truncate">{node.name}</span>
      </div>

      {/* Children */}
      {isFolder && isOpen && node.children && (
        <div>
          {node.children
            .sort((a, b) => {
              // Folders first, then alphabetically
              if (a.type !== b.type) {
                return a.type === 'folder' ? -1 : 1
              }
              return a.name.localeCompare(b.name)
            })
            .map((child) => (
              <FileTreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
            ))}
        </div>
      )}
    </div>
  )
}

interface FileExplorerProps {
  files: FileNode[]
  selectedPath: string | null
  onFileSelect: (node: FileNode) => void
  onRefresh?: () => void
  projectName?: string
}

export function FileExplorer({
  files,
  selectedPath,
  onFileSelect,
  onRefresh,
  projectName = 'thunder-preview',
}: FileExplorerProps) {
  // Count total files
  const fileCount = useMemo(() => {
    const count = (nodes: FileNode[]): number => {
      return nodes.reduce((acc, node) => {
        if (node.type === 'file') return acc + 1
        if (node.children) return acc + count(node.children)
        return acc
      }, 0)
    }
    return count(files)
  }, [files])

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          {projectName}
        </span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1 text-gray-500 hover:text-gray-300 transition-colors"
            title="Refresh files"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {files.length === 0 ? (
          <div className="px-3 py-4 text-sm text-gray-500 text-center">
            No files yet
          </div>
        ) : (
          files
            .sort((a, b) => {
              if (a.type !== b.type) {
                return a.type === 'folder' ? -1 : 1
              }
              return a.name.localeCompare(b.name)
            })
            .map((node) => (
              <FileTreeItem
                key={node.path}
                node={node}
                depth={0}
                selectedPath={selectedPath}
                onSelect={onFileSelect}
              />
            ))
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-white/10 text-xs text-gray-500">
        {fileCount} file{fileCount !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
