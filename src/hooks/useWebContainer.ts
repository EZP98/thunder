import { useState, useEffect, useCallback, useRef } from 'react'
import type { ContainerStatus, ContainerLog, FileMap } from '../types'
import {
  getWebContainer,
  writeFiles,
  installDependencies,
  startDevServer,
  createViteReactProject,
  hotReloadFile,
  teardown,
  CONTAINER_EVENTS,
} from '../lib/webcontainer'

const MAX_LOGS = 100

export interface UseWebContainerOptions {
  autoStart?: boolean
  includeEditableRuntime?: boolean
}

export interface UseWebContainerReturn {
  status: ContainerStatus
  logs: ContainerLog[]
  previewUrl: string | null
  error: string | null
  boot: () => Promise<void>
  loadProject: (files: FileMap) => Promise<void>
  updateFile: (path: string, content: string) => Promise<void>
  restart: () => Promise<void>
  clearLogs: () => void
}

export function useWebContainer(
  options: UseWebContainerOptions = {}
): UseWebContainerReturn {
  const { autoStart = false, includeEditableRuntime = true } = options

  const [status, setStatus] = useState<ContainerStatus>('idle')
  const [logs, setLogs] = useState<ContainerLog[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currentFilesRef = useRef<FileMap>(new Map())
  const isBootedRef = useRef(false)

  // Add log entry
  const addLog = useCallback((log: ContainerLog) => {
    setLogs((prev) => {
      const newLogs = [...prev, log]
      // Keep only last MAX_LOGS
      if (newLogs.length > MAX_LOGS) {
        return newLogs.slice(-MAX_LOGS)
      }
      return newLogs
    })
  }, [])

  // Clear logs
  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  // Listen for container events
  useEffect(() => {
    const handleLog = (e: CustomEvent<ContainerLog>) => {
      addLog(e.detail)
    }

    const handleStatusChange = (e: CustomEvent<{ status: ContainerStatus }>) => {
      setStatus(e.detail.status)
    }

    const handleServerReady = (e: CustomEvent<{ url: string }>) => {
      setPreviewUrl(e.detail.url)
      setStatus('ready')
    }

    const handleError = (e: CustomEvent<{ error: Error }>) => {
      setError(e.detail.error.message)
      setStatus('error')
    }

    window.addEventListener(CONTAINER_EVENTS.LOG, handleLog as EventListener)
    window.addEventListener(
      CONTAINER_EVENTS.STATUS_CHANGE,
      handleStatusChange as EventListener
    )
    window.addEventListener(
      CONTAINER_EVENTS.SERVER_READY,
      handleServerReady as EventListener
    )
    window.addEventListener(CONTAINER_EVENTS.ERROR, handleError as EventListener)

    return () => {
      window.removeEventListener(CONTAINER_EVENTS.LOG, handleLog as EventListener)
      window.removeEventListener(
        CONTAINER_EVENTS.STATUS_CHANGE,
        handleStatusChange as EventListener
      )
      window.removeEventListener(
        CONTAINER_EVENTS.SERVER_READY,
        handleServerReady as EventListener
      )
      window.removeEventListener(
        CONTAINER_EVENTS.ERROR,
        handleError as EventListener
      )
    }
  }, [addLog])

  // Boot WebContainer
  const boot = useCallback(async () => {
    if (isBootedRef.current) return

    try {
      setStatus('booting')
      setError(null)
      await getWebContainer()
      isBootedRef.current = true

      // Create default project
      const defaultFiles = createViteReactProject(undefined, includeEditableRuntime)
      await writeFiles(defaultFiles)
      currentFilesRef.current = defaultFiles

      // Install and start
      await installDependencies()
      await startDevServer((url) => {
        setPreviewUrl(url)
      })
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to boot container')
    }
  }, [includeEditableRuntime])

  // Load project files
  const loadProject = useCallback(async (files: FileMap) => {
    try {
      setStatus('installing')
      setError(null)

      // Boot if not already
      if (!isBootedRef.current) {
        await getWebContainer()
        isBootedRef.current = true
      }

      // Write all files
      await writeFiles(files)
      currentFilesRef.current = files

      // Check if package.json changed
      const hasPackageJson = files.has('package.json')
      if (hasPackageJson) {
        await installDependencies()
      }

      // Start server if not running
      if (status !== 'ready') {
        await startDevServer((url) => {
          setPreviewUrl(url)
        })
      }
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to load project')
    }
  }, [status])

  // Update single file (hot reload)
  const updateFile = useCallback(async (path: string, content: string) => {
    try {
      await hotReloadFile(path, content)
      currentFilesRef.current.set(path, content)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update file')
    }
  }, [])

  // Restart container
  const restart = useCallback(async () => {
    try {
      await teardown()
      isBootedRef.current = false
      setStatus('idle')
      setPreviewUrl(null)
      setError(null)

      // Reboot with current files
      await boot()
      if (currentFilesRef.current.size > 0) {
        await writeFiles(currentFilesRef.current)
      }
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to restart')
    }
  }, [boot])

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && status === 'idle') {
      boot()
    }
  }, [autoStart, status, boot])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't teardown - keep singleton alive for HMR
    }
  }, [])

  return {
    status,
    logs,
    previewUrl,
    error,
    boot,
    loadProject,
    updateFile,
    restart,
    clearLogs,
  }
}
