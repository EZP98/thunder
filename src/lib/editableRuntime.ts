// Editable Runtime - Injected into preview iframe
// This is exported as a string to be injected into the WebContainer

export const EDITABLE_RUNTIME_SCRIPT = `
(function() {
  'use strict';

  // State
  let editMode = false;
  let selectedElement = null;
  let hoveredElement = null;
  let selectionOverlay = null;
  let hoverOverlay = null;

  // Create overlay element
  function createOverlay(type) {
    const overlay = document.createElement('div');
    overlay.style.cssText = \`
      position: fixed;
      pointer-events: none;
      z-index: 999999;
      transition: all 0.1s ease;
    \`;

    if (type === 'selection') {
      overlay.style.border = '2px solid #3b82f6';
      overlay.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      overlay.id = 'thunder-selection-overlay';
    } else {
      overlay.style.border = '1px solid rgba(59, 130, 246, 0.5)';
      overlay.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
      overlay.id = 'thunder-hover-overlay';
    }

    document.body.appendChild(overlay);
    return overlay;
  }

  // Get element ID (priority: data-thunder-id > data-id > generated path)
  function getElementId(el) {
    if (el.dataset && el.dataset.thunderId) {
      return el.dataset.thunderId;
    }
    if (el.dataset && el.dataset.id) {
      return el.dataset.id;
    }
    return getElementPath(el);
  }

  // Generate path-based ID
  function getElementPath(el) {
    const parts = [];
    let current = el;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector = '#' + current.id;
        parts.unshift(selector);
        break;
      }

      if (current.className && typeof current.className === 'string') {
        const classes = current.className.trim().split(/\\s+/).slice(0, 2).join('.');
        if (classes) {
          selector += '.' + classes;
        }
      }

      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += ':nth-of-type(' + index + ')';
        }
      }

      parts.unshift(selector);
      current = current.parentElement;
    }

    return parts.join(' > ');
  }

  // Get computed styles for element
  function getElementStyles(el) {
    const computed = window.getComputedStyle(el);
    const inline = {};

    // Get inline styles
    for (let i = 0; i < el.style.length; i++) {
      const prop = el.style[i];
      inline[prop] = el.style.getPropertyValue(prop);
    }

    // Get key computed styles
    const keyProps = [
      'display', 'position', 'width', 'height', 'padding', 'margin',
      'background', 'backgroundColor', 'color', 'fontSize', 'fontWeight',
      'fontFamily', 'lineHeight', 'textAlign', 'border', 'borderRadius',
      'boxShadow', 'opacity', 'transform', 'flexDirection', 'justifyContent',
      'alignItems', 'gap', 'gridTemplateColumns'
    ];

    const computedStyles = {};
    keyProps.forEach(prop => {
      computedStyles[prop] = computed.getPropertyValue(prop);
    });

    return { inline, computed: computedStyles };
  }

  // Get element info
  function getElementInfo(el) {
    const rect = el.getBoundingClientRect();
    const styles = getElementStyles(el);

    // Try to get component name from React internals
    let componentName = null;
    const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber'));
    if (fiberKey) {
      const fiber = el[fiberKey];
      if (fiber && fiber.type) {
        componentName = typeof fiber.type === 'function'
          ? fiber.type.name || fiber.type.displayName
          : fiber.type;
      }
    }

    return {
      id: getElementId(el),
      tagName: el.tagName.toLowerCase(),
      className: el.className || '',
      textContent: el.textContent?.slice(0, 100) || '',
      componentName,
      styles: styles.inline,
      computedStyles: styles.computed,
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right
      }
    };
  }

  // Update overlay position
  function updateOverlay(overlay, rect) {
    if (!overlay || !rect) return;

    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    overlay.style.display = 'block';
  }

  // Hide overlay
  function hideOverlay(overlay) {
    if (overlay) {
      overlay.style.display = 'none';
    }
  }

  // Send message to parent
  function sendToParent(type, payload) {
    window.parent.postMessage({ type, payload }, '*');
  }

  // Handle click
  function handleClick(e) {
    if (!editMode) return;

    e.preventDefault();
    e.stopPropagation();

    const el = e.target;
    if (el === document.body || el === document.documentElement) return;

    selectedElement = el;
    const info = getElementInfo(el);

    updateOverlay(selectionOverlay, info.rect);
    sendToParent('thunder:element-selected', info);
  }

  // Handle mousemove
  function handleMouseMove(e) {
    if (!editMode) return;

    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === document.body || el === document.documentElement) {
      hideOverlay(hoverOverlay);
      hoveredElement = null;
      return;
    }

    if (el === hoveredElement) return;
    if (el === selectedElement) {
      hideOverlay(hoverOverlay);
      return;
    }

    hoveredElement = el;
    const rect = el.getBoundingClientRect();
    updateOverlay(hoverOverlay, rect);

    sendToParent('thunder:element-hover', {
      id: getElementId(el),
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      }
    });
  }

  // Handle scroll - update overlay positions
  function handleScroll() {
    if (selectedElement) {
      const rect = selectedElement.getBoundingClientRect();
      updateOverlay(selectionOverlay, rect);
    }
  }

  // Handle messages from parent
  function handleMessage(e) {
    const { type, payload } = e.data || {};

    switch (type) {
      case 'thunder:enable-edit-mode':
        editMode = true;
        if (!selectionOverlay) selectionOverlay = createOverlay('selection');
        if (!hoverOverlay) hoverOverlay = createOverlay('hover');
        document.body.style.cursor = 'crosshair';
        break;

      case 'thunder:disable-edit-mode':
        editMode = false;
        hideOverlay(selectionOverlay);
        hideOverlay(hoverOverlay);
        selectedElement = null;
        hoveredElement = null;
        document.body.style.cursor = '';
        break;

      case 'thunder:select-element':
        if (payload && payload.id) {
          const el = document.querySelector('[data-thunder-id="' + payload.id + '"]') ||
                    document.querySelector('[data-id="' + payload.id + '"]');
          if (el) {
            selectedElement = el;
            const info = getElementInfo(el);
            updateOverlay(selectionOverlay, info.rect);
          }
        }
        break;

      case 'thunder:highlight-element':
        if (payload && payload.id) {
          const el = document.querySelector('[data-thunder-id="' + payload.id + '"]') ||
                    document.querySelector('[data-id="' + payload.id + '"]');
          if (el) {
            const rect = el.getBoundingClientRect();
            updateOverlay(hoverOverlay, rect);
          }
        }
        break;

      case 'thunder:update-style':
        if (payload && payload.id && payload.styles) {
          const el = document.querySelector('[data-thunder-id="' + payload.id + '"]') ||
                    document.querySelector('[data-id="' + payload.id + '"]');
          if (el) {
            Object.assign(el.style, payload.styles);
            // Update selection overlay if this is selected element
            if (el === selectedElement) {
              const rect = el.getBoundingClientRect();
              updateOverlay(selectionOverlay, rect);
            }
          }
        }
        break;

      case 'thunder:ping':
        sendToParent('thunder:pong', { version: '1.0.0' });
        break;
    }
  }

  // Initialize
  function init() {
    // Event listeners
    document.addEventListener('click', handleClick, true);
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('scroll', handleScroll, true);
    window.addEventListener('message', handleMessage);
    window.addEventListener('resize', handleScroll);

    // Notify parent we're ready
    sendToParent('thunder:ready', { version: '1.0.0' });
  }

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`

// Get the runtime script as a file content
export function getEditableRuntimeFile(): string {
  return EDITABLE_RUNTIME_SCRIPT
}
