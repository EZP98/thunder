// Thunder Types

// File System Types
export interface FileNode {
  name: string
  type: 'file' | 'folder'
  path: string
  children?: FileNode[]
  content?: string
}

export type FileMap = Map<string, string>

// WebContainer Types
export type ContainerStatus =
  | 'idle'
  | 'booting'
  | 'installing'
  | 'starting'
  | 'ready'
  | 'error'

export interface ContainerLog {
  id: string
  type: 'info' | 'error' | 'success' | 'command'
  message: string
  timestamp: number
}

// Artifact Parser Types
export interface ParsedArtifact {
  files: FileMap
  commands: string[]
  metadata?: {
    title?: string
  }
}

export interface BoltAction {
  type: 'file' | 'shell'
  filePath?: string
  content: string
}

// Preview Manager Types
export interface ElementInfo {
  id: string
  tagName: string
  className?: string
  textContent?: string
  componentName?: string
  props?: Record<string, unknown>
  styles: Record<string, string>
  computedStyles?: Record<string, string>
  rect: DOMRect
}

export interface SelectionRect {
  top: number
  left: number
  width: number
  height: number
}

// Design to Code Types
export type ChangeType = 'style' | 'content' | 'prop' | 'add' | 'delete' | 'move'

export interface DesignChange {
  type: ChangeType
  elementId: string
  file: string
  component?: string
  change: Record<string, unknown>
  timestamp: number
}

// Chat Types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  artifact?: ParsedArtifact
}

// Editor Types
export interface OpenFile {
  path: string
  content: string
  isDirty: boolean
}

// PostMessage Protocol
export type ThunderMessageType =
  | 'thunder:enable-edit-mode'
  | 'thunder:disable-edit-mode'
  | 'thunder:select-element'
  | 'thunder:highlight-element'
  | 'thunder:update-style'
  | 'thunder:ready'
  | 'thunder:element-selected'
  | 'thunder:element-hover'
  | 'thunder:pong'
  | 'thunder:ping'

export interface ThunderMessage {
  type: ThunderMessageType
  payload?: unknown
}
