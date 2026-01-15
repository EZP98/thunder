import type { ParsedArtifact, FileMap } from '../types'

// Regex patterns for different formats
const PATTERNS = {
  // Bolt format: <boltArtifact><boltAction type="file" filePath="...">content</boltAction></boltArtifact>
  boltArtifact: /<boltArtifact[^>]*title="([^"]*)"[^>]*>([\s\S]*?)<\/boltArtifact>/gi,
  boltAction: /<boltAction\s+type="(\w+)"(?:\s+filePath="([^"]+)")?[^>]*>([\s\S]*?)<\/boltAction>/gi,

  // Lovable format: <file path="...">content</file>
  lovableFile: /<file\s+path="([^"]+)"[^>]*>([\s\S]*?)<\/file>/gi,

  // Cursor format: ```language:filepath\ncontent```
  cursorBlock: /```(\w+):([^\n]+)\n([\s\S]*?)```/g,

  // Markdown with filepath hint: ```language\n// filepath: ...\ncontent```
  markdownWithPath: /```(\w+)\n(?:\/\/|#|<!--)\s*filepath:\s*([^\n]+)\n([\s\S]*?)```/gi,

  // Standard markdown code block
  markdownBlock: /```(\w+)\n([\s\S]*?)```/g,
}

// File extension mapping
const EXTENSION_MAP: Record<string, string> = {
  typescript: 'ts',
  javascript: 'js',
  typescriptreact: 'tsx',
  javascriptreact: 'jsx',
  tsx: 'tsx',
  jsx: 'jsx',
  ts: 'ts',
  js: 'js',
  css: 'css',
  html: 'html',
  json: 'json',
  md: 'md',
}

// Infer file path from code content
function inferFilePath(code: string, language: string): string {
  // Check for common patterns
  if (code.includes('export default function App')) {
    return 'src/App.tsx'
  }
  if (code.includes('createRoot') || code.includes('ReactDOM.render')) {
    return 'src/main.tsx'
  }
  if (code.includes('@tailwind') || code.includes(':root')) {
    return 'src/index.css'
  }
  if (code.includes('"dependencies"') && code.includes('"name"')) {
    return 'package.json'
  }
  if (code.includes('<!DOCTYPE html>') || code.includes('<html')) {
    return 'index.html'
  }
  if (code.includes('defineConfig') && code.includes('vite')) {
    return 'vite.config.ts'
  }

  // Generate a name based on exports
  const exportMatch = code.match(/export\s+(?:default\s+)?(?:function|const|class)\s+(\w+)/)
  if (exportMatch) {
    const name = exportMatch[1]
    const ext = EXTENSION_MAP[language] || 'tsx'
    return `src/components/${name}.${ext}`
  }

  // Fallback
  const ext = EXTENSION_MAP[language] || 'txt'
  return `src/generated.${ext}`
}

// Parse Bolt format
function parseBoltFormat(text: string): ParsedArtifact | null {
  const files: FileMap = new Map()
  const commands: string[] = []
  let title: string | undefined

  // Reset regex lastIndex
  PATTERNS.boltArtifact.lastIndex = 0

  const artifactMatch = PATTERNS.boltArtifact.exec(text)
  if (!artifactMatch) return null

  title = artifactMatch[1]
  const artifactContent = artifactMatch[2]

  // Parse actions
  PATTERNS.boltAction.lastIndex = 0
  let actionMatch

  while ((actionMatch = PATTERNS.boltAction.exec(artifactContent)) !== null) {
    const [, actionType, filePath, content] = actionMatch

    if (actionType === 'file' && filePath) {
      files.set(filePath, content.trim())
    } else if (actionType === 'shell') {
      commands.push(content.trim())
    }
  }

  if (files.size === 0 && commands.length === 0) return null

  return { files, commands, metadata: { title } }
}

// Parse Lovable format
function parseLovableFormat(text: string): ParsedArtifact | null {
  const files: FileMap = new Map()

  PATTERNS.lovableFile.lastIndex = 0
  let match

  while ((match = PATTERNS.lovableFile.exec(text)) !== null) {
    const [, filePath, content] = match
    files.set(filePath, content.trim())
  }

  if (files.size === 0) return null

  return { files, commands: [] }
}

// Parse Cursor format
function parseCursorFormat(text: string): ParsedArtifact | null {
  const files: FileMap = new Map()

  PATTERNS.cursorBlock.lastIndex = 0
  let match

  while ((match = PATTERNS.cursorBlock.exec(text)) !== null) {
    const [, , filePath, content] = match
    if (filePath) {
      files.set(filePath.trim(), content.trim())
    }
  }

  if (files.size === 0) return null

  return { files, commands: [] }
}

// Parse Markdown with filepath hint
function parseMarkdownWithPath(text: string): ParsedArtifact | null {
  const files: FileMap = new Map()

  PATTERNS.markdownWithPath.lastIndex = 0
  let match

  while ((match = PATTERNS.markdownWithPath.exec(text)) !== null) {
    const [, , filePath, content] = match
    if (filePath) {
      files.set(filePath.trim(), content.trim())
    }
  }

  if (files.size === 0) return null

  return { files, commands: [] }
}

// Parse standard markdown and infer paths
function parseMarkdownBlocks(text: string): ParsedArtifact | null {
  const files: FileMap = new Map()

  PATTERNS.markdownBlock.lastIndex = 0
  let match

  while ((match = PATTERNS.markdownBlock.exec(text)) !== null) {
    const [, language, content] = match

    // Skip non-code blocks
    if (['text', 'bash', 'shell', 'sh', 'console'].includes(language)) {
      continue
    }

    const filePath = inferFilePath(content, language)
    files.set(filePath, content.trim())
  }

  if (files.size === 0) return null

  return { files, commands: [] }
}

// Main parser: tries all formats in order of specificity
export function parseArtifact(text: string): ParsedArtifact {
  // Try Bolt format first (most specific)
  const boltResult = parseBoltFormat(text)
  if (boltResult && boltResult.files.size > 0) {
    return boltResult
  }

  // Try Lovable format
  const lovableResult = parseLovableFormat(text)
  if (lovableResult && lovableResult.files.size > 0) {
    return lovableResult
  }

  // Try Cursor format
  const cursorResult = parseCursorFormat(text)
  if (cursorResult && cursorResult.files.size > 0) {
    return cursorResult
  }

  // Try Markdown with filepath
  const mdPathResult = parseMarkdownWithPath(text)
  if (mdPathResult && mdPathResult.files.size > 0) {
    return mdPathResult
  }

  // Try standard markdown blocks
  const mdResult = parseMarkdownBlocks(text)
  if (mdResult && mdResult.files.size > 0) {
    return mdResult
  }

  // Return empty result
  return { files: new Map(), commands: [] }
}

// Parse streaming content (for real-time updates)
export function parseStreamingArtifact(text: string): Partial<ParsedArtifact> {
  const files: FileMap = new Map()
  const commands: string[] = []

  // Try to extract any complete actions we can find
  PATTERNS.boltAction.lastIndex = 0
  let match

  while ((match = PATTERNS.boltAction.exec(text)) !== null) {
    const [, actionType, filePath, content] = match

    if (actionType === 'file' && filePath) {
      files.set(filePath, content.trim())
    } else if (actionType === 'shell') {
      commands.push(content.trim())
    }
  }

  return { files, commands }
}

// Convert FileMap to FileNode tree for UI
export function fileMapToTree(files: FileMap): import('../types').FileNode[] {
  const root: Map<string, import('../types').FileNode> = new Map()

  for (const [path] of files) {
    const parts = path.split('/')
    let currentLevel = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isFile = i === parts.length - 1
      const currentPath = parts.slice(0, i + 1).join('/')

      if (!currentLevel.has(part)) {
        const node: import('../types').FileNode = {
          name: part,
          type: isFile ? 'file' : 'folder',
          path: currentPath,
          content: isFile ? files.get(path) : undefined,
          children: isFile ? undefined : [],
        }
        currentLevel.set(part, node)
      }

      if (!isFile) {
        const folder = currentLevel.get(part)!
        if (!folder.children) {
          folder.children = []
        }
        // Create a map for next level
        const nextLevel = new Map<string, import('../types').FileNode>()
        for (const child of folder.children) {
          nextLevel.set(child.name, child)
        }
        currentLevel = nextLevel

        // Update children array
        folder.children = Array.from(nextLevel.values())
      }
    }
  }

  return Array.from(root.values())
}

// Extract text message from response (non-artifact content)
export function extractMessage(text: string): string {
  // Remove artifact blocks
  let message = text
    .replace(PATTERNS.boltArtifact, '')
    .replace(PATTERNS.lovableFile, '')
    .replace(PATTERNS.cursorBlock, '')
    .replace(PATTERNS.markdownBlock, '')
    .trim()

  // Clean up extra whitespace
  message = message.replace(/\n{3,}/g, '\n\n')

  return message
}
