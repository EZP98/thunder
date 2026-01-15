import { WebContainer } from '@webcontainer/api'
import type { FileMap, ContainerLog } from '../types'

// Singleton instance
let webcontainerInstance: WebContainer | null = null
let bootPromise: Promise<WebContainer> | null = null

// Event names
export const CONTAINER_EVENTS = {
  SERVER_READY: 'thunder:server-ready',
  ERROR: 'thunder:error',
  LOG: 'thunder:log',
  STATUS_CHANGE: 'thunder:status-change',
} as const

// Get or boot WebContainer singleton
export async function getWebContainer(): Promise<WebContainer> {
  if (webcontainerInstance) {
    return webcontainerInstance
  }

  if (bootPromise) {
    return bootPromise
  }

  bootPromise = WebContainer.boot({
    coep: 'credentialless',
  })

  try {
    webcontainerInstance = await bootPromise
    emitLog('info', 'WebContainer booted successfully')
    return webcontainerInstance
  } catch (error) {
    bootPromise = null
    emitLog('error', `Failed to boot WebContainer: ${error}`)
    throw error
  }
}

// Emit custom event for logs
function emitLog(type: ContainerLog['type'], message: string) {
  window.dispatchEvent(
    new CustomEvent(CONTAINER_EVENTS.LOG, {
      detail: {
        id: crypto.randomUUID(),
        type,
        message,
        timestamp: Date.now(),
      } satisfies ContainerLog,
    })
  )
}

// Emit status change event
function emitStatus(status: string) {
  window.dispatchEvent(
    new CustomEvent(CONTAINER_EVENTS.STATUS_CHANGE, {
      detail: { status },
    })
  )
}

// Write files to WebContainer
export async function writeFiles(files: FileMap): Promise<void> {
  const container = await getWebContainer()

  for (const [path, content] of files) {
    // Create directory structure if needed
    const parts = path.split('/')
    if (parts.length > 1) {
      const dirPath = parts.slice(0, -1).join('/')
      try {
        await container.fs.mkdir(dirPath, { recursive: true })
      } catch {
        // Directory might already exist
      }
    }

    // Write file
    await container.fs.writeFile(path, content)
    emitLog('info', `Wrote file: ${path}`)
  }
}

// Install dependencies
export async function installDependencies(): Promise<void> {
  const container = await getWebContainer()
  emitStatus('installing')
  emitLog('command', 'npm install')

  const installProcess = await container.spawn('npm', ['install'])

  // Stream output
  const writer = new WritableStream({
    write(data) {
      emitLog('info', data)
    },
  })

  installProcess.output.pipeTo(writer)

  const exitCode = await installProcess.exit

  if (exitCode !== 0) {
    emitLog('error', `npm install failed with exit code ${exitCode}`)
    throw new Error(`npm install failed with exit code ${exitCode}`)
  }

  emitLog('success', 'Dependencies installed successfully')
}

// Start dev server
export async function startDevServer(
  onReady: (url: string) => void
): Promise<void> {
  const container = await getWebContainer()
  emitStatus('starting')
  emitLog('command', 'npm run dev')

  const devProcess = await container.spawn('npm', ['run', 'dev'])

  // Stream output
  devProcess.output.pipeTo(
    new WritableStream({
      write(data) {
        emitLog('info', data)
      },
    })
  )

  // Listen for server ready
  container.on('server-ready', (port, url) => {
    emitLog('success', `Dev server ready at ${url}`)
    emitStatus('ready')
    window.dispatchEvent(
      new CustomEvent(CONTAINER_EVENTS.SERVER_READY, {
        detail: { port, url },
      })
    )
    onReady(url)
  })

  container.on('error', (error) => {
    emitLog('error', `Container error: ${error.message}`)
    window.dispatchEvent(
      new CustomEvent(CONTAINER_EVENTS.ERROR, {
        detail: { error },
      })
    )
  })
}

// Create base Vite + React project structure
export function createViteReactProject(
  appCode?: string,
  includeEditableRuntime = false
): FileMap {
  const files = new Map<string, string>()

  // package.json
  files.set(
    'package.json',
    JSON.stringify(
      {
        name: 'thunder-preview',
        private: true,
        version: '0.0.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview',
        },
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
        },
        devDependencies: {
          '@vitejs/plugin-react': '^4.2.1',
          vite: '^5.0.0',
        },
      },
      null,
      2
    )
  )

  // vite.config.js
  files.set(
    'vite.config.js',
    `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
})`
  )

  // index.html
  const runtimeScript = includeEditableRuntime
    ? '<script src="/editable-runtime.js"></script>'
    : ''

  files.set(
    'index.html',
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Thunder Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    ${runtimeScript}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`
  )

  // src/main.jsx
  files.set(
    'src/main.jsx',
    `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`
  )

  // src/App.jsx
  const defaultApp = `export default function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4" data-thunder-id="title">
          Thunder Preview
        </h1>
        <p className="text-gray-400" data-thunder-id="subtitle">
          Start building your app with AI
        </p>
      </div>
    </div>
  )
}`

  files.set('src/App.jsx', appCode || defaultApp)

  return files
}

// Hot reload: write single file and let Vite HMR handle it
export async function hotReloadFile(
  path: string,
  content: string
): Promise<void> {
  const container = await getWebContainer()
  await container.fs.writeFile(path, content)
  emitLog('info', `Hot reloaded: ${path}`)
}

// Teardown WebContainer
export async function teardown(): Promise<void> {
  if (webcontainerInstance) {
    await webcontainerInstance.teardown()
    webcontainerInstance = null
    bootPromise = null
    emitLog('info', 'WebContainer torn down')
  }
}
