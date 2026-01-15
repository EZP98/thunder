import { useState, useEffect, useCallback } from 'react'
import type { ChatMessage, FileMap } from '../types'

const STORAGE_KEYS = {
  PROJECT_FILES: 'thunder:project:files',
  CHAT_MESSAGES: 'thunder:chat:messages',
  LAST_SAVED: 'thunder:last:saved',
} as const

interface ProjectData {
  files: Record<string, string>
  messages: ChatMessage[]
  lastSaved: number
}

// Convert FileMap to plain object for storage
function fileMapToObject(files: FileMap): Record<string, string> {
  const obj: Record<string, string> = {}
  for (const [key, value] of files) {
    obj[key] = value
  }
  return obj
}

// Convert plain object back to FileMap
function objectToFileMap(obj: Record<string, string>): FileMap {
  return new Map(Object.entries(obj))
}

export function useLocalStorage() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [lastSaved, setLastSaved] = useState<number | null>(null)

  // Load project from localStorage
  const loadProject = useCallback((): ProjectData | null => {
    try {
      const filesJson = localStorage.getItem(STORAGE_KEYS.PROJECT_FILES)
      const messagesJson = localStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES)
      const lastSavedStr = localStorage.getItem(STORAGE_KEYS.LAST_SAVED)

      if (!filesJson) return null

      const files = JSON.parse(filesJson)
      const messages = messagesJson ? JSON.parse(messagesJson) : []
      const savedTime = lastSavedStr ? parseInt(lastSavedStr, 10) : Date.now()

      setLastSaved(savedTime)
      setIsLoaded(true)

      return {
        files,
        messages,
        lastSaved: savedTime,
      }
    } catch (error) {
      console.error('Failed to load project from localStorage:', error)
      return null
    }
  }, [])

  // Save project to localStorage
  const saveProject = useCallback((files: FileMap, messages: ChatMessage[]) => {
    try {
      const now = Date.now()
      const filesObj = fileMapToObject(files)

      localStorage.setItem(STORAGE_KEYS.PROJECT_FILES, JSON.stringify(filesObj))
      localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(messages))
      localStorage.setItem(STORAGE_KEYS.LAST_SAVED, now.toString())

      setLastSaved(now)
      console.log('Project saved to localStorage')
    } catch (error) {
      console.error('Failed to save project to localStorage:', error)
    }
  }, [])

  // Clear saved project
  const clearProject = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.PROJECT_FILES)
      localStorage.removeItem(STORAGE_KEYS.CHAT_MESSAGES)
      localStorage.removeItem(STORAGE_KEYS.LAST_SAVED)
      setLastSaved(null)
      console.log('Project cleared from localStorage')
    } catch (error) {
      console.error('Failed to clear project from localStorage:', error)
    }
  }, [])

  // Check if there's a saved project
  const hasSavedProject = useCallback((): boolean => {
    return !!localStorage.getItem(STORAGE_KEYS.PROJECT_FILES)
  }, [])

  // Format last saved time
  const formatLastSaved = useCallback((): string => {
    if (!lastSaved) return ''

    const now = Date.now()
    const diff = now - lastSaved

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`
    return new Date(lastSaved).toLocaleDateString()
  }, [lastSaved])

  return {
    isLoaded,
    lastSaved,
    loadProject,
    saveProject,
    clearProject,
    hasSavedProject,
    formatLastSaved,
    objectToFileMap,
    fileMapToObject,
  }
}

// Auto-save hook that saves periodically
export function useAutoSave(
  files: FileMap,
  messages: ChatMessage[],
  enabled = true,
  intervalMs = 30000
) {
  const { saveProject } = useLocalStorage()

  useEffect(() => {
    if (!enabled || files.size === 0) return

    const timer = setInterval(() => {
      saveProject(files, messages)
    }, intervalMs)

    return () => clearInterval(timer)
  }, [files, messages, enabled, intervalMs, saveProject])
}
