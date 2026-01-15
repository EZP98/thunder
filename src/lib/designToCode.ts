import type { DesignChange } from '../types'

export interface DesignToCodeEngineOptions {
  debounceMs?: number
  onSendToAI: (prompt: string) => Promise<void>
  onInstantPreview?: (elementId: string, styles: Record<string, string>) => void
  onError?: (error: Error) => void
}

export class DesignToCodeEngine {
  private pendingChanges: DesignChange[] = []
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private debounceMs: number
  private onSendToAI: (prompt: string) => Promise<void>
  private onInstantPreview?: (elementId: string, styles: Record<string, string>) => void
  private onError?: (error: Error) => void
  private isProcessing = false

  constructor(options: DesignToCodeEngineOptions) {
    this.debounceMs = options.debounceMs ?? 500
    this.onSendToAI = options.onSendToAI
    this.onInstantPreview = options.onInstantPreview
    this.onError = options.onError
  }

  // Queue a design change
  queueChange(change: Omit<DesignChange, 'timestamp'>): void {
    const fullChange: DesignChange = {
      ...change,
      timestamp: Date.now(),
    }

    this.pendingChanges.push(fullChange)

    // Apply instant preview for style changes
    if (change.type === 'style' && this.onInstantPreview) {
      this.onInstantPreview(
        change.elementId,
        change.change as Record<string, string>
      )
    }

    // Debounce processing
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = setTimeout(() => {
      this.processChanges()
    }, this.debounceMs)
  }

  // Process all pending changes
  private async processChanges(): Promise<void> {
    if (this.isProcessing || this.pendingChanges.length === 0) return

    this.isProcessing = true
    const changes = [...this.pendingChanges]
    this.pendingChanges = []

    try {
      // Group changes by file
      const changesByFile = this.groupChangesByFile(changes)

      // Build prompt
      const prompt = this.buildPrompt(changesByFile)

      // Send to AI
      await this.onSendToAI(prompt)
    } catch (error) {
      this.onError?.(error instanceof Error ? error : new Error(String(error)))
    } finally {
      this.isProcessing = false
    }
  }

  // Group changes by file
  private groupChangesByFile(
    changes: DesignChange[]
  ): Map<string, DesignChange[]> {
    const grouped = new Map<string, DesignChange[]>()

    for (const change of changes) {
      const existing = grouped.get(change.file) || []
      existing.push(change)
      grouped.set(change.file, existing)
    }

    return grouped
  }

  // Build AI prompt from changes
  private buildPrompt(changesByFile: Map<string, DesignChange[]>): string {
    const parts: string[] = [
      'Apply the following design changes to the code:',
      '',
    ]

    for (const [file, changes] of changesByFile) {
      parts.push(`## File: ${file}`)
      parts.push('')

      for (const change of changes) {
        const description = this.describeChange(change)
        parts.push(`- ${description}`)
      }

      parts.push('')
    }

    parts.push(
      'Return the updated code using the boltArtifact format. Only include files that changed.'
    )

    return parts.join('\n')
  }

  // Describe a single change in natural language
  private describeChange(change: DesignChange): string {
    const elementRef = change.component
      ? `${change.component} (${change.elementId})`
      : change.elementId

    switch (change.type) {
      case 'style': {
        const styles = Object.entries(change.change)
          .map(([prop, value]) => `${prop}: ${value}`)
          .join(', ')
        return `Change styles of "${elementRef}" to: ${styles}`
      }

      case 'content': {
        const content = change.change.text || change.change.content
        return `Change content of "${elementRef}" to: "${content}"`
      }

      case 'prop': {
        const props = Object.entries(change.change)
          .map(([prop, value]) => `${prop}="${value}"`)
          .join(', ')
        return `Update props of "${elementRef}": ${props}`
      }

      case 'add': {
        const elementType = change.change.type || 'element'
        return `Add new ${elementType} inside "${elementRef}"`
      }

      case 'delete': {
        return `Remove element "${elementRef}"`
      }

      case 'move': {
        const target = change.change.target
        const position = change.change.position || 'inside'
        return `Move "${elementRef}" ${position} "${target}"`
      }

      default:
        return `Update "${elementRef}": ${JSON.stringify(change.change)}`
    }
  }

  // Force process all pending changes immediately
  flush(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    this.processChanges()
  }

  // Clear all pending changes
  clear(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    this.pendingChanges = []
  }

  // Get pending changes count
  getPendingCount(): number {
    return this.pendingChanges.length
  }

  // Check if processing
  getIsProcessing(): boolean {
    return this.isProcessing
  }
}

// Singleton instance for global access
let engineInstance: DesignToCodeEngine | null = null

export function createDesignToCodeEngine(
  options: DesignToCodeEngineOptions
): DesignToCodeEngine {
  engineInstance = new DesignToCodeEngine(options)
  return engineInstance
}

export function getDesignToCodeEngine(): DesignToCodeEngine | null {
  return engineInstance
}
