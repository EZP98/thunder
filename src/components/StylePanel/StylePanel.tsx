import { useState, useEffect, useCallback } from 'react'
import type { ElementInfo } from '../../types'
import {
  Paintbrush,
  Type,
  Box,
  Layers,
  ChevronDown,
  ChevronRight,
  RotateCcw,
} from 'lucide-react'

interface StylePanelProps {
  element: ElementInfo | null
  onStyleChange: (elementId: string, styles: Record<string, string>) => void
  onApplyToCode: () => void
  pendingChanges: number
}

// Style sections configuration
const STYLE_SECTIONS = {
  layout: {
    label: 'Layout',
    icon: Box,
    properties: [
      { key: 'display', label: 'Display', type: 'select', options: ['block', 'flex', 'grid', 'inline', 'inline-block', 'none'] },
      { key: 'flexDirection', label: 'Direction', type: 'select', options: ['row', 'column', 'row-reverse', 'column-reverse'] },
      { key: 'justifyContent', label: 'Justify', type: 'select', options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'] },
      { key: 'alignItems', label: 'Align', type: 'select', options: ['flex-start', 'center', 'flex-end', 'stretch', 'baseline'] },
      { key: 'gap', label: 'Gap', type: 'text', unit: 'px' },
    ],
  },
  spacing: {
    label: 'Spacing',
    icon: Layers,
    properties: [
      { key: 'padding', label: 'Padding', type: 'text', unit: 'px' },
      { key: 'paddingTop', label: 'Pad Top', type: 'text', unit: 'px' },
      { key: 'paddingRight', label: 'Pad Right', type: 'text', unit: 'px' },
      { key: 'paddingBottom', label: 'Pad Bottom', type: 'text', unit: 'px' },
      { key: 'paddingLeft', label: 'Pad Left', type: 'text', unit: 'px' },
      { key: 'margin', label: 'Margin', type: 'text', unit: 'px' },
      { key: 'marginTop', label: 'Margin Top', type: 'text', unit: 'px' },
      { key: 'marginBottom', label: 'Margin Bottom', type: 'text', unit: 'px' },
    ],
  },
  size: {
    label: 'Size',
    icon: Box,
    properties: [
      { key: 'width', label: 'Width', type: 'text', unit: 'px' },
      { key: 'height', label: 'Height', type: 'text', unit: 'px' },
      { key: 'minWidth', label: 'Min W', type: 'text', unit: 'px' },
      { key: 'maxWidth', label: 'Max W', type: 'text', unit: 'px' },
      { key: 'minHeight', label: 'Min H', type: 'text', unit: 'px' },
      { key: 'maxHeight', label: 'Max H', type: 'text', unit: 'px' },
    ],
  },
  typography: {
    label: 'Typography',
    icon: Type,
    properties: [
      { key: 'fontSize', label: 'Size', type: 'text', unit: 'px' },
      { key: 'fontWeight', label: 'Weight', type: 'select', options: ['300', '400', '500', '600', '700', '800', '900'] },
      { key: 'lineHeight', label: 'Line H', type: 'text', unit: '' },
      { key: 'letterSpacing', label: 'Letter', type: 'text', unit: 'px' },
      { key: 'textAlign', label: 'Align', type: 'select', options: ['left', 'center', 'right', 'justify'] },
    ],
  },
  colors: {
    label: 'Colors',
    icon: Paintbrush,
    properties: [
      { key: 'color', label: 'Text', type: 'color' },
      { key: 'backgroundColor', label: 'Background', type: 'color' },
      { key: 'borderColor', label: 'Border', type: 'color' },
      { key: 'opacity', label: 'Opacity', type: 'range', min: 0, max: 1, step: 0.1 },
    ],
  },
  border: {
    label: 'Border',
    icon: Box,
    properties: [
      { key: 'borderWidth', label: 'Width', type: 'text', unit: 'px' },
      { key: 'borderStyle', label: 'Style', type: 'select', options: ['none', 'solid', 'dashed', 'dotted'] },
      { key: 'borderRadius', label: 'Radius', type: 'text', unit: 'px' },
    ],
  },
}

interface StyleInputProps {
  property: {
    key: string
    label: string
    type: string
    options?: string[]
    unit?: string
    min?: number
    max?: number
    step?: number
  }
  value: string
  onChange: (key: string, value: string) => void
}

function StyleInput({ property, value, onChange }: StyleInputProps) {
  const handleChange = (newValue: string) => {
    // Add unit if specified and value is numeric
    if (property.unit && newValue && !newValue.includes(property.unit) && /^\d+$/.test(newValue)) {
      onChange(property.key, `${newValue}${property.unit}`)
    } else {
      onChange(property.key, newValue)
    }
  }

  // Strip unit for display
  const displayValue = property.unit
    ? value.replace(property.unit, '')
    : value

  switch (property.type) {
    case 'select':
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(property.key, e.target.value)}
          className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">-</option>
          {property.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )

    case 'color':
      return (
        <div className="flex gap-2">
          <input
            type="color"
            value={value || '#000000'}
            onChange={(e) => onChange(property.key, e.target.value)}
            className="w-8 h-8 rounded cursor-pointer bg-transparent"
          />
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(property.key, e.target.value)}
            placeholder="#000000"
            className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )

    case 'range':
      return (
        <div className="flex items-center gap-2">
          <input
            type="range"
            value={parseFloat(value) || property.min || 0}
            min={property.min}
            max={property.max}
            step={property.step}
            onChange={(e) => onChange(property.key, e.target.value)}
            className="flex-1"
          />
          <span className="text-xs text-gray-400 w-8">{value || '0'}</span>
        </div>
      )

    default:
      return (
        <div className="flex items-center">
          <input
            type="text"
            value={displayValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="-"
            className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {property.unit && (
            <span className="ml-1 text-xs text-gray-500">{property.unit}</span>
          )}
        </div>
      )
  }
}

interface StyleSectionProps {
  section: typeof STYLE_SECTIONS[keyof typeof STYLE_SECTIONS]
  styles: Record<string, string>
  onChange: (key: string, value: string) => void
  defaultOpen?: boolean
}

function StyleSection({
  section,
  styles,
  onChange,
  defaultOpen = false,
}: StyleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const Icon = section.icon

  return (
    <div className="border-b border-white/5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        <Icon className="w-4 h-4" />
        <span>{section.label}</span>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-2">
          {section.properties.map((prop) => (
            <div key={prop.key} className="flex items-center gap-2">
              <label className="w-20 text-xs text-gray-500 truncate">
                {prop.label}
              </label>
              <div className="flex-1">
                <StyleInput
                  property={prop}
                  value={styles[prop.key] || ''}
                  onChange={onChange}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function StylePanel({
  element,
  onStyleChange,
  onApplyToCode,
  pendingChanges,
}: StylePanelProps) {
  const [localStyles, setLocalStyles] = useState<Record<string, string>>({})

  // Sync local styles when element changes
  useEffect(() => {
    if (element) {
      setLocalStyles({
        ...element.computedStyles,
        ...element.styles,
      })
    } else {
      setLocalStyles({})
    }
  }, [element])

  // Handle style change with instant preview
  const handleStyleChange = useCallback(
    (key: string, value: string) => {
      if (!element) return

      setLocalStyles((prev) => ({
        ...prev,
        [key]: value,
      }))

      // Send to iframe for instant preview
      onStyleChange(element.id, { [key]: value })
    },
    [element, onStyleChange]
  )

  // Reset to original styles
  const handleReset = useCallback(() => {
    if (element) {
      setLocalStyles({
        ...element.computedStyles,
        ...element.styles,
      })
    }
  }, [element])

  if (!element) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 text-sm p-4 text-center">
        <div>
          <Paintbrush className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Select an element to edit its styles</p>
          <p className="text-xs mt-1 text-gray-600">
            Enable Edit Mode and click on any element
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#0d0d0d]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/10">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span className="text-sm font-medium text-white truncate max-w-[150px]">
              {element.componentName || element.tagName}
            </span>
          </div>
          <button
            onClick={handleReset}
            className="p-1 text-gray-500 hover:text-white transition-colors"
            title="Reset styles"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
        <p className="text-xs text-gray-500 truncate">{element.id}</p>
      </div>

      {/* Pending changes banner */}
      {pendingChanges > 0 && (
        <div className="px-3 py-2 bg-blue-500/10 border-b border-blue-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-400">
              {pendingChanges} pending change{pendingChanges > 1 ? 's' : ''}
            </span>
            <button
              onClick={onApplyToCode}
              className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
            >
              Apply to Code
            </button>
          </div>
        </div>
      )}

      {/* Style sections */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(STYLE_SECTIONS).map(([key, section]) => (
          <StyleSection
            key={key}
            section={section}
            styles={localStyles}
            onChange={handleStyleChange}
            defaultOpen={key === 'spacing' || key === 'typography'}
          />
        ))}
      </div>

      {/* Tailwind classes display */}
      {element.className && (
        <div className="px-3 py-2 border-t border-white/10">
          <p className="text-xs text-gray-500 mb-1">Tailwind Classes</p>
          <div className="flex flex-wrap gap-1">
            {element.className.split(' ').filter(Boolean).slice(0, 8).map((cls, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 text-xs bg-white/5 rounded text-gray-400"
              >
                {cls}
              </span>
            ))}
            {element.className.split(' ').length > 8 && (
              <span className="text-xs text-gray-600">
                +{element.className.split(' ').length - 8} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
