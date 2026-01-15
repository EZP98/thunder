import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import type { ChatMessage, FileNode, OpenFile, ElementInfo, FileMap } from './types'
import { useWebContainer } from './hooks/useWebContainer'
import { usePreviewManager } from './hooks/usePreviewManager'
import { useLocalStorage, useAutoSave } from './hooks/useLocalStorage'
import { parseArtifact, extractMessage, fileMapToTree } from './lib/artifactParser'
import { createViteReactProject } from './lib/webcontainer'
import { getEditableRuntimeFile } from './lib/editableRuntime'
import { DesignToCodeEngine } from './lib/designToCode'
import { Header } from './components/Header'
import { ChatPanel } from './components/Sidebar/ChatPanel'
import { FileExplorer } from './components/Sidebar/FileExplorer'
import { ConsolePanel } from './components/Sidebar/ConsolePanel'
import { CodeEditor } from './components/CodePanel/Editor'
import { Preview } from './components/Canvas/Preview'
import { StylePanel } from './components/StylePanel/StylePanel'
import { MessageSquare, FolderTree, Terminal, Code2, PanelLeftClose, PanelLeft, Paintbrush } from 'lucide-react'

// System prompt for Claude
const SYSTEM_PROMPT = `You are Thunder AI, an expert React developer. You generate complete React applications.

## OUTPUT FORMAT
Always respond with code using the boltArtifact format:

<boltArtifact title="Project Name">
  <boltAction type="file" filePath="src/App.jsx">
// Your React component code here
  </boltAction>
  <boltAction type="file" filePath="src/components/Hero.jsx">
// Additional components here
  </boltAction>
  <boltAction type="shell">
npm install framer-motion
  </boltAction>
</boltArtifact>

## RULES
1. Use React with JSX (not TypeScript for generated code)
2. Use Tailwind CSS classes for styling (available via CDN)
3. Add data-thunder-id="unique-id" attribute to interactive elements for visual editing
4. Keep components modular and well-organized
5. Use semantic HTML elements
6. Make designs responsive with Tailwind breakpoints
7. Include a brief text message before the artifact explaining what you created

## EXAMPLE

User: "Create a landing page with hero section"

I'll create a modern landing page with a hero section featuring a gradient background and call-to-action buttons.

<boltArtifact title="Landing Page">
  <boltAction type="file" filePath="src/App.jsx">
export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <section data-thunder-id="hero" className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-4xl">
          <h1 data-thunder-id="hero-title" className="text-5xl md:text-7xl font-bold text-white mb-6">
            Build Amazing Products
          </h1>
          <p data-thunder-id="hero-subtitle" className="text-xl text-gray-300 mb-8">
            Create beautiful interfaces with the power of AI
          </p>
          <div className="flex gap-4 justify-center">
            <button data-thunder-id="cta-primary" className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition">
              Get Started
            </button>
            <button data-thunder-id="cta-secondary" className="px-8 py-3 border border-white/20 text-white rounded-lg font-semibold hover:bg-white/10 transition">
              Learn More
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
  </boltAction>
</boltArtifact>

Remember: Always include data-thunder-id attributes on elements you want to be selectable for visual editing.`

type SidebarTab = 'chat' | 'files' | 'console' | 'styles'

export default function App() {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('chat')
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [showSidebar, setShowSidebar] = useState(true)
  const [showCodePanel, setShowCodePanel] = useState(true)

  // Files state
  const [files, setFiles] = useState<FileMap>(new Map())
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([])
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null)
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null)
  const [pendingChanges, setPendingChanges] = useState(0)

  // Refs
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // WebContainer hook
  const {
    status,
    logs,
    previewUrl,
    boot,
    loadProject,
    updateFile,
    restart,
    clearLogs,
  } = useWebContainer({ autoStart: false, includeEditableRuntime: true })

  // LocalStorage persistence
  const {
    loadProject: loadSavedProject,
    saveProject,
    hasSavedProject,
    formatLastSaved,
    objectToFileMap,
  } = useLocalStorage()

  // Auto-save every 30 seconds
  useAutoSave(files, messages, status === 'ready', 30000)

  // Preview manager hook
  const {
    isEditMode,
    selectionRect,
    hoverRect,
    enableEditMode,
    disableEditMode,
    updateStyle,
  } = usePreviewManager({
    iframeRef,
    onElementSelect: (element) => {
      setSelectedElement(element)
      setSidebarTab('styles') // Auto-switch to styles tab
      console.log('Selected element:', element)
    },
  })

  // Design to Code Engine - memoized to prevent re-creation
  const designEngine = useMemo(() => {
    return new DesignToCodeEngine({
      debounceMs: 500,
      onSendToAI: async (prompt) => {
        // Send design changes to Claude
        await handleSendMessage(prompt)
      },
      onInstantPreview: (elementId, styles) => {
        updateStyle(elementId, styles)
      },
      onError: (error) => {
        console.error('Design engine error:', error)
      },
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Track pending changes
  useEffect(() => {
    const interval = setInterval(() => {
      setPendingChanges(designEngine.getPendingCount())
    }, 100)
    return () => clearInterval(interval)
  }, [designEngine])

  // Handle style change from StylePanel
  const handleStyleChange = useCallback(
    (elementId: string, styles: Record<string, string>) => {
      // Instant preview
      updateStyle(elementId, styles)

      // Queue for AI processing
      designEngine.queueChange({
        type: 'style',
        elementId,
        file: 'src/App.jsx',
        change: styles,
      })
    },
    [updateStyle, designEngine]
  )

  // Apply pending changes to code
  const handleApplyToCode = useCallback(() => {
    designEngine.flush()
  }, [designEngine])

  // Update file tree when files change
  useEffect(() => {
    if (files.size > 0) {
      setFileTree(fileMapToTree(files))
    }
  }, [files])

  // Boot WebContainer on mount
  useEffect(() => {
    const initContainer = async () => {
      try {
        let initialFiles: FileMap

        // Check for saved project
        if (hasSavedProject()) {
          const savedData = loadSavedProject()
          if (savedData) {
            initialFiles = objectToFileMap(savedData.files)
            setMessages(savedData.messages)
            console.log('Restored project from localStorage')
          } else {
            initialFiles = createViteReactProject(undefined, true)
          }
        } else {
          initialFiles = createViteReactProject(undefined, true)
        }

        // Ensure editable runtime is always present
        initialFiles.set('public/editable-runtime.js', getEditableRuntimeFile())

        setFiles(initialFiles)
        await boot()
      } catch (error) {
        console.error('Failed to boot container:', error)
      }
    }

    initContainer()
  }, [boot, hasSavedProject, loadSavedProject, objectToFileMap])

  // Handle sending message to Claude
  const handleSendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8192,
          system: SYSTEM_PROMPT,
          messages: [
            ...messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content },
          ],
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error.message)
      }

      const text = data.content?.[0]?.text || ''

      // Parse artifact from response
      const artifact = parseArtifact(text)
      const messageText = extractMessage(text) || 'Generated code successfully!'

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: messageText,
        timestamp: Date.now(),
        artifact: artifact.files.size > 0 ? artifact : undefined,
      }

      setMessages((prev) => [...prev, assistantMessage])

      // If we got files, load them into WebContainer
      if (artifact.files.size > 0) {
        // Merge with existing project files
        const newFiles = new Map(files)

        // Keep base project files
        const baseProject = createViteReactProject(undefined, true)
        for (const [path, content] of baseProject) {
          if (!newFiles.has(path) && !artifact.files.has(path)) {
            newFiles.set(path, content)
          }
        }

        // Add/update files from artifact
        for (const [path, content] of artifact.files) {
          newFiles.set(path, content)
        }

        // Keep editable runtime
        newFiles.set('public/editable-runtime.js', getEditableRuntimeFile())

        setFiles(newFiles)
        await loadProject(newFiles)
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      const errorResponse: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${errorMessage}`,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, errorResponse])
    } finally {
      setIsLoading(false)
    }
  }, [messages, files, loadProject])

  // Handle file selection
  const handleFileSelect = useCallback((node: FileNode) => {
    if (node.type === 'file') {
      const content = files.get(node.path) || ''

      // Check if already open
      const existingFile = openFiles.find((f) => f.path === node.path)
      if (!existingFile) {
        setOpenFiles((prev) => [...prev, { path: node.path, content, isDirty: false }])
      }

      setActiveFilePath(node.path)
      setShowCodePanel(true)
    }
  }, [files, openFiles])

  // Handle file content change
  const handleContentChange = useCallback((path: string, content: string) => {
    setOpenFiles((prev) =>
      prev.map((f) =>
        f.path === path ? { ...f, content, isDirty: true } : f
      )
    )
  }, [])

  // Handle file save
  const handleSaveFile = useCallback(async (path: string, content: string) => {
    try {
      await updateFile(path, content)
      setFiles((prev) => {
        const newFiles = new Map(prev)
        newFiles.set(path, content)
        return newFiles
      })
      setOpenFiles((prev) =>
        prev.map((f) =>
          f.path === path ? { ...f, isDirty: false } : f
        )
      )
    } catch (error) {
      console.error('Failed to save file:', error)
    }
  }, [updateFile])

  // Handle file close
  const handleCloseFile = useCallback((path: string) => {
    setOpenFiles((prev) => prev.filter((f) => f.path !== path))
    if (activeFilePath === path) {
      const remaining = openFiles.filter((f) => f.path !== path)
      setActiveFilePath(remaining.length > 0 ? remaining[remaining.length - 1].path : null)
    }
  }, [activeFilePath, openFiles])

  // Handle copy code
  const handleCopyCode = useCallback(() => {
    const appCode = files.get('src/App.jsx') || files.get('src/App.tsx') || ''
    navigator.clipboard.writeText(appCode)
  }, [files])

  // Handle export
  const handleExport = useCallback(() => {
    // Create a zip file with all project files
    const content = Array.from(files.entries())
      .map(([path, code]) => `// ${path}\n${code}`)
      .join('\n\n// ---\n\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'thunder-project.txt'
    a.click()
    URL.revokeObjectURL(url)
  }, [files])

  // Handle manual save
  const handleSave = useCallback(() => {
    saveProject(files, messages)
  }, [files, messages, saveProject])

  // Toggle edit mode
  const handleToggleEditMode = useCallback(() => {
    if (isEditMode) {
      disableEditMode()
    } else {
      enableEditMode()
    }
  }, [isEditMode, enableEditMode, disableEditMode])

  return (
    <div className="h-screen w-screen bg-[#09090b] flex flex-col overflow-hidden font-sans text-white">
      {/* Header */}
      <Header
        viewport={viewport}
        onViewportChange={setViewport}
        isEditMode={isEditMode}
        onToggleEditMode={handleToggleEditMode}
        onCopyCode={handleCopyCode}
        onExport={handleExport}
        onRestart={restart}
        onSave={handleSave}
        status={status}
        lastSaved={formatLastSaved()}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        {showSidebar && (
          <aside className="w-80 min-w-80 border-r border-white/10 flex flex-col bg-[#0d0d0d]">
            {/* Sidebar tabs */}
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setSidebarTab('chat')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors ${
                  sidebarTab === 'chat'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Chat
              </button>
              <button
                onClick={() => setSidebarTab('files')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors ${
                  sidebarTab === 'files'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <FolderTree className="w-4 h-4" />
                Files
              </button>
              <button
                onClick={() => setSidebarTab('console')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors ${
                  sidebarTab === 'console'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Terminal className="w-4 h-4" />
                Console
              </button>
              <button
                onClick={() => setSidebarTab('styles')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm transition-colors ${
                  sidebarTab === 'styles'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Paintbrush className="w-4 h-4" />
                Styles
              </button>
            </div>

            {/* Sidebar content */}
            <div className="flex-1 overflow-hidden">
              {sidebarTab === 'chat' && (
                <ChatPanel
                  messages={messages}
                  isLoading={isLoading}
                  onSendMessage={handleSendMessage}
                />
              )}
              {sidebarTab === 'files' && (
                <FileExplorer
                  files={fileTree}
                  selectedPath={activeFilePath}
                  onFileSelect={handleFileSelect}
                />
              )}
              {sidebarTab === 'console' && (
                <ConsolePanel logs={logs} onClear={clearLogs} />
              )}
              {sidebarTab === 'styles' && (
                <StylePanel
                  element={selectedElement}
                  onStyleChange={handleStyleChange}
                  onApplyToCode={handleApplyToCode}
                  pendingChanges={pendingChanges}
                />
              )}
            </div>
          </aside>
        )}

        {/* Toggle sidebar button */}
        <button
          onClick={() => setShowSidebar(!showSidebar)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 bg-[#1a1a1a] border border-white/10 rounded-r-lg text-gray-400 hover:text-white transition-colors"
          style={{ left: showSidebar ? '320px' : '0' }}
        >
          {showSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </button>

        {/* Main area - Preview and Code */}
        <div className="flex-1 flex overflow-hidden">
          {/* Preview */}
          <div className={`${showCodePanel ? 'flex-1' : 'flex-1'} overflow-hidden relative`}>
            <Preview
              ref={iframeRef}
              url={previewUrl}
              isLoading={status !== 'ready'}
              status={status}
              viewport={viewport}
              selectionRect={selectionRect}
              hoverRect={hoverRect}
              isEditMode={isEditMode}
            />
          </div>

          {/* Code panel */}
          {showCodePanel && (
            <div className="w-[500px] min-w-[400px] border-l border-white/10 flex flex-col">
              {/* Code panel header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-[#0d0d0d]">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Code2 className="w-4 h-4" />
                  Code Editor
                </div>
                <button
                  onClick={() => setShowCodePanel(false)}
                  className="p-1 text-gray-500 hover:text-white transition-colors"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>

              {/* Code editor */}
              <div className="flex-1 overflow-hidden">
                <CodeEditor
                  files={openFiles}
                  activeFile={activeFilePath}
                  onSelectFile={setActiveFilePath}
                  onCloseFile={handleCloseFile}
                  onContentChange={handleContentChange}
                  onSave={handleSaveFile}
                />
              </div>
            </div>
          )}

          {/* Toggle code panel button when hidden */}
          {!showCodePanel && (
            <button
              onClick={() => setShowCodePanel(true)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1 bg-[#1a1a1a] border border-white/10 rounded-l-lg text-gray-400 hover:text-white transition-colors"
            >
              <Code2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Pending changes indicator */}
      {pendingChanges > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-blue-600 rounded-full text-sm text-white shadow-lg">
          {pendingChanges} pending change{pendingChanges > 1 ? 's' : ''} - Click "Apply to Code" to save
        </div>
      )}
    </div>
  )
}
